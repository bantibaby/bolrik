const express = require("express");
const router = express.Router();
const { auth, adminMiddleware } = require("../middleware/auth");
const User = require("../models/user");
const PreResult = require("../models/preResult");

// ✅ **Admin Dashboard**
// ✅ **Admin Dashboard (Only Admins can access)**
router.get("/dashboard", auth, adminMiddleware, async (req, res) => {
    try {
        // 📌 Filter Users
        const userFilter = {
            role: req.query.role || { $exists: true },
            referredBy: req.query.referredBy || { $exists: true },
            mobile: req.query.mobile ? { $regex: req.query.mobile, $options: "i" } : { $exists: true }
        };
        const users = await User.find(userFilter).select("-password");
       
        // 📌 Get all deposits with user info
        const allDeposits = [];
        for (const user of users) {
            if (user.banking && user.banking.deposits) {
                user.banking.deposits.forEach(deposit => {
                    allDeposits.push({
                        ...deposit.toObject(),
                        userId: user.fullname,
                        userMobile: user.mobile
                    });
                });
            }
        }

        // 📌 Get all withdrawals with user info
        const allWithdrawals = [];
        for (const user of users) {
            if (user.banking && user.banking.withdrawals) {
                user.banking.withdrawals.forEach(withdrawal => {
                    allWithdrawals.push({
                        ...withdrawal.toObject(),
                        userId: user.fullname,
                        userMobile: user.mobile
                    });
                });
            }
        }

        // 📌 Filter PreResults
        const preResults = await PreResult.find({
            gameId: req.query.gameId || { $exists: true },
            resultNumber: req.query.resultNumber || { $exists: true },
            timeframe: req.query.timeframe || { $exists: true }
        }).sort({ createdAt: -1 });
       
        res.render("admin", { users, deposits: allDeposits, withdrawals: allWithdrawals, preResults });
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
    await User.updateOne({ "banking.withdrawals._id": req.params.id }, { $set: { "banking.withdrawals.$.status": "Rejected" } });
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

module.exports = router;



