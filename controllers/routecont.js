require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const User = require('../models/user');
const { generateWelcomeBonus, generateReferralCode } = require('../models/user');
const Bet = require('../models/bet');
const Result = require('../models/result');
const mongoose = require("mongoose");


const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const connectDB = require('../config/db');
const otpGenerator = require('otp-generator');
const {otpVerify} = require('./verifyOtp');
const { v4: uuidv4 } = require('uuid'); // uuidv4 जेनरेटर इम्पोर्ट


// मोबाइल नंबर नॉर्मलाइजेशन सहायक फ़ंक्शन
const normalizeMobile = (mobile) => {
    if (!mobile) return mobile;
   
    // सभी स्पेस हटाएं
    let normalizedNumber = mobile.replace(/\s+/g, '');
   
    // अगर पहले से दोहरे +91+91 हैं तो एक हटाएं
    if (normalizedNumber.startsWith('+91+91')) {
        normalizedNumber = normalizedNumber.substring(3);
    }
   
    // शुरुआत में 0 या 91 को हटाएं अगर वे हैं
    if (normalizedNumber.startsWith('091')) {
        normalizedNumber = normalizedNumber.substring(3);
    } else if (normalizedNumber.startsWith('91')) {
        normalizedNumber = normalizedNumber.substring(2);
    } else if (normalizedNumber.startsWith('0')) {
        normalizedNumber = normalizedNumber.substring(1);
    }
   
    // अगर नंबर में "+91" पहले से है तो रहने दें, नहीं तो जोड़ें
    if (!normalizedNumber.startsWith('+91')) {
        // अगर नंबर 10 अंकों का है तो +91 जोड़ें
        if (/^\d{10}$/.test(normalizedNumber)) {
            normalizedNumber = '+91' + normalizedNumber;
        }
    }
   
    return normalizedNumber;
};


