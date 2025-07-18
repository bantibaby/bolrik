const express = require("express");
const router = express.Router();
const { auth, adminMiddleware } = require("../middleware/auth");
const User = require("../models/user");
const PreResult = require("../models/preResult");

// ✅ **Admin Dashboard**
// ✅ **Admin Dashboard (Only Admins can access)**
router.get("/dashboard", auth, adminMiddleware, async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const skip = (page - 1) * limit;

        // 📌 Filter Users
        const userFilter = {
            role: req.query.role || { $exists: true },
            referredBy: req.query.referredBy || { $exists: true },
            mobile: req.query.mobile ? { $regex: req.query.mobile, $options: "i" } : { $exists: true }
        };
        // Count total users for pagination
        const totalUsers = await User.countDocuments(userFilter);
        const totalPages = Math.ceil(totalUsers / limit);
        // Populate referredUsers for name/number, registration date ke hisaab se sort karo (descending)
        let users = await User.find(userFilter)
            .select("-password")
            .populate({ path: "referredUsers", select: "fullname mobile" })
            .sort({ "welcomeBonus.registrationDate": -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // User name filter
        if (req.query.user) {
            users = users.filter(u => u.fullname && u.fullname.toLowerCase().includes(req.query.user.toLowerCase()));
        }
        // Date filter (registration date)
        if (req.query.dateFrom) {
            users = users.filter(u => {
                const regDate = u.welcomeBonus && u.welcomeBonus.registrationDate ? u.welcomeBonus.registrationDate : u.createdAt || u._id.getTimestamp();
                return new Date(regDate) >= new Date(req.query.dateFrom);
            });
        }
        if (req.query.dateTo) {
            users = users.filter(u => {
                const regDate = u.welcomeBonus && u.welcomeBonus.registrationDate ? u.welcomeBonus.registrationDate : u.createdAt || u._id.getTimestamp();
                return new Date(regDate) <= new Date(req.query.dateTo);
            });
        }

        // हर user के लिए structured data तैयार करें
        const now = new Date();
        const userTableData = users.map(user => {
            // Registration date & time
            const regDate = user.welcomeBonus && user.welcomeBonus.registrationDate ? user.welcomeBonus.registrationDate : user.createdAt || user._id.getTimestamp();
            // New user badge (24 घंटे के अंदर)
            const isNewUser = ((now - new Date(regDate)) < 24 * 60 * 60 * 1000);
            // Welcome bonus
            const welcomeBonus = user.welcomeBonus && user.welcomeBonus.amount ? user.welcomeBonus.amount : 0;
            // Pending balance
            const pendingBalance = user.balance && user.balance[0] ? user.balance[0].pending : 0;
            // Deposits
            const deposits = (user.banking && user.banking.deposits) ? user.banking.deposits : [];
            // Withdrawals
            const withdrawals = (user.banking && user.banking.withdrawals) ? user.banking.withdrawals : [];
            // Payment method (bank/upi)
            const paymentMethod = {
                bankName: user.banking && user.banking.bankName,
                accountNumber: user.banking && user.banking.accountNumber,
                ifsc: user.banking && user.banking.ifsc,
                upiId: user.banking && user.banking.upiId
            };
            // Referred by (naam/number)
            const referredBy = user.referredBy || "-";
            // Referred users (list + count)
            const referredUsers = user.referredUsers || [];
            // Betting history count
            const betHistoryCount = user.history ? user.history.length : 0;
            return {
                _id: user._id,
                regDate,
                fullname: user.fullname,
                mobile: user.mobile,
                role: user.role,
                paymentMethod,
                welcomeBonus,
                pendingBalance,
                deposits,
                depositsCount: deposits.length,
                withdrawals,
                withdrawalsCount: withdrawals.length,
                referredBy,
                referredUsers,
                referredUsersCount: referredUsers.length,
                isNewUser,
                adminNotified: user.adminNotified,
                betHistoryCount
            };
        });

        // Notification list: sirf naye users (24 ghante ke andar) aur adminNotified false
        const notificationUsers = userTableData.filter(u => u.isNewUser && !u.adminNotified);

        // 📌 Filter PreResults
        const preResults = await PreResult.find({
            gameId: req.query.gameId || { $exists: true },
            resultNumber: req.query.resultNumber || { $exists: true },
            timeframe: req.query.timeframe || { $exists: true }
        }).sort({ createdAt: -1 });
       
        res.render("admin", { userTableData, preResults, notificationUsers, currentPage: page, totalPages });
    } catch (error) {
        console.error("❌ Error in admin dashboard:", error);
        res.status(500).json({ message: "Server error!" });
    }
});

