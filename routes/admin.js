const express = require("express");
const router = express.Router();
const { auth, adminMiddleware } = require("../middleware/auth");
const User = require("../models/user");
const PreResult = require("../models/preResult");

// Helper: send error or redirect with message
function sendAdminResponse(req, res, { success, message, redirect = "/admin/dashboard" }) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(success ? 200 : 400).json({ success, message });
    } else {
        // Optionally, use req.session or query param for feedback
        return res.redirect(redirect + `?msg=${encodeURIComponent(message)}&success=${success}`);
    }
}

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
        // Fetch only 10 latest results for each timeframe to reduce loading time
        const timeframes = [30, 45, 60, 150];
        const preResultsPromises = timeframes.map(tf => 
            PreResult.find({ timeframe: tf })
            .sort({ createdAt: -1 })
            .limit(10)
        );

        // Wait for all queries to complete
        const preResultsByTimeframe = await Promise.all(preResultsPromises);

        // Combine all results into a single array
        const preResults = preResultsByTimeframe.flat();
       
        res.render("admin", { userTableData, preResults, notificationUsers, currentPage: page, totalPages, query: { msg: req.query.msg, success: req.query.success } });
    } catch (error) {
        console.error("❌ Error in admin dashboard:", error);
        res.status(500).json({ message: "Server error!" });
    }
});

// Approve Deposit Request
router.post("/approve-deposit/:id", auth, adminMiddleware, async (req, res) => {
    try {
        // Find User by Deposit ID
        const user = await User.findOne({ "banking.deposits._id": req.params.id });
        if (!user) {
            return sendAdminResponse(req, res, { success: false, message: "User not found!" });
        }
        // Find the Deposit Entry
        let deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);
        if (!deposit) {
            return sendAdminResponse(req, res, { success: false, message: "Deposit not found!" });
        }
        // Check if Already Approved
        if (deposit.status === "Approved") {
            return sendAdminResponse(req, res, { success: false, message: "Deposit already approved!" });
        }
        // Validate amount/bonus
        if (deposit.amount < 0 || deposit.bonus < 0) {
            return sendAdminResponse(req, res, { success: false, message: "Invalid deposit amount or bonus!" });
        }
        // Total Amount to Add = Deposit Amount + Bonus
        const totalAmount = deposit.amount + deposit.bonus;
        // Update User Balance & Deposit Status (only if still pending)
        const updateResult = await User.updateOne(
            { "banking.deposits._id": req.params.id, "banking.deposits.status": "Pending" },
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
            return sendAdminResponse(req, res, { success: false, message: "Deposit not approved. Try again." });
        }
        // Referral Bonus Logic (only if not already credited)
        if (updatedDeposit.referralBonusPending && updatedDeposit.referralBonusPending.amount && updatedDeposit.referralBonusPending.referrerId) {
            // Find referrer
            const referrer = await User.findById(updatedDeposit.referralBonusPending.referrerId);
            if (referrer) {
                referrer.balance[0].bonus += updatedDeposit.referralBonusPending.amount;
                referrer.balance[0].pending += updatedDeposit.referralBonusPending.amount;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + updatedDeposit.referralBonusPending.amount;
                await referrer.save();
            }
            // Remove referralBonusPending from deposit
            updatedDeposit.referralBonusPending = undefined;
            updatedUser.markModified('banking.deposits');
            await updatedUser.save();
        }
        // Referral Welcome Bonus Logic (only if not already claimed)
        if (updatedUser.referredBy && updatedUser.banking.deposits.length === 1) {
            const referrer = await User.findOne({ referralCode: updatedUser.referredBy });
            if (referrer && Array.isArray(referrer.referralWelcomeBonuses)) {
                const pendingBonus = referrer.referralWelcomeBonuses.find(b => b.referredUserId.toString() === updatedUser._id.toString() && !b.isClaimed);
                if (pendingBonus) {
                    referrer.balance[0].pending += pendingBonus.amount;
                    pendingBonus.isClaimed = true;
                    pendingBonus.depositApproved = true;
                    await referrer.save();
                }
            }
        }
        // Audit trail (admin action log)
        if (!user.adminDepositHistory) user.adminDepositHistory = [];
        user.adminDepositHistory.push({
            depositId: deposit._id,
            action: "approved",
            adminId: req.user._id,
            timestamp: new Date(),
            note: req.body.reason || "Approved by admin"
        });
        await user.save();
        sendAdminResponse(req, res, { success: true, message: "Deposit approved successfully!" });
    } catch (error) {
        console.error("❌ Error Approving Deposit:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
});

// Reject Deposit Request
router.post("/reject-deposit/:id", auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ "banking.deposits._id": req.params.id });
        if (!user) return sendAdminResponse(req, res, { success: false, message: "User not found!" });
        const deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);
        if (!deposit) return sendAdminResponse(req, res, { success: false, message: "Deposit not found!" });
        if (deposit.status === "Rejected") return sendAdminResponse(req, res, { success: false, message: "Deposit already rejected!" });
        deposit.status = "Rejected";
        // Audit trail
        if (!user.adminDepositHistory) user.adminDepositHistory = [];
        user.adminDepositHistory.push({
            depositId: deposit._id,
            action: "rejected",
            adminId: req.user._id,
            timestamp: new Date(),
            note: req.body.reason || "Rejected by admin"
        });
        await user.save();
        sendAdminResponse(req, res, { success: true, message: "Deposit rejected successfully!" });
    } catch (error) {
        console.error("Error rejecting deposit:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
});