const sendOtp = async(req, res) =>{


    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
   
    try {
        await connectDB();
        const {fullname, mobile, referralCode } = req.body;
       
        // मोबाइल नंबर को नॉर्मलाइज़ करें
        const normalizedMobile = normalizeMobile(mobile);
       
        const recoveryKeys = otpGenerator.generate(6, {upperCaseAlphabets: true, specialChars:false, lowerCaseAlphabets:false});
       
        // Check if user already exists with verified status
        console.log("Finding user with mobile:", normalizedMobile);
        console.log("User model type:", typeof User);
        console.log("User model methods:", Object.keys(User));
       
        const existingUser = await User.findOne({ mobile: normalizedMobile });
       
        console.log("Existing user check result:", existingUser);
       
        if (existingUser && existingUser.verify) {
            return res.status(400).json({
                success: false,
                msg: "इस मोबाइल नंबर से एक खाता पहले से मौजूद है। कृपया लॉगिन करें।"
            });
        }
       
        // Create or update user without setting password yet
        const newUser = await User.findOneAndUpdate(
            {mobile: normalizedMobile},
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
        req.session.mobile = normalizedMobile;
        req.session.fullname = fullname;
        req.session.referralCode = referralCode;
       
        console.log("User created/updated:", newUser);
        console.log("Recovery key generated:", recoveryKeys);


        // Render OTP page with recovery key
        return res.status(201).render('otp', {
            recoveryKeys,
            mobile: normalizedMobile,
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
       
        // मोबाइल नंबर को नॉर्मलाइज़ करें
        const normalizedMobile = normalizeMobile(mobile);
       
        console.log("Verifying recovery key:", { mobile: normalizedMobile, recoveryKey: keyToCheck });
       
        // मूल नंबर के साथ खोजें
        let user = await User.findOne({ mobile: normalizedMobile, recoveryKeys: keyToCheck });
       
        // अगर नहीं मिला और +91 है, तो बिना +91 के खोजें
        if (!user && normalizedMobile.startsWith('+91')) {
            const mobileWithout91 = normalizedMobile.substring(3);
            user = await User.findOne({ mobile: mobileWithout91, recoveryKeys: keyToCheck });
           
            // मिल गया तो मोबाइल नंबर अपडेट करें
            if (user) {
                console.log(`रिकवरी की वेरिफिकेशन के दौरान मोबाइल नंबर अपडेट: ${user.mobile} -> ${normalizedMobile}`);
                user.mobile = normalizedMobile;
                await user.save();
            }
        }
       
        // अगर अभी भी नहीं मिला और बिना +91 का है, तो +91 के साथ खोजें
        if (!user && !normalizedMobile.startsWith('+91')) {
            const mobileWith91 = '+91' + normalizedMobile;
            user = await User.findOne({ mobile: mobileWith91, recoveryKeys: keyToCheck });
        }
       
        if (!user) {
            return res.status(400).json({
                success: false,
                msg: "अमान्य मोबाइल नंबर या रिकवरी की।"
            });
        }
       
        // Store in session that recovery key was verified
        req.session.isRecoveryVerified = true;
        req.session.mobile = normalizedMobile;
       
        // Redirect to password setup page
        return res.render('setpassword', { mobile: normalizedMobile });
       
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
        let userMobile = mobile || req.session.mobile;
       
        if (!userMobile) {
            return res.status(400).json({
                success: false,
                msg: "सेशन समाप्त हो गया है या मोबाइल नंबर प्रदान नहीं किया गया है। कृपया फिर से रजिस्ट्रेशन शुरू करें।"
            });
        }
       
        // मोबाइल नंबर को नॉर्मलाइज़ करें
        userMobile = normalizeMobile(userMobile);
       
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


        // Generate welcome bonus (50-100 rupees)
        const welcomeBonusAmount = generateWelcomeBonus();
        user.welcomeBonus = {
            amount: welcomeBonusAmount,
            bettingProgress: 0,
            unlocked: false
        };
        
        // Add welcome bonus to user's balance
        if (user.balance.length === 0) {
            user.balance.push({ pending: welcomeBonusAmount, bonus: 0 });
        } else {
            user.balance[0].pending += welcomeBonusAmount;
        }
        
        // Hash password
        user.password = await bcrypt.hash(password, 12);
        user.verify = true; // Mark user as verified
       
        // Save user first before generating token
        await user.save();
        console.log("User saved with password and welcome bonus of ₹" + welcomeBonusAmount);


        // Generate token and set cookie AFTER successful save and password verification
        const token = await user.generateAuthToken();
        res.cookie("jwt", token, { expires: new Date(Date.now() + 1000000), httpOnly: true });


        // Handle referral logic
        if (user.referredBy) {
            const referrer = await User.findOne({ referralCode: user.referredBy });
            if (referrer) {
                // Avoid duplicate referrals
                if (!referrer.referredUsers.includes(user._id)) {
                    referrer.referredUsers.push(user._id);
                }
                // Add pending welcome bonus for referrer
                referrer.referralWelcomeBonuses = referrer.referralWelcomeBonuses || [];
                referrer.referralWelcomeBonuses.push({
                    referredUserId: user._id,
                    amount: welcomeBonusAmount,
                    isClaimed: false,
                    depositApproved: false
                });
                await referrer.save();
                console.log(`✅ Referral Success: ${user.fullname} referred by ${referrer.fullname} (Bonus: ₹${welcomeBonusAmount})`);
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
       
        // मोबाइल नंबर को नॉर्मलाइज़ करें
        const normalizedMobile = normalizeMobile(mobile);
       
        // मूल मोबाइल नंबर से खोजें
        let user = await User.findOne({ mobile: normalizedMobile });
       
        // अगर उपयोगकर्ता नहीं मिला, तो बिना +91 के भी ढूंढें
        if (!user && normalizedMobile.startsWith('+91')) {
            const mobileWithout91 = normalizedMobile.substring(3);
            user = await User.findOne({ mobile: mobileWithout91 });
           
            // मिल गया तो मोबाइल नंबर अपडेट करें
            if (user) {
                console.log(`रिकवरी के दौरान मोबाइल नंबर अपडेट: ${user.mobile} -> ${normalizedMobile}`);
                user.mobile = normalizedMobile;
                await user.save();
            }
        }
       
        // अगर अभी भी नहीं मिला और +91 नहीं है, तो +91 के साथ ढूंढें
        if (!user && !normalizedMobile.startsWith('+91')) {
            const mobileWith91 = '+91' + normalizedMobile;
            user = await User.findOne({ mobile: mobileWith91 });
        }
       
        if (!user) {
            return res.status(404).json({ success: false, msg: "इस मोबाइल नंबर से कोई खाता नहीं मिला।" });
        }
       
        // Store mobile in session
        req.session.mobile = normalizedMobile;
       
        return res.render('recoveryKey', { mobile: normalizedMobile });
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


        // मोबाइल नंबर को नॉर्मलाइज़ करें
        const normalizedMobile = normalizeMobile(mobile);


        // Find the user
        let user = await User.findOne({ mobile: normalizedMobile });
       
        // अगर उपयोगकर्ता नहीं मिला, तो बिना +91 के भी ढूंढें
        if (!user && normalizedMobile.startsWith('+91')) {
            const mobileWithout91 = normalizedMobile.substring(3);
            user = await User.findOne({ mobile: mobileWithout91 });
           
            // मिल गया तो मोबाइल नंबर अपडेट करें
            if (user) {
                console.log(`मोबाइल नंबर अपडेट: ${user.mobile} -> ${normalizedMobile}`);
                user.mobile = normalizedMobile;
                await user.save();
            }
        }
       
        // अगर अभी भी नहीं मिला और +91 नहीं है, तो +91 के साथ ढूंढें
        if (!user && !normalizedMobile.startsWith('+91')) {
            const mobileWith91 = '+91' + normalizedMobile;
            user = await User.findOne({ mobile: mobileWith91 });
        }


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
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours,
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


// ✅ Deposit Money Function
const depositMoney = async (req, res) => {
    try {
        // Extract token and verify user
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please login first to deposit"
            });
        }


        // Decode token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id;


        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        // Extract data from request
        const { amount, transactionId } = req.body;
       
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid amount"
            });
        }


        // Generate a unique deposit ID
        const depositId = uuidv4();
       
        // Calculate bonus (40% for all deposits)
        const bonus = Math.round(amount * 0.4);


        // ✅ Add deposit to user record
        user.banking.deposits.push({
            date: new Date(),
            amount: Number(amount),
            bonus: bonus,
            transactionId: transactionId,
            screenshot: req.file ? req.file.filename : "",
            status: "Pending" // Admin needs to approve
        });


        // Mark that user has made a deposit (for welcome bonus withdrawal rules)
        if (user.welcomeBonus) {
            user.welcomeBonus.hasDeposited = true;
            console.log(`User ${user.fullname} has made a deposit of ₹${amount}, now eligible for unlimited withdrawals`);
        }

        // ✅ Check if this is user's first deposit and process referral bonus
        const isFirstDeposit = user.banking.deposits.length === 1;

        if (isFirstDeposit && user.referredBy ) {
            // Find the referrer using referralCode
            const referrer = await User.findOne({ referralCode: user.referredBy });
           
            if (referrer) {
                // Add referral bonus to deposit object as pending
                const referralBonus = Math.floor(amount * 0.3); // 30% of deposit amount
                user.banking.deposits[user.banking.deposits.length - 1].referralBonusPending = {
                    amount: referralBonus,
                    referrerId: referrer._id
                };
                // Don't add to referrer balance yet!
                // Make sure the user is in referrer's referredUsers array
                if (!referrer.referredUsers.includes(user._id)) {
                    referrer.referredUsers.push(user._id);
                    await referrer.save();
                }
            }
        }
       
        await user.save();
       
        return res.json({
            success: true,
            message: "Your deposit request has been submitted successfully. Our team will process it soon.",
            depositId: depositId,
            details: {
                amount: Number(amount),
                bonus: bonus,
                total: Number(amount) + bonus,
                status: "Pending"
            }
        });
       
    } catch (error) {
        console.error("Error in depositMoney:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
};




const withdrawMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "यूजर नहीं मिला"
            });
        }

        if (amount < 1) {
            return res.status(400).json({
                message: "न्यूनतम विथड्रॉ राशि 1 INR है"
            });
        }

        if (amount > user.balance[0].pending) {
            return res.status(400).json({
                message: "अपर्याप्त बैलेंस"
            });
        }

        // Welcome bonus withdrawal logic
        if (user.welcomeBonus && user.welcomeBonus.amount > 0) {
            const totalBetsPlaced = user.welcomeBonus.totalBetsPlaced || 0;
            const welcomeBonusAmount = user.welcomeBonus.amount;
            const isUnlocked = user.welcomeBonus.unlocked;
            const pendingWithdrawals = user.welcomeBonus.pendingWithdrawalsFromBonus || 0;
            const pendingWelcomeBonus = welcomeBonusAmount - user.welcomeBonus.totalWithdrawnFromBonus;
            
            // After 20 bets, allow withdrawal of winning amount + welcome bonus
            if (isUnlocked && totalBetsPlaced >= 20) {
                // Check weekly withdrawal limit
                if (user.welcomeBonus.lastWinningWithdrawalDate) {
                    const lastWithdrawal = new Date(user.welcomeBonus.lastWinningWithdrawalDate);
                    const now = new Date();
                    const daysSinceLastWithdrawal = Math.floor((now - lastWithdrawal) / (1000 * 60 * 60 * 24));
                    
                    if (daysSinceLastWithdrawal < 7) {
                        return res.status(400).json({
                            message: `आप अगला विथड्रॉ ${7 - daysSinceLastWithdrawal} दिन बाद कर सकते हैं`
                        });
                    }
                }

                // Calculate maximum withdrawal limit
                const maxWinningWithdrawal = 149;
                const availableForWithdraw = isUnlocked ? welcomeBonusAmount : Math.floor(welcomeBonusAmount * 0.3);

                const remainingWithdraw = availableForWithdraw - pendingWithdrawals;
                // const maxTotalWithdrawal = maxWinningWithdrawal + pendingWelcomeBonus;
                const maxTotalWithdrawal = maxWinningWithdrawal + remainingWithdraw;



                if (amount > maxTotalWithdrawal) {
                    return res.status(400).json({
                        // message: `आप अधिकतम ₹${maxTotalWithdrawal} (₹149 विनिंग + ₹${pendingWelcomeBonus} वेलकम बोनस) तक ही विथड्रॉ कर सकते हैं`
                        message: `आप अधिकतम ₹${maxTotalWithdrawal} (₹149 विनिंग + ₹${remainingWithdraw} वेलकम बोनस) तक ही विथड्रॉ कर सकते हैं`

                    });

                }

                // Update withdrawal tracking
                user.welcomeBonus.lastWinningWithdrawalDate = new Date();
                user.welcomeBonus.totalWithdrawnFromBonus += Math.min(amount, pendingWelcomeBonus);
            }
            // Before 20 bets or before unlock, only allow welcome bonus withdrawal
            else {
                const availableForWithdraw = isUnlocked ? welcomeBonusAmount : Math.floor(welcomeBonusAmount * 0.3);
                const remainingWithdraw = availableForWithdraw - pendingWithdrawals;
                
                if (amount > remainingWithdraw) {
                    return res.status(400).json({
                        message: `आप केवल ₹${remainingWithdraw} तक ही विथड्रॉ कर सकते हैं। आपके पास ₹${pendingWithdrawals} की पेंडिंग विथड्रॉ रिक्वेस्ट हैं।`
                    });
                }
                
                user.welcomeBonus.pendingWithdrawalsFromBonus += amount;
            }
        }

        // Create withdrawal request
        const withdrawalRequest = {
            amount,
            status: "Pending",
            date: new Date(),
            isWelcomeBonusWithdrawal: !user.welcomeBonus?.unlocked || user.welcomeBonus?.totalBetsPlaced < 20
        };

        if (!user.banking) {
            user.banking = { withdrawals: [] };
        }
        user.banking.withdrawals.push(withdrawalRequest);

        // Update user balance
        user.balance[0].pending -= amount;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "विथड्रॉ रिक्वेस्ट सफलतापूर्वक सबमिट की गई",
            newBalance: user.balance[0].pending
        });

    } catch (error) {
        console.error("विथड्रॉ रिक्वेस्ट में त्रुटि:", error);
        return res.status(500).json({
            message: "विथड्रॉ रिक्वेस्ट प्रोसेस करने में त्रुटि हुई"
        });
    }
};