// ✅ **Approve Deposit Request**
router.get("/approve-deposit/:id", auth, adminMiddleware, async (req, res) => {
    try {
        // ✅ Find User by Deposit ID
        const user = await User.findOne({ "banking.deposits._id": req.params.id });

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // ✅ Find the Deposit Entry
        let deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);

        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found!" });
        }

        // ✅ Check if Already Approved
        if (deposit.status === "Approved") {
            return res.status(400).json({ message: "Deposit already approved!" });
        }

        // ✅ Total Amount to Add = Deposit Amount + Bonus
        const totalAmount = deposit.amount + deposit.bonus;

        console.log(`🔧 Approving deposit: ID=${req.params.id}, User=${user.fullname}, Amount=${deposit.amount}, Bonus=${deposit.bonus}, Total=${totalAmount}`);

        // ✅ Update User Balance & Deposit Status
        const updateResult = await User.updateOne(
            { "banking.deposits._id": req.params.id, "banking.deposits.status": "Pending" }, // Only update if still pending!
            {
                $set: { "banking.deposits.$.status": "Approved" },
                $inc: { "balance.0.pending": totalAmount, "balance.0.bonus": deposit.bonus }
            }
        );

        // Always fetch fresh user after update
        const updatedUser = await User.findOne({ "banking.deposits._id": req.params.id });
        const updatedDeposit = updatedUser.banking.deposits.find(dep => dep._id.toString() === req.params.id);

        // If already approved, do not process bonuses again
        if (updatedDeposit.status !== "Approved") {
            return res.status(400).json({ message: "Deposit not approved. Try again." });
        }

        // ✅ Referral Bonus Logic
        if (updatedDeposit.referralBonusPending && updatedDeposit.referralBonusPending.amount && updatedDeposit.referralBonusPending.referrerId) {
            // Find referrer
            const referrer = await User.findById(updatedDeposit.referralBonusPending.referrerId);
            if (referrer) {
                referrer.balance[0].bonus += updatedDeposit.referralBonusPending.amount;
                referrer.balance[0].pending += updatedDeposit.referralBonusPending.amount;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + updatedDeposit.referralBonusPending.amount;
                await referrer.save();
                console.log(`✅ Referral Bonus of ₹${updatedDeposit.referralBonusPending.amount} credited to ${referrer.fullname}`);
            }
            // Remove referralBonusPending from deposit
            updatedDeposit.referralBonusPending = undefined;
            updatedUser.markModified('banking.deposits');
            await updatedUser.save();
        }

        // ✅ Referral Welcome Bonus Logic
        // Check if this is the user's first deposit and if they were referred
        if (updatedUser.referredBy && updatedUser.banking.deposits.length === 1) {
            const referrer = await User.findOne({ referralCode: updatedUser.referredBy });
            if (referrer && Array.isArray(referrer.referralWelcomeBonuses)) {
                const pendingBonus = referrer.referralWelcomeBonuses.find(b => b.referredUserId.toString() === updatedUser._id.toString() && !b.isClaimed);
                if (pendingBonus) {
                    referrer.balance[0].pending += pendingBonus.amount;
                    pendingBonus.isClaimed = true;
                    pendingBonus.depositApproved = true;
                    await referrer.save();
                    console.log(`✅ Referral Welcome Bonus of ₹${pendingBonus.amount} credited to ${referrer.fullname} after ${updatedUser.fullname}'s first deposit approval.`);
                }
            }
        }

        console.log(`✅ Deposit Approved & Balance Updated (₹${updatedDeposit.amount} + Bonus ₹${updatedDeposit.bonus}) for User: ${updatedUser.fullname}`);
        res.redirect("/admin/dashboard");

    } catch (error) {
        console.error("❌ Error Approving Deposit:", error);
        res.status(500).json({ message: "Server error!" });
    }
});

// ✅ **Reject Deposit Request**
router.get("/reject-deposit/:id", auth, adminMiddleware, async (req, res) => {
    await User.updateOne({ "banking.deposits._id": req.params.id }, { $set: { "banking.deposits.$.status": "Rejected" } });
    res.redirect("/admin/dashboard");
});

// ✅ **Approve Withdrawal Request**
router.get("/approve-withdraw/:id", auth, adminMiddleware, async (req, res) => {
    await User.updateOne({ "banking.withdrawals._id": req.params.id }, { $set: { "banking.withdrawals.$.status": "Approved" } });
    res.redirect("/admin/dashboard");
});