// Approve Withdrawal Request
router.post("/approve-withdraw/:id", auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ "banking.withdrawals._id": req.params.id });
        if (!user) return sendAdminResponse(req, res, { success: false, message: "User not found!" });
        const withdrawal = user.banking.withdrawals.find(w => w._id.toString() === req.params.id);
        if (!withdrawal) return sendAdminResponse(req, res, { success: false, message: "Withdrawal not found!" });
        if (withdrawal.status === "Approved") return sendAdminResponse(req, res, { success: false, message: "Withdrawal already approved!" });
        withdrawal.status = "Approved";
        // Audit trail
        if (!user.adminWithdrawHistory) user.adminWithdrawHistory = [];
        user.adminWithdrawHistory.push({
            withdrawalId: withdrawal._id,
            action: "approved",
            adminId: req.user._id,
            timestamp: new Date(),
            note: req.body.reason || "Approved by admin"
        });
        await user.save();
        sendAdminResponse(req, res, { success: true, message: "Withdrawal approved successfully!" });
    } catch (error) {
        console.error("Error approving withdrawal:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
});

// Reject Withdrawal Request
router.post("/reject-withdraw/:id", auth, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ "banking.withdrawals._id": req.params.id });
        if (!user) return sendAdminResponse(req, res, { success: false, message: "User not found!" });
        const withdrawal = user.banking.withdrawals.find(w => w._id.toString() === req.params.id);
        if (!withdrawal) return sendAdminResponse(req, res, { success: false, message: "Withdrawal not found!" });
        if (withdrawal.status === "Rejected") return sendAdminResponse(req, res, { success: false, message: "Withdrawal already rejected!" });
        // If not already rejected, add amount back to balance
        user.balance[0].pending += withdrawal.amount;
        withdrawal.status = "Rejected";
        // Audit trail
        if (!user.adminWithdrawHistory) user.adminWithdrawHistory = [];
        user.adminWithdrawHistory.push({
            withdrawalId: withdrawal._id,
            action: "rejected",
            adminId: req.user._id,
            timestamp: new Date(),
            note: req.body.reason || "Rejected by admin"
        });
        await user.save();
        sendAdminResponse(req, res, { success: true, message: "Withdrawal rejected successfully!" });
    } catch (error) {
        console.error("Error rejecting withdrawal:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
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

// ✅ View user payment method details
router.get('/user-payment-method/:id', auth, adminMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('fullname mobile banking').lean();
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        res.status(200).json({ 
            success: true,
            fullname: user.fullname,
            mobile: user.mobile,
            paymentMethod: user.banking || {}
        });
    } catch (error) {
        console.error("Error fetching user payment details:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ View device fingerprints (API)
router.get('/device-fingerprints', auth, adminMiddleware, async (req, res) => {
    try {
        const { DeviceFingerprint } = require('../middleware/fingerprint');
        
        // Get all fingerprints with populated user data
        const fingerprints = await DeviceFingerprint.find()
            .populate('userIds', 'fullname mobile')
            .sort({ updatedAt: -1 })
            .lean();
            
        res.status(200).json({
            success: true,
            count: fingerprints.length,
            fingerprints
        });
    } catch (error) {
        console.error("Error fetching device fingerprints:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ View device fingerprints (HTML page)
router.get('/fingerprints', auth, adminMiddleware, async (req, res) => {
    try {
        res.render('adminFingerprints');
    } catch (error) {
        console.error("Error rendering fingerprints page:", error);
        res.status(500).send("Internal server error");
    }
});

// ✅ View IP addresses (HTML page)
router.get('/ip-addresses', auth, adminMiddleware, async (req, res) => {
    try {
        res.render('adminIpAddresses');
    } catch (error) {
        console.error("Error rendering IP addresses page:", error);
        res.status(500).send("Internal server error");
    }
});

// ✅ Get IP addresses data (API)
router.get('/ip-addresses-data', auth, adminMiddleware, async (req, res) => {
    try {
        const IPTracker = require('../models/ipTracker');
        const User = require('../models/user');
        
        // Get all IP records with populated user data
        const ipAddresses = await IPTracker.find()
            .sort({ lastAccessedAt: -1 })
            .lean();
            
        // Enhance data with first user details
        const enhancedIpAddresses = await Promise.all(ipAddresses.map(async (ip) => {
            if (ip.firstUserId) {
                const firstUser = await User.findById(ip.firstUserId).select('fullname mobile').lean();
                return { ...ip, firstUser };
            }
            return ip;
        }));
        
        res.status(200).json({
            success: true,
            count: enhancedIpAddresses.length,
            ipAddresses: enhancedIpAddresses
        });
    } catch (error) {
        console.error("Error fetching IP addresses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ Toggle IP block status
router.post('/toggle-ip-block', auth, adminMiddleware, async (req, res) => {
    try {
        const { ipAddress, block, reason } = req.body;
        
        if (!ipAddress) {
            return res.status(400).json({ success: false, message: "IP address is required" });
        }
        
        const IPTracker = require('../models/ipTracker');
        
        const ipRecord = await IPTracker.findOne({ ipAddress });
        
        if (!ipRecord) {
            return res.status(404).json({ success: false, message: "IP address not found" });
        }
        
        ipRecord.isBlocked = block;
        if (block) {
            ipRecord.blockReason = reason || "Manually blocked by admin";
        } else {
            ipRecord.blockReason = "";
        }
        
        await ipRecord.save();
        
        res.status(200).json({
            success: true,
            message: block ? "IP address blocked successfully" : "IP address unblocked successfully"
        });
    } catch (error) {
        console.error("Error toggling IP block status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ View payment methods (HTML page)
router.get('/payment-methods', auth, adminMiddleware, async (req, res) => {
    try {
        res.render('adminPaymentMethods');
    } catch (error) {
        console.error("Error rendering payment methods page:", error);
        res.status(500).send("Internal server error");
    }
});

// ✅ Get payment methods data (API)
router.get('/payment-methods-data', auth, adminMiddleware, async (req, res) => {
    try {
        const PaymentMethod = require('../models/paymentMethod');
        const User = require('../models/user');
        
        // Get all payment methods with populated user data
        const paymentMethods = await PaymentMethod.find()
            .sort({ createdAt: -1 })
            .lean();
            
        // Enhance data with user details
        const enhancedPaymentMethods = await Promise.all(paymentMethods.map(async (pm) => {
            if (pm.userId) {
                const user = await User.findById(pm.userId).select('fullname mobile').lean();
                return { ...pm, user };
            }
            return pm;
        }));
        
        res.status(200).json({
            success: true,
            count: enhancedPaymentMethods.length,
            paymentMethods: enhancedPaymentMethods
        });
    } catch (error) {
        console.error("Error fetching payment methods:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ Toggle payment method lock status
router.post('/toggle-payment-method-lock', auth, adminMiddleware, async (req, res) => {
    try {
        const { paymentMethodId, lock, reason } = req.body;
        
        if (!paymentMethodId) {
            return res.status(400).json({ success: false, message: "Payment method ID is required" });
        }
        
        const PaymentMethod = require('../models/paymentMethod');
        
        const paymentMethod = await PaymentMethod.findById(paymentMethodId);
        
        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: "Payment method not found" });
        }
        
        paymentMethod.isLocked = lock;
        paymentMethod.adminNotes = reason || (lock ? "Manually locked by admin" : "Manually unlocked by admin");
        
        await paymentMethod.save();
        
        res.status(200).json({
            success: true,
            message: lock ? "Payment method locked successfully" : "Payment method unlocked successfully"
        });
    } catch (error) {
        console.error("Error toggling payment method lock status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// All Deposits API (with filters)
router.get('/all-deposits', auth, adminMiddleware, async (req, res) => {
    try {
        const { user, amountMin, amountMax, status, dateFrom, dateTo, sortBy = 'date', order = 'desc' } = req.query;
        
        // Find all users with deposits
        const users = await User.find({
            'banking.deposits': { $exists: true, $ne: [] }
        }).select('fullname mobile banking.deposits').lean();
        
        // Extract all deposits with user info
        let allDeposits = [];
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        users.forEach(user => {
            if (user.banking && user.banking.deposits && user.banking.deposits.length) {
                user.banking.deposits.forEach(deposit => {
                    // Check if deposit is new (within last 24 hours)
                    const isNew = new Date(deposit.date) >= oneDayAgo;
                    
                    allDeposits.push({
                        _id: deposit._id,
                        userId: user.fullname,
                        userMobile: user.mobile, // Add user mobile number
                        amount: deposit.amount,
                        bonus: deposit.bonus,
                        transactionId: deposit.transactionId,
                        screenshot: deposit.screenshot,
                        status: deposit.status,
                        date: deposit.date,
                        isNew
                    });
                });
            }
        });
        
        // Apply filters
        if (user) {
            allDeposits = allDeposits.filter(d => d.userId.toLowerCase().includes(user.toLowerCase()));
        }
        if (amountMin) {
            allDeposits = allDeposits.filter(d => d.amount >= parseFloat(amountMin));
        }
        if (amountMax) {
            allDeposits = allDeposits.filter(d => d.amount <= parseFloat(amountMax));
        }
        if (status) {
            allDeposits = allDeposits.filter(d => d.status === status);
        }
        if (dateFrom) {
            allDeposits = allDeposits.filter(d => new Date(d.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            // Add one day to include the end date fully
            const endDate = new Date(dateTo);
            endDate.setDate(endDate.getDate() + 1);
            allDeposits = allDeposits.filter(d => new Date(d.date) <= endDate);
        }
        
        // Sort deposits
        const sortMultiplier = order === 'asc' ? 1 : -1;
        allDeposits.sort((a, b) => {
            if (sortBy === 'date') {
                return sortMultiplier * (new Date(a.date) - new Date(b.date));
            } else if (sortBy === 'amount') {
                return sortMultiplier * (a.amount - b.amount);
            } else if (sortBy === 'status') {
                return sortMultiplier * a.status.localeCompare(b.status);
            } else if (sortBy === 'userId') {
                return sortMultiplier * a.userId.localeCompare(b.userId);
            }
            return 0;
        });
        
        res.json({ success: true, deposits: allDeposits });
    } catch (error) {
        console.error('Error fetching deposits:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// All Withdrawals API (with filters)
router.get('/all-withdrawals', auth, adminMiddleware, async (req, res) => {
    try {
        const { user, amountMin, amountMax, status, dateFrom, dateTo, sortBy = 'date', order = 'desc' } = req.query;
        
        // Find all users with withdrawals
        const users = await User.find({
            'banking.withdrawals': { $exists: true, $ne: [] }
        }).select('fullname mobile banking.withdrawals').lean();
        
        // Extract all withdrawals with user info
        let allWithdrawals = [];
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        users.forEach(user => {
            if (user.banking && user.banking.withdrawals && user.banking.withdrawals.length) {
                user.banking.withdrawals.forEach(withdrawal => {
                    // Check if withdrawal is new (within last 24 hours)
                    const isNew = new Date(withdrawal.date) >= oneDayAgo;
                    
                    allWithdrawals.push({
                        _id: withdrawal._id,
                        userId: user.fullname,
                        userMobile: user.mobile, // Add user mobile number
                        amount: withdrawal.amount,
                        status: withdrawal.status,
                        date: withdrawal.date,
                        paymentMethod: withdrawal.paymentMethod || 'bank', // Default to 'bank' for backward compatibility
                        paymentDetails: withdrawal.paymentDetails || {}, // Include payment details
                        isNew
                    });
                    });
                }
            });
        
        // Apply filters
        if (user) {
            allWithdrawals = allWithdrawals.filter(w => w.userId.toLowerCase().includes(user.toLowerCase()));
        }
        if (amountMin) {
            allWithdrawals = allWithdrawals.filter(w => w.amount >= parseFloat(amountMin));
        }
        if (amountMax) {
            allWithdrawals = allWithdrawals.filter(w => w.amount <= parseFloat(amountMax));
        }
        if (status) {
            allWithdrawals = allWithdrawals.filter(w => w.status === status);
        }
        if (dateFrom) {
            allWithdrawals = allWithdrawals.filter(w => new Date(w.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            // Add one day to include the end date fully
            const endDate = new Date(dateTo);
            endDate.setDate(endDate.getDate() + 1);
            allWithdrawals = allWithdrawals.filter(w => new Date(w.date) <= endDate);
        }
        
        // Sort withdrawals
        const sortMultiplier = order === 'asc' ? 1 : -1;
        allWithdrawals.sort((a, b) => {
            if (sortBy === 'date') {
                return sortMultiplier * (new Date(a.date) - new Date(b.date));
            } else if (sortBy === 'amount') {
                return sortMultiplier * (a.amount - b.amount);
            } else if (sortBy === 'status') {
                return sortMultiplier * a.status.localeCompare(b.status);
            } else if (sortBy === 'userId') {
                return sortMultiplier * a.userId.localeCompare(b.userId);
            }
            return 0;
        });
        
        res.json({ success: true, withdrawals: allWithdrawals });
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ✅ **Update User Balance**
router.post("/update-user-balance", auth, adminMiddleware, async (req, res) => {
    try {
        const { userId, amount, operation, reason } = req.body;
        
        if (!userId || !amount || !operation) {
            return res.status(400).json({ 
                success: false, 
                message: "User ID, amount, and operation are required" 
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Ensure user has a balance array
        if (!user.balance || !user.balance.length) {
            user.balance = [{ pending: 0, bonus: 0 }];
        }

        const currentBalance = user.balance[0].pending || 0;
        let newBalance = currentBalance;
        
        // Perform the operation
        if (operation === "add") {
            newBalance = currentBalance + parseFloat(amount);
        } else if (operation === "subtract") {
            newBalance = currentBalance - parseFloat(amount);
            // Prevent negative balance
            if (newBalance < 0) {
                newBalance = 0;
            }
        } else if (operation === "set") {
            newBalance = parseFloat(amount);
        } else {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid operation. Use 'add', 'subtract', or 'set'" 
            });
        }

        // Update the user's balance
        user.balance[0].pending = newBalance;
        
        // Add transaction record if needed
        if (reason) {
            if (!user.adminBalanceHistory) {
                user.adminBalanceHistory = [];
            }
            
            user.adminBalanceHistory.push({
                amount: parseFloat(amount),
                operation,
                previousBalance: currentBalance,
                newBalance,
                reason,
                adminId: req.user._id,
                timestamp: new Date()
            });
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "User balance updated successfully",
            previousBalance: currentBalance,
            newBalance,
            user: {
                _id: user._id,
                fullname: user.fullname,
                mobile: user.mobile
            }
        });
    } catch (error) {
        console.error("❌ Error updating user balance:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error while updating balance" 
        });
    }
});

module.exports = router;



