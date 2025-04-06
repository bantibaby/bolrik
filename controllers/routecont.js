require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const User = require('../models/user');
const Result = require('../models/result');
const Bet = require('../models/bet');
const mongoose = require("mongoose");

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const connectDB = require('../config/db');
const otpGenerator = require('otp-generator');
const {otpVerify} = require('./verifyOtp');

// Import generateReferralCode from user model
const userModel = require('../models/user');
const generateReferralCode = userModel.generateReferralCode;

const sendOtp = async(req, res) =>{

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        await connectDB();
        const {fullname, mobile, referralCode } = req.body;
        const recoveryKeys = otpGenerator.generate(6, {upperCaseAlphabets: true, specialChars:false, lowerCaseAlphabets:false});
        
        // Check if user already exists with verified status
        console.log("Finding user with mobile:", mobile);
        console.log("User model type:", typeof User);
        console.log("User model methods:", Object.keys(User));
        
        const existingUser = await User.findOne({ mobile: mobile });
        
        console.log("Existing user check result:", existingUser);
        
        if (existingUser && existingUser.verify) {
            return res.status(400).json({
                success: false,
                msg: "इस मोबाइल नंबर से एक खाता पहले से मौजूद है। कृपया लॉगिन करें।"
            });
        }
        
        // Create or update user without setting password yet
        const newUser = await User.findOneAndUpdate(
            {mobile: mobile},
            {
                fullname, 
                recoveryKeys, 
                referredBy: referralCode ? referralCode.trim() : null,
                verify: false // Not verified until password is set
            },
            {upsert: true, new: true, setDefaultsOnInsert: true}
        );
        
        // Store data in session
        req.session.recoveryKeys = recoveryKeys;
        req.session.mobile = mobile;
        req.session.fullname = fullname;
        req.session.referralCode = referralCode;
        
        console.log("User created/updated:", newUser);
        console.log("Recovery key generated:", recoveryKeys);

        // Render OTP page with recovery key
        return res.status(201).render('otp', { 
            recoveryKeys,
            mobile,
            message: "कृपया इस रिकवरी कोड को सुरक्षित रखें। अपना खाता पुनः प्राप्त करने के लिए आपको इसकी आवश्यकता होगी।" 
        });

    } catch (error) {
        console.error("Error in sendOtp:", error);
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
}

// Function to verify recovery key before password setup
const verifyRecoveryKey = async (req, res) => {
    try {
        // Accept both recoveryKey or recoveryKeys parameter
        const { mobile, recoveryKey, recoveryKeys } = req.body;
        const keyToCheck = recoveryKey || recoveryKeys;
        
        if (!mobile || !keyToCheck) {
            return res.status(400).json({ 
                success: false, 
                msg: "मोबाइल नंबर और रिकवरी की दोनों आवश्यक हैं।" 
            });
        }
        
        console.log("Verifying recovery key:", { mobile, recoveryKey: keyToCheck });
        
        // Check against recoveryKeys field in database
        const user = await User.findOne({ mobile, recoveryKeys: keyToCheck });
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                msg: "अमान्य मोबाइल नंबर या रिकवरी की।" 
            });
        }
        
        // Store in session that recovery key was verified
        req.session.isRecoveryVerified = true;
        req.session.mobile = mobile;
        
        // Redirect to password setup page
        return res.render('setpassword', { mobile });
        
    } catch (error) {
        console.error("Error in verifyRecoveryKey:", error);
        return res.status(500).json({ 
            success: false, 
            msg: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।" 
        });
    }
};