// ✅ **Reject Withdrawal Request**
router.get("/reject-withdraw/:id", auth, adminMiddleware, async (req, res) => {
    try {
        // Find the user and the withdrawal
        const user = await User.findOne({ "banking.withdrawals._id": req.params.id });
        if (!user) return res.redirect("/admin/dashboard");
        const withdrawal = user.banking.withdrawals.find(w => w._id.toString() === req.params.id);
        if (!withdrawal) return res.redirect("/admin/dashboard");
        // If not already rejected, add amount back to balance
        if (withdrawal.status !== "Rejected") {
            user.balance[0].pending += withdrawal.amount;
            withdrawal.status = "Rejected";
            await user.save();
        }
        res.redirect("/admin/dashboard");
    } catch (error) {
        console.error("Error rejecting withdrawal:", error);
    res.redirect("/admin/dashboard");
    }
});

// Mark withdrawal as Paid
router.get('/mark-withdraw-paid/:id', auth, adminMiddleware, async (req, res) => {
    await User.updateOne({ "banking.withdrawals._id": req.params.id }, { $set: { "banking.withdrawals.$.status": "Paid" } });
    res.redirect("/admin/dashboard");
});

// ✅ **Fix All Mobile Numbers in Database**
router.get("/fix-mobile-numbers", auth, adminMiddleware, async (req, res) => {
    const { fixMobileNumbers } = require('../controllers/routecont');
    await fixMobileNumbers(req, res);
});

// ✅ **Fix Existing Referral Welcome Bonuses**
router.get("/fix-referral-bonuses", auth, adminMiddleware, async (req, res) => {
    const { fixExistingReferralBonuses } = require('../controllers/routecont');
    await fixExistingReferralBonuses(req, res);
});

// ✅ **Manual Fix Deposit Status**
router.get("/fix-deposit-status/:id", auth, adminMiddleware, async (req, res) => {
    try {
        console.log(`🔧 Manually fixing deposit status for ID: ${req.params.id}`);
        
        const result = await User.updateOne(
            { "banking.deposits._id": req.params.id },
            { $set: { "banking.deposits.$.status": "Approved" } }
        );
        
        console.log(`📊 Manual fix result:`, result);
        
        // Verify
        const user = await User.findOne({ "banking.deposits._id": req.params.id });
        const deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);
        
        return res.status(200).json({
            success: true,
            message: `Deposit status manually fixed to: ${deposit.status}`,
            depositStatus: deposit.status,
            result: result
        });
        
    } catch (error) {
        console.error("❌ Error in manual fix:", error);
        return res.status(500).json({
            success: false,
            message: "Error fixing deposit status"
        });
    }
});

