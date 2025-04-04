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



const sendOtp = async(req, res) =>{

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const conectdb = await connectDB();
        const {fullname, mobile, referralCode } = req.body;
        const recoveryKeys = otpGenerator.generate(6, {upperCaseAlphabets: true, specialChars:false, lowerCaseAlphabets:false})
        const newUser = await User.findOneAndUpdate(
            {mobile:mobile},
            {fullname, recoveryKeys, referredBy: referralCode ? referralCode.trim() : null},
            {upsert: true, new:true, setDefaultsOnInsert:true}
             
        );
        req.session.recoveryKeys = recoveryKeys;
        req.session.mobile = mobile;
        req.session.fullname = fullname;
        req.session.referralCode =  referralCode ;
        
        console.log(newUser);
        console.log(recoveryKeys);

        return res.status(201).render('otp', { recoveryKeys });


    } catch (error) {
        return res.status(400).json({
            success:false,
            msg: error.message
        });
        
    }
}

const setpassword = async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
        return res.status(400).json({ success: false, msg: "Password aur Confirm Password required hain." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, msg: "Passwords match nahi kar rahe hain." });
    }

    try {
        const mobile = req.session.mobile;
        if (!mobile) {
            return res.status(400).json({ success: false, msg: "Session expired. Please try again." });
        }

        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(404).json({ success: false, msg: "User nahi mila." });
        }

        // Password hash karein
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.verify = true;

        // Token generate karein
        const token = await user.generateAuthToken();
        
        // Cookie set karein
        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 1000000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Referral system handle karein
        if (req.session.referralCode) {
            const referrer = await User.findOne({ referralCode: req.session.referralCode });
            if (referrer) {
                referrer.referredUsers.push(user._id);
                await referrer.save();
            }
        }

        await user.save();
        
        // Session clear karein
        req.session.destroy();
        
        return res.status(200).json({ 
            success: true, 
            msg: "Password set successfully",
            user: {
                id: user._id,
                mobile: user.mobile,
                fullname: user.fullname
            }
        });

    } catch (error) {
        console.error("Error in setpassword:", error);
        return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
};

const recoverAccount = async (req, res) => {


    try {
        const conectdb = await connectDB();
        const {mobile} = req.body;
        const newUser = await User.findOne({ mobile: mobile });


    } catch (error) {
        
    }
}



const regipage = (req, res) =>{
    res.render('register');
};

const verifyotp = (req, res) =>{
    res.render('otp');
};

const passpage = (req, res) =>{
    res.render('setpassword');
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
 
const login = async (req, res) => {
    try {
        const { mobile, password } = req.body;

        // Find the user
        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = await user.generateAuthToken();
        
        // Set cookie with token
        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 1000000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Set session
        req.session.user = {
            id: user._id,
            mobile: user.mobile
        };

        // Send success response
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                mobile: user.mobile,
                fullname: user.fullname,
                balance: user.balance[0]?.pending || 0
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Error logging in: " + error.message });
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

        // Referral Earnings Logic
        if (user.referredBy) {
            const referrer = await User.findOne({ referralCode: user.referredBy });
            if (referrer) {
                const referralBonus = amount * 0.3; // 30% Referral Bonus
                referrer.referralEarnings += referralBonus;
                referrer.balance[0].pending += referralBonus;
                await referrer.save();
            }
        }

        return res.status(200).json({ 
            success: true,
            message: "Deposit Request Submitted Successfully!",
            deposit: {
                amount,
                bonus,
                transactionId,
                status: "Pending"
            }
        });

    } catch (error) {
        console.error("Deposit Error:", error);
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

        const availableBalance = user.balance[0].pending;

        if (amount > availableBalance) {
            return res.status(400).json({ message: "Insufficient Balance" });
        }

        // Deduct Withdraw Amount from Pending Balance
        user.balance[0].pending -= amount;

        // Store Withdrawal Request in Database
        user.banking.withdrawals.push({ 
            date: new Date(),
            amount, 
            status: "Pending" 
        });

        await user.save();

        return res.status(200).json({ 
            success: true,
            message: "Withdrawal Request Submitted Successfully",
            withdrawal: {
                amount,
                status: "Pending"
            }
        });

    } catch (error) {
        console.error("Withdrawal Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const placeBet = async (req, res) => {
    try {
        const { userId, betAmount, betNumber } = req.body;

        if (!userId || !betAmount || !Array.isArray(betNumber) || betNumber.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid bet details" });
        }

        if (!global.currentGameId) {
            return res.status(400).json({ success: false, message: "No active game available" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check balance
        if (user.balance[0].pending < betAmount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        // Deduct bet amount from user's balance
        user.balance[0].pending -= betAmount;
        await user.save();

        // Create new bet
        const newBet = new Bet({
            userId,
            betAmount,
            betNumber,
            gameId: global.currentGameId,
            status: "pending"
        });

        await newBet.save();

        return res.status(200).json({
            success: true,
            message: "Bet placed successfully",
            bet: newBet
        });

    } catch (error) {
        console.error("Error placing bet:", error);
        return res.status(500).json({ success: false, message: "Error placing bet" });
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

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.balance.length > 0) {
            user.balance[0].pending = newBalance;
        } else {
            user.balance.push({ pending: newBalance, bonus: 0 });
        }

        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: "Balance updated successfully",
            newBalance 
        });

    } catch (error) {
        console.error("Error updating balance:", error);
        return res.status(500).json({ success: false, message: "Error updating balance" });
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

        // Fetch latest 10 results
        const latestResults = await Result.find({})
            .sort({ createdAt: -1 })
            .limit(10);

        // Emit real-time update to clients
        req.app.get("io").emit("newResult", latestResults);

        return res.status(200).json({ 
            success: true, 
            message: "Result added successfully",
            result: newResult
        });

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
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                mobile: user.mobile,
                fullname: user.fullname,
                balance: user.balance[0]?.pending || 0,
                referralCode: user.referralCode,
                referredUsers: user.referredUsers?.length || 0,
                referralEarnings: user.referralEarnings || 0
            }
        });
    } catch (error) {
        console.error("Error in getCurrentUser:", error);
        res.status(401).json({ success: false, message: "Please login first" });
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

        return res.status(200).json({ 
            success: true,
            message: "Bank details updated successfully!",
            banking: {
                bankName: user.banking.bankName,
                accountNumber: user.banking.accountNumber,
                ifsc: user.banking.ifsc
            }
        });

    } catch (error) {
        console.error("Error updating bank details:", error);
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

        return res.status(200).json({ 
            success: true,
            message: "UPI ID updated successfully!",
            banking: {
                upiId: user.banking.upiId
            }
        });

    } catch (error) {
        console.error("Error updating UPI ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = {regipage,loginpage, sendOtp, verifyotp, passpage, setpassword, alluser, login, userAuth, dashboard, logout, logoutAll, updateBalance, placeBet, getUserBets, getResults,getCurrentUser,depositMoney, deposit,deposit2,withdrawMoney,updateBankDetails, updateUpiDetails,forgate, addNewResult  };