const setpassword = async (req, res) => {
    console.log("setpassword function called with body:", req.body);
    console.log("Session data:", req.session);
    
    const { password, confirmPassword, mobile } = req.body;

    if (!password || !confirmPassword) {
        return res.status(400).json({ success: false, msg: "Password aur Confirm Password required hain." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, msg: "Passwords match nahi kar rahe hain." });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ success: false, msg: "Password kam se kam 6 characters ka hona chahiye." });
    }

    try {
        // Get mobile from session or request body
        const userMobile = mobile || req.session.mobile;
        
        if (!userMobile) {
            return res.status(400).json({ 
                success: false, 
                msg: "सेशन समाप्त हो गया है या मोबाइल नंबर प्रदान नहीं किया गया है। कृपया फिर से रजिस्ट्रेशन शुरू करें।" 
            });
        }
        
        console.log("Setting password for mobile:", userMobile);
        
        const user = await User.findOne({ mobile: userMobile });

        if (!user) {
            return res.status(400).json({ success: false, msg: "User nahi mila." });
        }

        console.log("User found:", user._id);

        // No need to manually set referralCode as it's already set by default in schema
        // if (!user.referralCode) {
        //     user.referralCode = generateReferralCode();
        // }

        // Hash password
        user.password = await bcrypt.hash(password, 12);
        user.verify = true; // Mark user as verified
        
        // Save user first before generating token
        await user.save();
        console.log("User saved with password");

        // Generate token and set cookie AFTER successful save and password verification
        const token = await user.generateAuthToken();
        res.cookie("jwt", token, { expires: new Date(Date.now() + 1000000), httpOnly: true });

        // Handle referral logic
        if (req.session.referralCode) {
            const referrer = await User.findOne({ referralCode: req.session.referralCode });
            if (referrer) {
                // Avoid duplicate referrals
                if (!referrer.referredUsers.includes(user._id)) {
                    referrer.referredUsers.push(user._id);
                    await referrer.save();
                    console.log(`✅ Referral Success: ${user.fullname} referred by ${referrer.fullname}`);
                }
            }
        }

        // Clear sensitive session data but keep user logged in
        delete req.session.recoveryKeys;
        delete req.session.isRecoveryVerified;
        
        // Set user session data
        req.session.user = {
            id: user._id,
            mobile: user.mobile
        };
        
        return res.status(201).render("login", {
            success: true,
            message: "आपका खाता सफलतापूर्वक बनाया गया है। कृपया लॉगिन करें।"
        });

    } catch (error) {
        console.error("❌ Error in setpassword:", error);
        return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
};

const recoverAccount = async (req, res) => {
    try {
        const { mobile } = req.body;
        
        if (!mobile) {
            return res.status(400).json({ success: false, msg: "मोबाइल नंबर आवश्यक है।" });
        }
        
        const user = await User.findOne({ mobile });
        
        if (!user) {
            return res.status(404).json({ success: false, msg: "इस मोबाइल नंबर से कोई खाता नहीं मिला।" });
        }
        
        // Store mobile in session
        req.session.mobile = mobile;
        
        return res.render('recoveryKey', { mobile });
    } catch (error) {
        console.error("Error in recoverAccount:", error);
        return res.status(500).json({ success: false, msg: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।" });
    }
}

const regipage = (req, res) =>{
    res.render('register');
};

const verifyotp = (req, res) =>{
    // Check if recovery key is in session
    const recoveryKeys = req.session.recoveryKeys;
    const mobile = req.session.mobile;
    
    if (!recoveryKeys || !mobile) {
        return res.redirect('/user/register');
    }
    
    res.render('otp', { recoveryKeys, mobile });
};

const passpage = (req, res) =>{
    // Check if mobile is in session
    const mobile = req.session.mobile;
    
    if (!mobile) {
        return res.redirect('/user/register');
    }
    
    res.render('setpassword', { mobile });
};

const loginpage = (req, res) =>{
    res.render('login');
};

const deposit = (req, res) =>{
    res.render('deposit');
};
const deposit2 = (req, res) =>{
    res.render('depositPage2');
};
const forgate = (req, res) =>{
    res.render('forgetPassword');
};
// const userAuth = (req, res) =>{
//     res.render('userprofile');
// };

// login page ke liye routing
 
const login = async (req, res)=>{
    try {
        const { mobile, password } = req.body;

        if (!mobile || !password) {
            return res.status(400).json({ 
                success: false, 
                msg: "मोबाइल नंबर और पासवर्ड दोनों आवश्यक हैं।" 
            });
        }

        // Find the user
        const user = await User.findOne({ mobile });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                msg: "यह मोबाइल नंबर रजिस्टर्ड नहीं है। कृपया पहले रजिस्ट्रेशन करें।" 
            });
        }
        
        if (!user.verify) {
            return res.status(400).json({ 
                success: false, 
                msg: "खाता सत्यापित नहीं है। कृपया अपना पासवर्ड सेट करें।" 
            });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                msg: "अमान्य क्रेडेंशियल्स। कृपया सही पासवर्ड दर्ज करें।" 
            });
        }

        // Generate token ONLY if password is correct
        const token = await user.generateAuthToken();
        
        // Store token into cookie
        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 5 * 60 * 1000),
            httpOnly: true
        });
        
        // Set session data
        req.session.user = {
            id: user._id,
            mobile: user.mobile
        };
        
        return res.render('userprofile', { user });

    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ 
            success: false, 
            msg: "लॉगिन करते समय त्रुटि: " + error.message 
        });
    }
};