// Mark as Read API
router.post("/mark-user-notified/:id", auth, adminMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { adminNotified: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Notification Clear API (midnight clear)
router.post("/clear-notifications", auth, adminMiddleware, async (req, res) => {
    try {
        await User.updateMany({}, { adminNotified: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User Betting History API
router.get('/user-betting-history/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('history');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        // Latest 50 bets, reverse order
        const history = (user.history || []).slice(-50).reverse().map(h => ({
            _id: h._id,
            betAmount: h.betAmount,
            winAmount: h.winAmount,
            lossAmount: h.lossAmount,
            multiplier: h.multiplier
        }));
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User Deposits API
router.get('/user-deposits/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('banking.deposits');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const deposits = (user.banking && user.banking.deposits) ? user.banking.deposits.slice(-50).reverse().map(dep => ({
            _id: dep._id,
            amount: dep.amount,
            status: dep.status,
            bonus: dep.bonus,
            transactionId: dep.transactionId,
            date: dep.date
        })) : [];
        res.json({ success: true, deposits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// User Withdrawals API
router.get('/user-withdrawals/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('banking.withdrawals');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const withdrawals = (user.banking && user.banking.withdrawals) ? user.banking.withdrawals.slice(-50).reverse().map(wd => ({
            _id: wd._id,
            amount: wd.amount,
            status: wd.status,
            date: wd.date
        })) : [];
        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// User Referred Users API
router.get('/user-referred-users/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate({ path: 'referredUsers', select: 'fullname mobile welcomeBonus.registrationDate welcomeBonus.amount createdAt banking.deposits' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const referredUsers = (user.referredUsers || []).map(u => {
            // First deposit (agar hai)
            let depositAmount = 0, depositStatus = '-', bonus = 0;
            if (u.banking && u.banking.deposits && u.banking.deposits.length > 0) {
                // First deposit pakdo (date ke hisaab se)
                const sortedDeposits = [...u.banking.deposits].sort((a, b) => new Date(a.date) - new Date(b.date));
                const firstDeposit = sortedDeposits[0];
                if (firstDeposit) {
                    depositAmount = firstDeposit.amount || 0;
                    depositStatus = firstDeposit.status || '-';
                    bonus = Math.floor(depositAmount * 0.3);
                }
            }
            return {
                _id: u._id,
                fullname: u.fullname,
                mobile: u.mobile,
                regDate: u.welcomeBonus && u.welcomeBonus.registrationDate ? u.welcomeBonus.registrationDate : u.createdAt || u._id.getTimestamp(),
                welcomeBonus: u.welcomeBonus && typeof u.welcomeBonus.amount === 'number' ? u.welcomeBonus.amount : 0,
                depositAmount,
                bonus,
                depositStatus
            };
        });
        res.json({ success: true, referredUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User Payment Method API
router.get('/user-payment-method/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('fullname mobile banking.bankName banking.accountNumber banking.ifsc banking.upiId');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const paymentMethod = {
            bankName: user.banking?.bankName || '',
            accountNumber: user.banking?.accountNumber || '',
            ifsc: user.banking?.ifsc || '',
            upiId: user.banking?.upiId || ''
        };
        res.json({ success: true, fullname: user.fullname, mobile: user.mobile, paymentMethod });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// All Deposits API (for admin panel) with filter/sort
router.get('/all-deposits', auth, adminMiddleware, async (req, res) => {
    try {
        const { user, amountMin, amountMax, status, dateFrom, dateTo, sortBy, order } = req.query;
        const users = await User.find({}).select('fullname banking.deposits');
        let deposits = [];
        const now = new Date();
        users.forEach(userObj => {
            (userObj.banking.deposits || []).forEach(dep => {
                let match = true;
                if (user && !userObj.fullname.toLowerCase().includes(user.toLowerCase())) match = false;
                if (amountMin && dep.amount < Number(amountMin)) match = false;
                if (amountMax && dep.amount > Number(amountMax)) match = false;
                if (status && dep.status !== status) match = false;
                if (dateFrom && new Date(dep.date) < new Date(dateFrom)) match = false;
                if (dateTo && new Date(dep.date) > new Date(dateTo)) match = false;
                if (match) {
                    const isNew = (now - new Date(dep.date)) < 24*60*60*1000;
                    deposits.push({
                        _id: dep._id,
                        userId: userObj.fullname,
                        amount: dep.amount,
                        bonus: dep.bonus,
                        transactionId: dep.transactionId,
                        screenshot: dep.screenshot,
                        status: dep.status,
                        date: dep.date,
                        isNew
                    });
                }
            });
        });
        // Sorting
        let sortField = sortBy || 'date';
        let sortOrder = order === 'asc' ? 1 : -1;
        deposits.sort((a, b) => {
            if (sortField === 'amount') return (a.amount - b.amount) * sortOrder;
            if (sortField === 'userId') return a.userId.localeCompare(b.userId) * sortOrder;
            if (sortField === 'status') return a.status.localeCompare(b.status) * sortOrder;
            return (new Date(a.date) - new Date(b.date)) * sortOrder;
        });
        res.json({ success: true, deposits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// All Withdrawals API (for admin panel) with filter/sort
router.get('/all-withdrawals', auth, adminMiddleware, async (req, res) => {
    try {
        const { user, amountMin, amountMax, status, dateFrom, dateTo, sortBy, order } = req.query;
        const users = await User.find({}).select('fullname banking.withdrawals');
        let withdrawals = [];
        const now = new Date();
        users.forEach(userObj => {
            (userObj.banking.withdrawals || []).forEach(wd => {
                let match = true;
                if (user && !userObj.fullname.toLowerCase().includes(user.toLowerCase())) match = false;
                if (amountMin && wd.amount < Number(amountMin)) match = false;
                if (amountMax && wd.amount > Number(amountMax)) match = false;
                if (status && wd.status !== status) match = false;
                if (dateFrom && new Date(wd.date) < new Date(dateFrom)) match = false;
                if (dateTo && new Date(wd.date) > new Date(dateTo)) match = false;
                if (match) {
                    const isNew = (now - new Date(wd.date)) < 24*60*60*1000;
                    withdrawals.push({
                        _id: wd._id,
                        userId: userObj.fullname,
                        amount: wd.amount,
                        status: wd.status,
                        date: wd.date,
                        isNew
                    });
                }
            });
        });
        // Sorting
        let sortField = sortBy || 'date';
        let sortOrder = order === 'asc' ? 1 : -1;
        withdrawals.sort((a, b) => {
            if (sortField === 'amount') return (a.amount - b.amount) * sortOrder;
            if (sortField === 'userId') return a.userId.localeCompare(b.userId) * sortOrder;
            if (sortField === 'status') return a.status.localeCompare(b.status) * sortOrder;
            return (new Date(a.date) - new Date(b.date)) * sortOrder;
        });
        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;