const placeBet = async (req, res) => {
    try {
        const { userId, betAmount, betNumber, timeframe = 30 } = req.body;


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
        const currentGameId = global[`currentGameId_${timeframe}`];
        if (!currentGameId) {
            return res.status(400).json({
                success: false,
                message: "वर्तमान में कोई सक्रिय गेम नहीं है, कृपया कुछ सेकंड बाद फिर से प्रयास करें"
            });
        }

        // गेम काउंटडाउन टाइम चेक (बहुत कम समय बचा है तो बेट न लें)
        const countdownTime = global[`countdownTime_${timeframe}`];
        
        // Get betting closes at time based on timeframe
        let bettingClosesAt = 5; // Default for 30 seconds
        if (timeframe === 45) bettingClosesAt = 10;
        else if (timeframe === 60) bettingClosesAt = 15;
        else if (timeframe === 150) bettingClosesAt = 30;
        
        if (countdownTime && countdownTime < bettingClosesAt) {
            return res.status(400).json({
                success: false,
                message: "इस राउंड के लिए बेटिंग समय समाप्त, कृपया अगले राउंड के लिए रुकें"
            });
        }
       
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "यूजर नहीं मिला" });


        // ✅ बैलेंस केवल एक बार घटाएं
        if (user.balance[0].pending >= betAmount) {
            // Check if this is the first bet using welcome bonus
            if (user.welcomeBonus && user.welcomeBonus.amount > 0 && !user.welcomeBonus.initialBalanceUsed && 
                !user.welcomeBonus.hasDeposited && user.balance[0].pending <= user.welcomeBonus.amount) {
                // Mark that user has started using welcome bonus
                user.welcomeBonus.initialBalanceUsed = true;
                console.log(`User ${user.fullname} has started playing with welcome bonus`);
            }
            
            user.balance[0].pending -= betAmount;
            // यहां save करेंगे, दोबारा नहीं
            await user.save();
        } else {
            return res.json({ success: false, message: "अपर्याप्त बैलेंस" });
        }


        // Get user's total bet count for tracking purposes
        const userBetCount = await Bet.countDocuments({ userId: userId });
        
        // Determine if this bet is using welcome bonus funds
        const isWelcomeBonus = user.welcomeBonus && 
                              user.welcomeBonus.initialBalanceUsed && 
                              !user.welcomeBonus.hasDeposited && 
                              user.welcomeBonus.totalBetsPlaced < 20;
        
        // ✅ Ensure gameId is correctly assigned and track welcome bonus usage
        const newBet = new Bet({
            userId,
            gameId: currentGameId,
            betNumber,
            betAmount,
            timeframe, // Add timeframe to the bet
            isWelcomeBonus: isWelcomeBonus,
            betCount: userBetCount + 1 // Increment bet count
        });

        // Use timeout protection for saving bet
        try {
            await Promise.race([
                newBet.save(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("newBet.save timeout")), 5000)
                )
            ]);
            console.log(`✅ Bet #${userBetCount + 1} saved successfully for user ${user.fullname}`);
        } catch (saveError) {
            console.error("❌ Error saving bet:", saveError);
            return res.status(500).json({ success: false, message: "बेट सेव करने में समस्या, कृपया पुनः प्रयास करें" });
        }
        
        // Update welcome bonus betting progress if not already unlocked
        if (user.welcomeBonus && !user.welcomeBonus.unlocked) {
            user.welcomeBonus.bettingProgress += betAmount;
            
            // If betting progress reaches 100 rupees, unlock the bonus
            if (user.welcomeBonus.bettingProgress >= 100) {
                user.welcomeBonus.unlocked = true;
                console.log(`✅ Welcome bonus unlocked for user ${user.fullname}`);
            }
        }
        
        // Track total bets placed for welcome bonus withdrawal requirements
        if (user.welcomeBonus && user.welcomeBonus.amount > 0) {
            user.welcomeBonus.totalBetsPlaced += 1;
            console.log(`User ${user.fullname} has placed ${user.welcomeBonus.totalBetsPlaced} bets out of 20 required`);
        }
        
        await user.save();


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
            // Calculate winnings if balance increased
            const currentBalance = user.balance[0].pending;
            if (newBalance > currentBalance) {
                const winAmount = newBalance - currentBalance;
                
                // If user has welcome bonus and is playing with it, track winnings accordingly
                if (user.welcomeBonus && user.welcomeBonus.amount > 0) {
                    // Check if user is playing with welcome bonus or deposited funds
                    if (user.welcomeBonus.initialBalanceUsed && !user.welcomeBonus.hasDeposited) {
                        // User is playing with welcome bonus
                        user.welcomeBonus.winningsFromBonus += winAmount;
                        
                        // Track locked winnings (until 20 bets are placed)
                        if (user.welcomeBonus.totalBetsPlaced < 20) {
                            user.welcomeBonus.lockedWinnings += winAmount;
                            console.log(`User ${user.fullname} won ₹${winAmount} from welcome bonus. This amount is locked until 20 bets are placed.`);
                        } else {
                            // If 20+ bets placed, add to withdrawable amount
                            user.welcomeBonus.withdrawableAmount += winAmount;
                            console.log(`User ${user.fullname} won ₹${winAmount} from welcome bonus. This amount is withdrawable.`);
                        }
                    } else if (user.welcomeBonus.hasDeposited) {
                        // User has deposited, so winnings are not from welcome bonus
                        console.log(`User ${user.fullname} won ₹${winAmount} from deposited funds. No withdrawal restrictions.`);
                    }
                    
                    await user.save(); // Save the updated winnings tracking
                }
            }
            
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
        
        // Filter bets by userId and result status only (no timeframe filter)
        const bets = await Bet.find({ 
            userId, 
            result: "Pending" // Only filter by pending status
        });
        
        return res.json({ success: true, bets });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const getResults = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const timeframe = parseInt(req.query.timeframe) || 30; // Default to 30 seconds
        const skip = (page - 1) * limit;

        // Filter by timeframe
        const filter = { timeframe };

        const [results, totalResults] = await Promise.all([
            Result.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Result.countDocuments(filter)
        ]);


        const totalPages = Math.ceil(totalResults / limit);


        res.json({
            success: true,
            results,
            currentPage: page,
            totalPages,
            totalResults,
            timeframe
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
        const timeframe = newResult.timeframe || 30; // Default to 30 seconds
        await newResult.save();


        // ✅ Fetch latest 10 results for the specific timeframe
        const latestResults = await Result.find({ timeframe })
            .sort({ createdAt: -1 })
            .limit(10);

        const totalResults = await Result.countDocuments({ timeframe });
        const totalPages = Math.ceil(totalResults / 10);

        // ✅ Emit real-time update to clients with timeframe info
        req.app.get("io").emit("newResult", {
            results: latestResults,
            currentPage: 1,
            totalPages,
            timeframe
        });


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
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Get user's balance
        const balance = user.balance.length > 0 ? user.balance[0] : { pending: 0, withdrawable: 0 };
        
        // Get user's history (last 20 entries) in reverse chronological order
        let history = [];
        if (user.history && user.history.length > 0) {
            // Create a copy of the history array to avoid modifying the original
            history = [...user.history]
                .sort((a, b) => {
                    // Sort by time if available, otherwise use the array order
                    if (a.time && b.time) {
                        return new Date(b.time) - new Date(a.time);
                    }
                    return 0;
                })
                .slice(0, 20);
        }
        
        // Return user data with history
        res.status(200).json({
            success: true,
            userId: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            balance,
            history
        });
    } catch (error) {
        console.error("Error fetching current user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
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


// पुराने मोबाइल नंबरों को ठीक करने के लिए एडमिन फंक्शन
// एक बार चलाने के लिए
const fixMobileNumbers = async (req, res) => {
    try {
        await connectDB();
       
        // सभी उपयोगकर्ताओं को प्राप्त करें
        const users = await User.find({});
        let updatedCount = 0;
        let alreadyCorrectCount = 0;
        let errorCount = 0;
       
        for(const user of users) {
            try {
                // पहले से ही सही फॉर्मेट में है तो छोड़ दें
                if(user.mobile.startsWith('+91') && user.mobile.length === 13) {
                    alreadyCorrectCount++;
                    continue;
                }
               
                // मोबाइल नंबर को नॉर्मलाइज़ करें
                const normalizedMobile = normalizeMobile(user.mobile);
               
                // अगर कोई परिवर्तन हुआ तो अपडेट करें
                if(normalizedMobile !== user.mobile) {
                    console.log(`अपडेट किया गया: ${user.mobile} -> ${normalizedMobile}`);
                    user.mobile = normalizedMobile;
                    await user.save();
                    updatedCount++;
                }
            } catch(err) {
                console.error(`❌ User ID ${user._id} के लिए त्रुटि:`, err);
                errorCount++;
            }
        }
       
        return res.status(200).json({
            success: true,
            message: `सफलतापूर्वक ${updatedCount} उपयोगकर्ताओं के मोबाइल नंबर अपडेट किए गए, ${alreadyCorrectCount} पहले से सही थे, ${errorCount} त्रुटियां हुईं।`,
            updatedCount,
            alreadyCorrectCount,
            errorCount
        });
    } catch (error) {
        console.error("❌ मोबाइल नंबर अपडेट करने में त्रुटि:", error);
        return res.status(500).json({
            success: false,
            message: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।"
        });
    }
};


// Detailed referral information API
const getReferralDetails = async (req, res) => {
    try {
        // Get user ID from JWT token
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "कृपया पहले लॉगिन करें"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id;

        // Get user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "यूजर नहीं मिला"
            });
        }

        // Get detailed information about referred users
        const referredUsersPromises = user.referredUsers.map(async (refUserId) => {
            const refUser = await User.findById(refUserId);
            if (!refUser) return null;

            // Welcome bonus that referred user got
            const welcomeBonus = refUser.welcomeBonus && refUser.welcomeBonus.amount ? refUser.welcomeBonus.amount : 0;

            // First deposit (if any)
            let depositAmount = 0;
            let depositStatus = 'Pending';
            let yourBonus = 0;
            if (refUser.banking && refUser.banking.deposits && refUser.banking.deposits.length > 0) {
                // Find first deposit
                const firstDeposit = refUser.banking.deposits[0];
                if (firstDeposit) {
                    depositAmount = firstDeposit.amount || 0;
                    depositStatus = firstDeposit.status || 'Pending';
                    // Your bonus for deposit (assume 10% for now, update if logic changes)
                    yourBonus += Math.floor(depositAmount * 0.3);
                }
            }
            // Your bonus for welcome (same as referred user's welcome bonus)
            // yourBonus += welcomeBonus;
            console.log(yourBonus)
            // yourBonus;


            // Status logic
            let status = 'Pending';
            if (depositStatus === 'Approved') status = 'Active';
            else if (depositStatus === 'Rejected') status = 'Rejected';
            else if (depositStatus === 'Pending') status = 'Processing';

            return {
                fullname: refUser.fullname,
                welcomeBonus,
                depositAmount,
                yourBonus,
                status
            };
        });

        const referredUsers = (await Promise.all(referredUsersPromises)).filter(user => user !== null);
        // Sort by most recent
        referredUsers.sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({
            success: true,
            referredUsers
        });
    } catch (error) {
        console.error("रेफरल डेटा प्राप्त करने में त्रुटि:", error);
        res.status(500).json({
            success: false,
            error: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।"
        });
    }
};


