require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // 🔹 Unique Referral Code Generator

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // ✅ 6-character code
}


const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    recoveryKeys: { type: String, required: true, unique: true },
    // otpExpiration: { type: Date, default: Date.now },
    verify: { type: Boolean, default: false },
    // Make password required only when user is verified
    password: { 
        type: String, 
        required: function() { 
            return this.verify === true; // Password is required only for verified users
        },
        validate: {
            validator: function(value) {
                return !this.verify || (value && value.length >= 6);
            },
            message: "Password must be at least 6 characters long for verified users."
        }
    },
    role: { type: String, enum: ["user", "admin"], default: "user" }, // ✅ Role Field Added
    // 🔹 **Referral System Fields**
    // referralCode: { type: String, unique: true }, // Every user gets a unique code
    referralCode: { type: String, unique: true, default: function () { return generateReferralCode(); } },

    referredBy: { type: String, default: null }, // Stores referrer's referralCode
    referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users referred by this user
    referralEarnings: { type: Number, default: 0 }, // Total Earnings from referrals

    // विथड्रॉ लिमिट ट्रैकिंग के लिए फील्ड्स
    withdrawLimitCrossed: { type: Boolean, default: false }, // क्या यूजर ने अपनी पहली विथड्रॉ लिमिट क्रॉस कर ली है
    qualifiedReferralsBeforeLimitCross: { type: Number, default: 0 }, // विथड्रॉ लिमिट क्रॉस करने से पहले कितने क्वालिफाइड रेफरल्स थे
    nextWithdrawPhase: { type: Number, default: 1 }, // विथड्रॉ फेज (1, 2, 3 आदि) - रेफरल्स के आधार पर बढ़ता है
    nextWithdrawUnlockDate: { type: Date }, // अगला विथड्रॉ कब अनलॉक होगा (वेलकम बोनस यूजर्स के लिए)
    referralBonusWithdrawals: { type: Number, default: 0 }, // रेफरल बोनस से किए गए विथड्रॉ की संख्या

    // Admin balance history to track balance changes made by admins
    adminBalanceHistory: [{
        amount: { type: Number, required: true },
        operation: { type: String, enum: ["add", "subtract", "set"], required: true },
        previousBalance: { type: Number, required: true },
        newBalance: { type: Number, required: true },
        reason: { type: String },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now }
    }],

    tokens: [{ token: { type: String, required: true } }],
    banking: {
        bankName: String,
        accountNumber: String,
        ifsc: String,
        upiId: String,
        paytmNumber: String,
        // Payment method history to track changes
        paymentMethodHistory: [{
            type: { type: String, enum: ["bank", "upi", "paytm"] },
            details: {
                bankName: String,
                accountNumber: String,
                ifsc: String,
                upiId: String,
                paytmNumber: String
            },
            updatedAt: { type: Date, default: Date.now }
        }],
        deposits: [{ 
            date: { type: Date, default: Date.now },
            amount: Number,
            bonus: Number,
            transactionId: String,
            screenshot: String,
            status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
            referralBonusPending: {
                amount: Number,
                referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
            }
        }],
        withdrawals: [{ 
            date: { type: Date, default: Date.now },
            amount: Number,
            status: { type: String, enum: ["Pending", "Approved", "Rejected", "Paid"], default: "Pending" },
            paymentMethod: { type: String, enum: ["bank", "upi", "paytm"] },
            paymentDetails: {
                bankName: String,
                accountNumber: String,
                ifsc: String,
                upiId: String,
                paytmNumber: String
            }
        }]
    },
    
    balance: {
        type: [{ pending: Number, bonus: Number }],
        default: [{ pending: 0, bonus: 0 }]
    },
    history: [{
        time: { type: Date, default: Date.now },
        betId: { type: mongoose.Schema.Types.ObjectId, ref: "Bet" },
        gameId: { type: String },
        betNumber: [{ type: Number }],
        betAmount: { type: Number },
        resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
        result: { type: String, default: "Pending" },
        winAmount: { type: Number, default: 0 },
        lossAmount: { type: Number, default: 0 },
        multiplier: { type: String, default: "wait" },  // ✅ Overall multiplier
        multipliers: [{ type: String }]  // ✅ Individual multipliers for each bet number
    }],
    
    adminNotified: { type: Boolean, default: false },
    multipleAccountsIP: { type: Boolean, default: false },
    ipAddress: { type: String },
});

userSchema.pre("save", function (next) {
    // Only validate password for verified users
    if (this.verify && (!this.password || this.password.length < 6)) {
        return next(new Error("Password must be at least 6 characters long."));
    }
    if (!this.referralCode) {
        this.referralCode = generateReferralCode();
    }
    // if (this.balance.length === 0) {
    //     this.balance.push({ pending: 0, bonus: 0 });
    // }
    next();
});
// ✅ **JWT Token Generate Method**
userSchema.methods.generateAuthToken = async function () {
    

    try {
        const token = jwt.sign({ _id: this._id.toString(), role: this.role }, process.env.JWT_SECRET);
        this.tokens.push({ token });
        await this.save();
        return token;
    } catch (error) {
        throw new Error(error);
    }
};

// Create and export the User model
const User = mongoose.model('User', userSchema);
module.exports = User;

// Export the helper functions so they can be used in other files
module.exports.generateReferralCode = generateReferralCode;