const userAuth = async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/user/login'); // अगर यूज़र लॉगिन नहीं है
    }
  
    try {
        const user = await User.findById(req.session.user.id);
        console.log(user.fullname)
      if (!user) {
        return res.status(404).send('User not found!');
      }
  
      // My Account पेज रेंडर करें और डेटा भेजें
      return res.render('userprofile', { user });
    } catch (error) {
      res.status(500).send('Server Error');
    }
};

const alluser = async (req, res) =>{
    try {
    const userdata = await User.find({});
        res.status(200).json({userdata})
    } catch (error) {
        res.status(400).send('Error data ' + error.message);
    }
}

const dashboard = async (req, res) =>{
    res.render('dashboard');
};


const logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        // ✅ Remove the token of the logged-in user
        await User.updateOne(
            { _id: req.user._id },
            { $pull: { tokens: { token: req.token } } }
        );

        res.clearCookie('jwt');
        console.log('✅ Logout successful');
        return res.render('login');

    } catch (error) {
        console.error("❌ Logout error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const logoutAll = async (req, res) =>{
    try {
        console.log(req.user);

        req.user.tokens = [];

        res.clearCookie('jwt')
        console.log('all user logout successfully');

        await req.user.save();
        res.render('login');
    } catch (error) {
        res.status(500).send(error)
    }
}

const depositMoney = async (req, res) => {
    try {
        const { amount, bonus, transactionId } = req.body;
        const screenshot = req.file ? req.file.path : null;
        const userId = req.session.user?.id || req.user?._id;

        if (!userId || !amount || !bonus || !transactionId || !screenshot) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.banking.deposits.push({
            date: new Date(),
            userId,
            amount,
            bonus,
            transactionId,
            screenshot,
            status: "Pending"
        });

        await user.save();

        // ✅ Referral Earnings Logic
        if (user.referredBy) {
            const referrer = await User.findOne({ referralCode: user.referredBy });
            if (referrer) {
                const referralBonus = amount * 0.3; // 5% Referral Bonus
                referrer.referralEarnings += referralBonus;
                referrer.balance[0].pending += referralBonus; // ✅ Balance bhi update karein
                await referrer.save();

                console.log(`💰 Referral Bonus Given: ${referralBonus} ₹ to ${referrer.fullname}`);
            }
        }

        return res.status(200).json({ message: "Deposit Request Submitted Successfully!" });

    } catch (error) {
        console.error("❌ Deposit Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const withdrawMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user?._id || req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const availableBalance = user.balance[0].pending; // ✅ Fetch Balance from DB

        if (amount > availableBalance) {
            return res.status(400).json({ message: "Insufficient Balance" });
        }

        // ✅ Deduct Withdraw Amount from Pending Balance
        user.balance[0].pending -= amount;

        // ✅ Store Withdrawal Request in Database
        user.banking.withdrawals.push({ amount, status: "Pending" });

        await user.save();
        res.status(200).json({ message: "Withdrawal Request Submitted" });

    } catch (error) {
        console.error("❌ Withdrawal Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const placeBet = async (req, res) => {
    try {
        const { userId, betAmount, betNumber } = req.body;

        // बेट डिटेल्स की बेहतर वैलिडेशन
        if (!userId) {
            return res.status(400).json({ success: false, message: "यूजर आईडी अनुपलब्ध है" });
        }
        
        if (!betAmount || betAmount <= 0) {
            return res.status(400).json({ success: false, message: "अमान्य बेट राशि" });
        }
        
        if (!Array.isArray(betNumber) || betNumber.length !== 3) {
            return res.status(400).json({ success: false, message: "कृपया सटीक 3 नंबर चुनें" });
        }

        // गेम आईडी की सत्यापन
        if (!global.currentGameId) {
            return res.status(400).json({ 
                success: false, 
                message: "वर्तमान में कोई सक्रिय गेम नहीं है, कृपया कुछ सेकंड बाद फिर से प्रयास करें" 
            });
        }

        // गेम काउंटडाउन टाइम चेक (बहुत कम समय बचा है तो बेट न लें)
        if (global.countdownTime && global.countdownTime < 5) {
            return res.status(400).json({
                success: false,
                message: "इस राउंड के लिए बेटिंग समय समाप्त, कृपया अगले राउंड के लिए रुकें"
            });
        }
        
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "यूजर नहीं मिला" });

        // ✅ बैलेंस केवल एक बार घटाएं
        if (user.balance[0].pending >= betAmount) {
            user.balance[0].pending -= betAmount;
            // यहां save करेंगे, दोबारा नहीं
            await user.save();
        } else {
            return res.json({ success: false, message: "अपर्याप्त बैलेंस" });
        }

        // ✅ Ensure gameId is correctly assigned
        const newBet = new Bet({
            userId,
            betAmount,
            betNumber,
            gameId: global.currentGameId, // ✅ Assign correct gameId
            status: "pending"
        });

        await newBet.save();

        console.log("✅ Bet placed successfully with gameId:", newBet.gameId);

        return res.json({ 
            success: true, 
            message: "बेट सफलतापूर्वक प्लेस किया गया!", 
            bet: {
                _id: newBet._id,
                gameId: newBet.gameId, // ✅ Ensure gameId is included in the response
                betNumber: newBet.betNumber,
                betAmount: newBet.betAmount,
                status: newBet.status
            }
        });

    } catch (error) {
        console.error("❌ Error placing bet:", error);
        return res.status(500).json({ success: false, message: "सर्वर त्रुटि! कृपया बाद में पुन: प्रयास करें" });
    }
};


// ✅ **Update Balance**
const updateBalance = async (req, res) => {
    try {
        const { newBalance } = req.body;
        
        if (!newBalance || isNaN(newBalance)) {
            return res.status(400).json({ success: false, message: "Invalid balance value" });
        }

        const userId = req.user?._id || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        // ✅ Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // ✅ Check if balance exists
        if (user.balance.length > 0) {
            // ✅ Update the first balance entry
            await User.updateOne(
                { _id: userId, "balance._id": user.balance[0]._id }, // Target first balance entry
                { $set: { "balance.$.pending": newBalance } } // ✅ Correctly update pending inside array
            );
        } else {
            // ✅ If balance array is empty, create a new entry
            user.balance.push({ pending: newBalance, bonus: 0 });
            await user.save();
        }

        return res.status(200).json({ success: true, newBalance });
    } catch (error) {
        console.error("❌ Balance update error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getUserBets = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?.id;
        const bets = await Bet.find({ userId, status: "pending" });
        return res.json({ success: true, bets });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getResults = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [results, totalResults] = await Promise.all([
            Result.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Result.countDocuments()
        ]);

        const totalPages = Math.ceil(totalResults / limit);

        res.json({
            success: true,
            results,
            currentPage: page,
            totalPages,
            totalResults
        });
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ **New Result Handler (Real-time update)**
const addNewResult = async (req, res) => {
    try {
        const newResult = new Result(req.body);
        await newResult.save();

        // ✅ Fetch latest 10 results
        const latestResults = await Result.find({})
            .sort({ createdAt: -1 })
            .limit(10);

        // ✅ Emit real-time update to clients
        req.app.get("io").emit("newResult", latestResults);

        res.json({ success: true, newResult });
    } catch (error) {
        console.error("Error adding new result:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getCurrentUser = async (req, res) => {
    try {
        // JWT टोकन को वेरिफाई करें
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: "कृपया पहले लॉगिन करें" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: "यूजर नहीं मिला" 
            });
        }

        // यूजर की जानकारी एक सुसंगत फॉर्मेट में भेजें
        // यह सुनिश्चित करता है कि फ्रंटएंड पर सभी फील्ड्स मौजूद हैं
        res.status(200).json({
            success: true,
            userId: user._id.toString(), // सीधे उपलब्ध कराएं
            user: {
                id: user._id.toString(),
                mobile: user.mobile,
                fullname: user.fullname
            },
            balance: {
                pending: user.balance[0]?.pending || 0,
                bonus: user.balance[0]?.bonus || 0
            }
        });
    } catch (error) {
        console.error("getCurrentUser में त्रुटि:", error);
        res.status(401).json({ 
            success: false, 
            error: "कृपया पहले लॉगिन करें" 
        });
    }
};



// ✅ Update Bank Details
const updateBankDetails = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: "User not authenticated" });

        const { bankName, accountNumber, ifsc } = req.body;
        if (!bankName || !accountNumber || !ifsc) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "banking.bankName": bankName, "banking.accountNumber": accountNumber, "banking.ifsc": ifsc } },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "Bank details updated successfully!", user });
    } catch (error) {
        console.error("❌ Error updating bank details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// ✅ Update UPI Details
const updateUpiDetails = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: "User not authenticated" });

        const { upiId } = req.body;
        if (!upiId) return res.status(400).json({ message: "UPI ID is required!" });

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "banking.upiId": upiId } },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "UPI ID updated successfully!", user });
    } catch (error) {
        console.error("❌ Error updating UPI ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = {regipage,loginpage, sendOtp, verifyotp, passpage, setpassword, alluser, login, userAuth, dashboard, logout, logoutAll, updateBalance, placeBet, getUserBets, getResults,getCurrentUser,depositMoney, deposit,deposit2,withdrawMoney,updateBankDetails, updateUpiDetails,forgate, addNewResult, verifyRecoveryKey, recoverAccount};