// फिक्स रिफरल्स फंक्शन - अडमिन एंडपॉइंट के लिए
const fixReferredUsers = async (req, res) => {
    try {
        // सभी यूजर्स जिनके पास रेफरल कोड है
        const allUsers = await User.find({});
        const usersWithReferralCode = await User.find({ referralCode: { $exists: true } });
       
        let updatedCount = 0;
        let alreadyLinkedCount = 0;
        let missingReferrerCount = 0;
        let errorCount = 0;
       
        console.log(`कुल यूजर्स: ${allUsers.length}, रेफरल कोड वाले यूजर्स: ${usersWithReferralCode.length}`);
       
        // हर यूजर के लिए जिसने रेफर किया है
        for (const user of allUsers) {
            if (user.referredBy) {
                try {
                    // रेफरर को खोजें
                    const referrer = await User.findOne({ referralCode: user.referredBy });
                   
                    if (referrer) {
                        // चेक करें कि क्या यूजर पहले से referredUsers में है
                        const isAlreadyReferred = referrer.referredUsers.some(id => id.toString() === user._id.toString());
                       
                        if (!isAlreadyReferred) {
                            // यूजर को रेफरर के referredUsers में जोड़ें
                            referrer.referredUsers.push(user._id);
                            await referrer.save();
                            updatedCount++;
                            console.log(`${user.fullname} को ${referrer.fullname} के रेफरल्स में जोड़ा गया`);
                        } else {
                            alreadyLinkedCount++;
                        }
                    } else {
                        missingReferrerCount++;
                        console.log(`${user.fullname} के रेफरर का रेफरल कोड ${user.referredBy} नहीं मिला`);
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`यूजर आईडी ${user._id} प्रोसेस करने में एरर:`, err);
                }
            }
        }
       
        // सांख्यिकी रिपोर्ट करें
        return res.status(200).json({
            success: true,
            message: "रेफरल डेटा फिक्स किया गया",
            stats: {
                totalUsers: allUsers.length,
                usersWithReferralCode: usersWithReferralCode.length,
                updatedReferrals: updatedCount,
                alreadyLinkedReferrals: alreadyLinkedCount,
                missingReferrers: missingReferrerCount,
                errors: errorCount
            }
        });
    } catch (error) {
        console.error("फिक्स रेफरल्स में त्रुटि:", error);
        return res.status(500).json({
            success: false,
            message: "सर्वर त्रुटि",
            error: error.message
        });
    }
};

