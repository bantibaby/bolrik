require('dotenv').config();
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
router.use(express.json());

const User = require('../models/user');
const Result = require('../models/result');
const Bet = require('../models/bet');

// ✅ Ensure 'uploads' Folder Exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const {
    regipage, createUser, login, loginpage, alluser, sendOtp, verifyotp, verifyNum,
    passpage, setpassword, userAuth, myaccount, dashboard, logout, logoutAll,
    updateBalance, placeBet, getUserBets, getResults, getCurrentUser,
    deposit, deposit2, depositMoney, withdrawMoney, updateBankDetails, updateUpiDetails, forgate,
    verifyRecoveryKey, recoverAccount, fixMobileNumbers, getReferralDetails, fixReferredUsers,
    referralLeaderboard
} = require('../controllers/routecont');

const { updateBetResults } = require('../socket/socket');
const now = new Date();
const day = now.getDate().toString().padStart(2, "0");
const month = (now.getMonth() + 1).toString().padStart(2, "0");
const year = now.getFullYear();
const hours = now.getHours().toString().padStart(2, "0");
const minutes = now.getMinutes().toString().padStart(2, "0");
const seconds = now.getSeconds().toString().padStart(2, "0");

/// ✅ Correct Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = `${day}${month}${year}${hours}${minutes}${seconds}-${req.user?.mobile || "guest"}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ✅ Betting & Balance APIs
router.post('/updateBalance', auth, updateBalance);
router.post('/placeBet', auth, placeBet);
router.post('/updateBet', auth, updateBetResults);

router.get("/userBets", auth, getUserBets);
router.get("/results", getResults);
router.get("/getCurrentUser", auth, getCurrentUser);
router.get("/referral-leaderboard", auth, referralLeaderboard);
router.get('/getReferralDetails', getReferralDetails);

// ✅ Registration Flow Routes - Corrected names and flow
router.get('/register', regipage); // Show registration form
router.post('/register', sendOtp); // Process registration form and generate recovery key
router.get('/verify', verifyotp); // Show recovery key page
router.post('/verify-recovery', verifyRecoveryKey); // Verify recovery key before password setup

// ✅ Password Setup Route - Important to place this BEFORE login routes
router.get('/setpassword', passpage); // Show password setup form
router.post('/setpassword', setpassword); // Process password setup

// ✅ Login Routes
router.get('/login', loginpage); // Show login form
router.post('/login', login); // Process login

// ✅ Account Recovery Routes
router.get('/forgetpassword', forgate); // Show forget password form
router.post('/recovery', recoverAccount); // Process recovery request
router.get('/recovery', (req, res) => {
    res.render('recoveryKey', { user: req.user });
});

// ✅ Update Bank Details Route
router.post('/updateBank', auth, updateBankDetails);

// ✅ Update UPI Details Route
router.post('/updateUpi', auth, updateUpiDetails);

// ✅ Deposit & Transactions
router.get('/deposit', auth, (req, res) => {
    res.render('deposit', { user: req.user });
});
router.get('/depositVerify', auth, (req, res) => {
    res.render('depositVerify', { user: req.user });
});
router.get('/withdraw', auth, (req, res) => {
    res.render('withdraw', { user: req.user });
});
router.post('/withdraw', auth, withdrawMoney);
router.get('/withdraw/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("banking.withdrawals").lean();
        res.json({ withdrawals: user.banking.withdrawals || [] });
    } catch (error) {
        console.error("❌ Error Fetching Withdrawal History:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
router.get('/deposit/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("banking.deposits").lean();
        res.json({ deposits: user.banking.deposits || [] });
    } catch (error) {
        console.error("❌ Error Fetching Deposit History:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// ✅ Fix: Ensure Single API Call for Deposit (Prevent Double Execution)
router.post('/deposit', auth, upload.single('screenshot'), async (req, res) => {
    try {
        console.log("✅ Deposit API Called"); // Debugging Log
        await depositMoney(req, res);
    } catch (error) {
        console.error("❌ Deposit API Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// ✅ User Profile & Account Routes
router.get('/account', auth, userAuth);
router.get('/dashboard', auth, dashboard);
router.get('/logout', auth, logout);
router.get('/allout', auth, logoutAll);
router.get('/alluser', alluser);

// ✅ User Profile Route
router.get('/profile', auth, async (req, res) => {
    try {
        if (!req.session.user?.id && !req.user?._id) {
            return res.status(401).send("User not authenticated");
        }
        
        const userId = req.session.user?.id || req.user?._id;
        const user = await User.findById(userId).lean();
        
        if (!user) {
            return res.status(404).send("User not found");
        }
        
        console.log("User Data:", user);
        res.render('userprofile', { user });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).send("Error fetching user profile");
    }
});

// ✅ Admin Utilities Routes (Protected with Authentication and Admin Role)
router.get('/fixMobileNumbers', auth, fixMobileNumbers);
router.get('/fixReferrals', auth, fixReferredUsers);

module.exports = router;





