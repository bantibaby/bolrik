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
        const newUser = await User.findOne({ mobile: req.session.mobile });

        if (!newUser) {
            return res.status(400).json({ success: false, msg: "User nahi mila." });
        }

        // ✅ **Agar referral code already set nahi hai, to generate karein**
        if (!newUser.referralCode) {
            newUser.referralCode = generateReferralCode();
        }

        // ✅ **Password hash karein**
        newUser.password = await bcrypt.hash(password, 12);
        newUser.verify = true; // Mark user as verified

        // ✅ **Token generate karein & Cookie set karein**
        const token = await newUser.generateAuthToken();
        res.cookie("jwt", token, { expires: new Date(Date.now() + 1000000), httpOnly: true });

        // ✅ **Database me update karein**
        await newUser.save();

        // ✅ **Referral System: Referred User Count & Earnings Update**
        if (req.session.referralCode) {
            const referrer = await User.findOne({ referralCode: req.session.referralCode });
            if (referrer) {
                referrer.referredUsers.push(newUser._id);
                await referrer.save();
                console.log(`✅ Referral Success: ${newUser.fullname} referred by ${referrer.fullname}`);
            }
        }

        return res.status(201).render("login");

    } catch (error) {
        console.error("❌ Error in setpassword:", error);
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
 
const login = async (req, res)=>{
    try {
        const { mobile, password } = req.body;

        // Find the user
        const user = await User.findOne({ mobile });

        if (!user) {
            return res.status(404).send('User not found!');
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        // generate jwt token for login page
        const token = await user.generateAuthToken();
        // console.log(this is a token for login page:${token})
        // Store token into cookie
        res.cookie('jwt', token, {
            expires:new Date(Date.now() + 1000000),
            httpOnly:true
        });
        if (!isMatch) {
            return res.status(400).send('Invalid credentials'); 
        }
        req.session.user = {
            id: user._id,
            mobile: user.mobile
          };
        
      return res.render('userprofile', { user });

    } catch (error) {
        res.status(400).send('Error logging in: ' + error.message);
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

        if (!userId || !betAmount || !Array.isArray(betNumber) || betNumber.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid bet details" });
        }

        if (!global.currentGameId) {
            return res.status(400).json({ success: false, message: "No active game available" });
        }

        
        const user = await User.findById(userId);
if (!user) return res.status(404).json({ success: false, message: "User not found" });

// ✅ बैलेंस केवल एक बार घटाएं
if (user.balance[0].pending >= betAmount) {
    user.balance[0].pending -= betAmount;
    await user.save();
} else {
    return res.json({ success: false, message: "Insufficient balance" });
}

        await user.save();

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
            message: "Bet placed successfully!", 
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
        return res.status(500).json({ success: false, message: "Server error!" });
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
            return res.status(401).json({ error: "Please login first" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // यूजर की जानकारी भेजें
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                mobile: user.mobile,
                fullname: user.fullname,
                balance: user.balance[0].pending
            }
        });
    } catch (error) {
        console.error("Error in getCurrentUser:", error);
        res.status(401).json({ error: "Please login first" });
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


module.exports = {regipage,loginpage, sendOtp, verifyotp, passpage, setpassword, alluser, login, userAuth, dashboard, logout, logoutAll, updateBalance, placeBet, getUserBets, getResults,getCurrentUser,depositMoney, deposit,deposit2,withdrawMoney,updateBankDetails, updateUpiDetails,forgate, addNewResult  };