// ✅ Referral Leaderboard API
const referralLeaderboard = async (req, res) => {
    try {
        // Check auth
        if (!req.user) {
            return res.status(401).json({ message: "उपयोगकर्ता प्रमाणित नहीं है" });
        }

        // Find users with most referrals
        const topReferrers = await User.find({})
            .select("fullname referralCode referredUsers referralEarnings")
            .sort({ referralEarnings: -1 })
            .limit(20)
            .lean();

        // Map data with minimized sensitive info
        const leaderboard = topReferrers.map((user, index) => {
            return {
                rank: index + 1,
                name: user.fullname.charAt(0) + "*".repeat(Math.max(3, user.fullname.length - 2)) + user.fullname.charAt(user.fullname.length - 1),
                referralCode: user.referralCode,
                referredCount: user.referredUsers.length,
                earnings: user.referralEarnings || 0,
                isCurrentUser: req.user._id.toString() === user._id.toString()
            };
        });

        console.log("✅ Returning leaderboard data:", { success: true, leaderboard: leaderboard.slice(0, 3) }); // Log sample data
        return res.json({ success: true, leaderboard });
    } catch (error) {
        console.error("Error fetching referral leaderboard:", error);
        return res.status(500).json({
            success: false,
            message: "सर्वर त्रुटि. कृपया बाद में पुनः प्रयास करें."
        });
    }
};

