// require('dotenv').config();
// const mongoose = require('mongoose');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid'); // 🔹 Unique Referral Code Generator

// function generateReferralCode() {
//     return Math.random().toString(36).substring(2, 8).toUpperCase(); // ✅ 6-character code
// }


// const userSchema = new mongoose.Schema({
//     fullname: { type: String, required: true },
//     mobile: { type: String, required: true, unique: true },
//     recoveryKeys: { type: String, required: true, unique: true },
//     // otpExpiration: { type: Date, default: Date.now },
//     verify: { type: Boolean, default: false },
//     password: { type: String},
//     role: { type: String, enum: ["user", "admin"], default: "user" }, // ✅ Role Field Added
//     // 🔹 **Referral System Fields**
//     // referralCode: { type: String, unique: true }, // Every user gets a unique code
//     referralCode: { type: String, unique: true, default: function () { return generateReferralCode(); } },

//     referredBy: { type: String, default: null }, // Stores referrer's referralCode
//     referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users referred by this user
//     referralEarnings: { type: Number, default: 0 }, // Total Earnings from referrals
//     tokens: [{ token: { type: String, required: true } }],
//     banking: {
//         bankName: String,
//         accountNumber: String,
//         ifsc: String,
//         upiId: String,
//         deposits: [{ 
//             date: { type: Date, default: Date.now },
//             amount: Number,
//             bonus: Number,
//             transactionId: String,
//             screenshot: String,
//             status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
//         }],
//         withdrawals: [{ 
//             date: { type: Date, default: Date.now },
//             amount: Number,
//             status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
//         }]
//     },
    
//     balance: {
//         type: [{ pending: Number, bonus: Number }],
//         default: [{ pending: 0, bonus: 0 }]
//     },
//     history: [{
//         time: { type: Date, default: Date.now },
//         betId: { type: mongoose.Schema.Types.ObjectId, ref: "Bet" },
//         gameId: { type: String },
//         betNumber: [{ type: Number }],
//         betAmount: { type: Number },
//         resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
//         result: { type: String, default: "Pending" },
//         winAmount: { type: Number, default: 0 },
//         lossAmount: { type: Number, default: 0 },
//         multiplier: { type: String, default: "wait" }  // ✅ Multiplier added in history
//     }],
    
    
// });
// userSchema.pre("save", function (next) {
//     if (!this.referralCode) {
//         this.referralCode = generateReferralCode();
//     }
//     if (this.balance.length === 0) {
//         this.balance.push({ pending: 1000, bonus: 0 });
//     }
//     next();
// });
// // ✅ **JWT Token Generate Method**
// userSchema.methods.generateAuthToken = async function () {
    

//     try {
//         const token = jwt.sign({ _id: this._id.toString(), role: this.role }, process.env.JWT_SECRET);
//         this.tokens.push({ token });
//         await this.save();
//         return token;
//     } catch (error) {
//         throw new Error(error);
//     }
// };
// // userSchema.pre("save", function (next) {
// //     if (!this.password || this.password.length < 6) {
// //         return next(new Error("Password must be at least 6 characters long."));
// //     }
// //     if (!this.referralCode) {
// //         this.referralCode = generateReferralCode();
// //     }
// //     // if (this.balance.length === 0) {
// //     //     this.balance.push({ pending: 0, bonus: 0 });
// //     // }
// //     next();
// // });
// // // ✅ **JWT Token Generate Method**
// // userSchema.methods.generateAuthToken = async function () {
    

// //     try {
// //         const token = jwt.sign({ _id: this._id.toString(), role: this.role }, process.env.JWT_SECRET);
// //         this.tokens.push({ token });
// //         await this.save();
// //         return token;
// //     } catch (error) {
// //         throw new Error(error);
// //     }
// // };

// module.exports = mongoose.model('User', userSchema);
// require('dotenv').config();
// const mongoose = require('mongoose');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid'); // 🔹 Unique Referral Code Generator

// function generateReferralCode() {
//     return Math.random().toString(36).substring(2, 8).toUpperCase(); // ✅ 6-character code
// }


// const userSchema = new mongoose.Schema({
//     fullname: { type: String, required: true },
//     mobile: { type: String, required: true, unique: true },
//     recoveryKeys: { type: String, required: true, unique: true },
//     // otpExpiration: { type: Date, default: Date.now },
//     verify: { type: Boolean, default: false },
//     password: { type: String, required: true},
//     role: { type: String, enum: ["user", "admin"], default: "user" }, // ✅ Role Field Added
//     // 🔹 **Referral System Fields**
//     // referralCode: { type: String, unique: true }, // Every user gets a unique code
//     referralCode: { type: String, unique: true, default: function () { return generateReferralCode(); } },

//     referredBy: { type: String, default: null }, // Stores referrer's referralCode
//     referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users referred by this user
//     referralEarnings: { type: Number, default: 0 }, // Total Earnings from referrals
//     tokens: [{ token: { type: String, required: true } }],
//     banking: {
//         bankName: String,
//         accountNumber: String,
//         ifsc: String,
//         upiId: String,
//         deposits: [{ 
//             date: { type: Date, default: Date.now },
//             amount: Number,
//             bonus: Number,
//             transactionId: String,
//             screenshot: String,
//             status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
//         }],
//         withdrawals: [{ 
//             date: { type: Date, default: Date.now },
//             amount: Number,
//             status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
//         }]
//     },
    
//     balance: {
//         type: [{ pending: Number, bonus: Number }],
//         default: [{ pending: 0, bonus: 0 }]
//     },
//     history: [{
//         time: { type: Date, default: Date.now },
//         betId: { type: mongoose.Schema.Types.ObjectId, ref: "Bet" },
//         gameId: { type: String },
//         betNumber: [{ type: Number }],
//         betAmount: { type: Number },
//         resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
//         result: { type: String, default: "Pending" },
//         winAmount: { type: Number, default: 0 },
//         lossAmount: { type: Number, default: 0 },
//         multiplier: { type: String, default: "wait" }  // ✅ Multiplier added in history
//     }],
    
    
// });

// userSchema.pre("save", function (next) {
//     if (!this.password || this.password.length < 6) {
//         return next(new Error("Password must be at least 6 characters long."));
//     }
//     if (!this.referralCode) {
//         this.referralCode = generateReferralCode();
//     }
//     // if (this.balance.length === 0) {
//     //     this.balance.push({ pending: 0, bonus: 0 });
//     // }
//     next();
// });
// // ✅ **JWT Token Generate Method**
// userSchema.methods.generateAuthToken = async function () {
    

//     try {
//         const token = jwt.sign({ _id: this._id.toString(), role: this.role }, process.env.JWT_SECRET);
//         this.tokens.push({ token });
//         await this.save();
//         return token;
//     } catch (error) {
//         throw new Error(error);
//     }
// };

// module.exports = mongoose.model('User', userSchema);
// // Export the generateReferralCode function so it can be used in other files
// module.exports = {generateReferralCode};


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
            status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
        }],
        withdrawals: [{ 
            date: { type: Date, default: Date.now },
            amount: Number,
            status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
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
        multiplier: { type: String, default: "wait" }  // ✅ Multiplier added in history
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

// Export the generateReferralCode function so it can be used in other files
module.exports.generateReferralCode = generateReferralCode;
