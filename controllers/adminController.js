// exports.getAdminDashboard = (req, res) => {
//     res.render("admin/dashboard", { title: "Admin Dashboard" });
// };
// controllers/adminController.js
const User = require('../models/user');
const PreResult = require('../models/preResult');
const IPTracker = require('../models/ipTracker'); // Assuming model path
const PaymentMethod = require('../models/paymentMethod'); // Assuming model path
const { DeviceFingerprint } = require('../middleware/fingerprint'); // Assuming path

// Helper to respond with JSON or Redirect
function sendAdminResponse(req, res, { success, message, data, redirect = "/admin/dashboard" }) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(success ? 200 : 400).json({ success, message, ...data });
    }
    res.redirect(`${redirect}?msg=${encodeURIComponent(message)}&success=${success}`);
}

// 1. RENDER MAIN DASHBOARD PAGE
exports.getDashboard = async (req, res) => {
    try {
        // Find all users who have pending deposits or withdrawals to display in respective tables
        const usersWithPendingDeposits = await User.find({ "banking.deposits.status": "Pending" }).select('fullname mobile banking.deposits').lean();
        const usersWithPendingWithdrawals = await User.find({ "banking.withdrawals.status": "Pending" }).select('fullname mobile banking.withdrawals paymentMethod paymentDetails').lean();

        // Extract and flatten the pending requests
        const pendingDeposits = usersWithPendingDeposits.flatMap(user =>
            user.banking.deposits
                .filter(d => d.status === 'Pending')
                .map(d => ({ ...d, userFullname: user.fullname, userMobile: user.mobile }))
        );

        const pendingWithdrawals = usersWithPendingWithdrawals.flatMap(user =>
            user.banking.withdrawals
                .filter(w => w.status === 'Pending')
                .map(w => ({ ...w, userFullname: user.fullname, userMobile: user.mobile }))
        );
        
        // Pagination for the main user table
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const skip = (page - 1) * limit;

        const userFilter = {}; // Your existing filter logic can be here
        if (req.query.mobile) userFilter.mobile = { $regex: req.query.mobile, $options: "i" };

        const allUsers = await User.find(userFilter)
            .select("fullname mobile role referredBy balance createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const totalUsers = await User.countDocuments(userFilter);
        const totalPages = Math.ceil(totalUsers / limit);

        // Pre-Result data
        const preResults = await PreResult.find().sort({ createdAt: -1 }).limit(40).lean();
        
        res.render("admin", {
            layout: false,
            title: "Admin Dashboard",
            allUsers,
            pendingDeposits,
            pendingWithdrawals,
            preResults,
            totalPages,
            currentPage: page,
            query: req.query
        });

    } catch (error) {
        console.error("Error in admin dashboard:", error);
        res.status(500).render('500'); // Render an error page
    }
};

// 2. ACTION: Approve Deposit
exports.approveDeposit = async (req, res) => {
    try {
        const user = await User.findOne({ "banking.deposits._id": req.params.id });
        if (!user) return sendAdminResponse(req, res, { success: false, message: "User not found!" });

        const deposit = user.banking.deposits.id(req.params.id);
        if (!deposit || deposit.status !== 'Pending') {
            return sendAdminResponse(req, res, { success: false, message: "Deposit not pending or not found!" });
        }

        const totalAmount = deposit.amount + deposit.bonus;
        user.balance[0].pending += totalAmount;
        user.balance[0].bonus += deposit.bonus;
        deposit.status = "Approved";
        
        // Add your referral bonus and audit trail logic here...
        
        await user.save();
        sendAdminResponse(req, res, { success: true, message: "Deposit approved successfully!" });
    } catch (error) {
        console.error("❌ Error Approving Deposit:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
};

// 3. ACTION: Reject Deposit
exports.rejectDeposit = async (req, res) => {
    try {
        const result = await User.updateOne(
            { "banking.deposits._id": req.params.id },
            { $set: { "banking.deposits.$.status": "Rejected" } }
        );

        if (result.nModified === 0) {
           return sendAdminResponse(req, res, { success: false, message: "Deposit not found or already processed." });
        }
        sendAdminResponse(req, res, { success: true, message: "Deposit rejected successfully!" });
    } catch (error) {
        console.error("Error rejecting deposit:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
};

// 4. ACTION: Approve Withdrawal
exports.approveWithdrawal = async (req, res) => {
    try {
        const result = await User.updateOne(
            { "banking.withdrawals._id": req.params.id, "banking.withdrawals.status": "Pending" },
            { $set: { "banking.withdrawals.$.status": "Approved" } }
        );
        if (result.nModified === 0) {
           return sendAdminResponse(req, res, { success: false, message: "Withdrawal not found or already processed." });
        }
        sendAdminResponse(req, res, { success: true, message: "Withdrawal approved successfully!" });
    } catch (error) {
        console.error("Error approving withdrawal:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
};

// 5. ACTION: Reject Withdrawal
exports.rejectWithdrawal = async (req, res) => {
    try {
        const user = await User.findOne({ "banking.withdrawals._id": req.params.id });
        if (!user) return sendAdminResponse(req, res, { success: false, message: "User not found!" });

        const withdrawal = user.banking.withdrawals.id(req.params.id);
        if (!withdrawal || withdrawal.status !== 'Pending') {
            return sendAdminResponse(req, res, { success: false, message: "Withdrawal not found or already processed." });
        }
        
        // Refund amount to user's balance
        user.balance[0].pending += withdrawal.amount;
        withdrawal.status = "Rejected";
        await user.save();
        
        sendAdminResponse(req, res, { success: true, message: "Withdrawal rejected and amount refunded." });
    } catch (error) {
        console.error("Error rejecting withdrawal:", error);
        sendAdminResponse(req, res, { success: false, message: "Server error!" });
    }
};

// 6. ACTION: Update User Balance
exports.updateUserBalance = async (req, res) => {
    // Paste your existing "update-user-balance" logic here...
    // Make sure to use sendAdminResponse at the end
};


// 7. API for MODALS: Get user details for modals
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('history banking.deposits banking.withdrawals')
            .populate({ path: 'referredUsers', select: 'fullname mobile' })
            .lean();

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({
            success: true,
            betHistory: user.history || [],
            deposits: user.banking.deposits || [],
            withdrawals: user.banking.withdrawals || [],
            referredUsers: user.referredUsers || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};