// ✅ Cancel Withdraw Request
const cancelWithdraw = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "उपयोगकर्ता प्रमाणित नहीं है" });
        }

        const withdrawalId = req.params.id;
        if (!withdrawalId) {
            return res.status(400).json({ success: false, message: "विथड्रॉ आईडी अनुपलब्ध है" });
        }

        // यूजर ढूंढें
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "उपयोगकर्ता नहीं मिला" });
        }

        // विथड्रॉल ढूंढें
        if (!user.banking || !user.banking.withdrawals || !user.banking.withdrawals[withdrawalId]) {
            return res.status(404).json({ success: false, message: "विथड्रॉ रिक्वेस्ट नहीं मिली" });
        }

        const withdrawal = user.banking.withdrawals[withdrawalId];
        
        // केवल पेंडिंग विथड्रॉल्स को कैंसिल किया जा सकता है
        if (withdrawal.status !== "Pending") {
            return res.status(400).json({ 
                success: false, 
                message: "केवल पेंडिंग विथड्रॉ रिक्वेस्ट्स को कैंसिल किया जा सकता है" 
            });
        }

        // विथड्रॉ अमाउंट सेव करें और फिर रिक्वेस्ट हटाएं
        const withdrawAmount = withdrawal.amount;

        // If this was a welcome bonus withdrawal, update the pending withdrawals
        if (user.welcomeBonus && withdrawal.isWelcomeBonusWithdrawal) {
            user.welcomeBonus.pendingWithdrawalsFromBonus = Math.max(
                0, 
                (user.welcomeBonus.pendingWithdrawalsFromBonus || 0) - withdrawAmount
            );
            console.log(`Updated pending welcome bonus withdrawals: ${user.welcomeBonus.pendingWithdrawalsFromBonus}`);
        }

        // यूजर के बैलेंस में विथड्रॉ अमाउंट वापस जोड़ें
        user.balance[0].pending += withdrawAmount;

        // विथड्रॉल रिक्वेस्ट की एरे से रिमूव करें
        user.banking.withdrawals.splice(withdrawalId, 1);

        await user.save();

        return res.status(200).json({
            success: true,
            message: "विथड्रॉ रिक्वेस्ट सफलतापूर्वक कैंसिल कर दी गई है",
            amount: withdrawAmount
        });
    } catch (error) {
        console.error("❌ Cancel Withdraw Error:", error);
        return res.status(500).json({ success: false, message: "सर्वर में त्रुटि हो गई है" });
    }
};

