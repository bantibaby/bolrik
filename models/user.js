require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // 🔹 Unique Referral Code Generator

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // ✅ 6-character code
}

// रैंडम वेलकम बोनस जनरेट करने का फंक्शन (50-100 रुपये के बीच)
function generateWelcomeBonus() {
    return Math.floor(Math.random() * 51) + 50; // 50 से 100 के बीच
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

    tokens: [{ token: { type: String, required: true } }],
    banking: {
        bankName: String,
        accountNumber: String,
        ifsc: String,
        upiId: String,
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
            status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
        }]
    },
    
    // वेलकम बोनस के लिए नए फील्ड्स
    welcomeBonus: {
        amount: { type: Number, default: 0 },
        bettingProgress: { type: Number, default: 0 },
        unlocked: { type: Boolean, default: false },
        registrationDate: { type: Date, default: Date.now },
        totalBetsPlaced: { type: Number, default: 0 },
        winningsFromBonus: { type: Number, default: 0 },
        lastWithdrawalDate: { type: Date },
        hasDeposited: { type: Boolean, default: false },
        initialBalanceUsed: { type: Boolean, default: false },
        withdrawableAmount: { type: Number, default: 0 },
        lockedWinnings: { type: Number, default: 0 },
        betsPlacedAtLastWithdrawal: { type: Number, default: 0 },
        hasCompletedFirstWithdraw: { type: Boolean, default: false },
        hasDoneWithdrawBeforeBets: { type: Boolean, default: false },
        // New fields for tracking welcome bonus withdrawals
        totalWithdrawnFromBonus: { type: Number, default: 0 }, // Total amount withdrawn from welcome bonus
        pendingWithdrawalsFromBonus: { type: Number, default: 0 }, // Pending withdrawals from welcome bonus
        lastWinningWithdrawalDate: { type: Date }, // Date of last winning amount withdrawal (for countdown)
        isCountdownActive: { type: Boolean, default: false }, // Whether 7-day countdown is active
        countdownStartDate: { type: Date } // When the countdown started
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
    
    referralWelcomeBonuses: [{
        referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: Number,
        isClaimed: { type: Boolean, default: false },
        depositApproved: { type: Boolean, default: false }
    }],
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
module.exports.generateWelcomeBonus = generateWelcomeBonus;