// ✅ **Fix Existing Referral Welcome Bonuses**
const fixExistingReferralBonuses = async (req, res) => {
    try {
        console.log("🔧 Starting to fix existing referral welcome bonuses...");
        
        // Find all users who were referred but don't have referralWelcomeBonuses
        const referredUsers = await User.find({ 
            referredBy: { $exists: true, $ne: null },
            referralWelcomeBonuses: { $size: 0 }
        });
        
        console.log(`Found ${referredUsers.length} users without referral welcome bonuses`);
        
        let fixedCount = 0;
        
        for (const user of referredUsers) {
            try {
                // Find their referrer
                const referrer = await User.findOne({ referralCode: user.referredBy });
                
                if (referrer) {
                    // Get user's welcome bonus amount
                    const welcomeBonusAmount = user.welcomeBonus?.amount || 50; // Default to 50 if not found
                    
                    // Add pending welcome bonus for referrer
                    referrer.referralWelcomeBonuses = referrer.referralWelcomeBonuses || [];
                    
                    // Check if this bonus already exists
                    const existingBonus = referrer.referralWelcomeBonuses.find(b => 
                        b.referredUserId.toString() === user._id.toString()
                    );
                    
                    if (!existingBonus) {
                        referrer.referralWelcomeBonuses.push({
                            referredUserId: user._id,
                            amount: welcomeBonusAmount,
                            isClaimed: false,
                            depositApproved: false
                        });
                        
                        await referrer.save();
                        fixedCount++;
                        console.log(`✅ Fixed referral bonus for ${user.fullname} -> ${referrer.fullname} (₹${welcomeBonusAmount})`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error fixing bonus for user ${user.fullname}:`, error);
            }
        }
        
        console.log(`🎉 Fixed ${fixedCount} referral welcome bonuses`);
        
        return res.status(200).json({
            success: true,
            message: `Fixed ${fixedCount} referral welcome bonuses`,
            fixedCount
        });
        
    } catch (error) {
        console.error("❌ Error in fixExistingReferralBonuses:", error);
        return res.status(500).json({
            success: false,
            message: "Error fixing referral bonuses"
        });
    }
};

module.exports = {regipage,loginpage, sendOtp, verifyotp, passpage, setpassword, alluser, login, userAuth, dashboard, logout, logoutAll, updateBalance, placeBet, getUserBets, getResults,getCurrentUser,depositMoney, deposit,deposit2,withdrawMoney,updateBankDetails, updateUpiDetails,forgate, addNewResult, verifyRecoveryKey, recoverAccount, fixMobileNumbers, getReferralDetails, fixReferredUsers, referralLeaderboard, cancelWithdraw, fixExistingReferralBonuses};











