// const express = require("express");
// const router = express.Router();
// const { auth, adminMiddleware } = require("../middleware/auth");
// const User = require("../models/user");
// const PreResult = require("../models/preResult");

// // ✅ **Admin Dashboard**
// // ✅ **Admin Dashboard (Only Admins can access)**
// router.get("/dashboard", auth, adminMiddleware, async (req, res) => {
//     try {
//         // 📌 Filter Users
//         const userFilter = {
//             role: req.query.role || { $exists: true },
//             referredBy: req.query.referredBy || { $exists: true },
//             mobile: req.query.mobile ? { $regex: req.query.mobile, $options: "i" } : { $exists: true }
//         };
//         const users = await User.find(userFilter).select("-password");
        
//         // 📌 Filter Deposits
//         const depositFilter = {
//             "banking.deposits.status": req.query.depositStatus || { $exists: true },
//             "banking.deposits.amount": { $gte: req.query.minDeposit || 0, $lte: req.query.maxDeposit || Infinity },
//             "banking.deposits.transactionId": req.query.transactionId || { $exists: true }
//         };
//         const deposits = await User.find(depositFilter);

//         // 📌 Filter Withdrawals
//         const withdrawalFilter = {
//             "banking.withdrawals.status": req.query.withdrawStatus || { $exists: true },
//             "banking.withdrawals.amount": { $gte: req.query.minWithdraw || 0, $lte: req.query.maxWithdraw || Infinity }
//         };
//         const withdrawals = await User.find(withdrawalFilter);

//         // 📌 Filter PreResults
//         const preResults = await PreResult.find({
//             gameId: req.query.gameId || { $exists: true },
//             resultNumber: req.query.resultNumber || { $exists: true }
//         }).sort({ createdAt: -1 });
        
        


//         // const users = await User.find().select("-password");
//         // const deposits = await User.find({ "banking.deposits.status": "Pending" });
//         // const withdrawals = await User.find({ "banking.withdrawals.status": "Pending" });
//         // const preResults = await PreResult.find().sort({ createdAt: -1 });

//         res.render("admin", { users, deposits, withdrawals, preResults });
//     } catch (error) {
//         res.status(500).json({ message: "Server error!" });
//     }
// });

// // ✅ **Approve Deposit Request**
// // / ✅ **Approve Deposit Request & Update Balance**
// router.get("/approve-deposit/:id", auth, adminMiddleware, async (req, res) => {
//     // try {
//     //     // ✅ Find User by Deposit ID
//     //     const user = await User.findOne({ "banking.deposits._id": req.params.id });

//     //     if (!user) {
//     //         return res.status(404).json({ message: "User not found!" });
//     //     }

//     //     // ✅ Find the Deposit Entry
//     //     let deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);

//     //     if (!deposit) {
//     //         return res.status(404).json({ message: "Deposit not found!" });
//     //     }

//     //     // ✅ Check if Already Approved
//     //     if (deposit.status === "Approved") {
//     //         return res.status(400).json({ message: "Deposit already approved!" });
//     //     }

//     //     // ✅ Update User Balance & Deposit Status
//     //     await User.updateOne(
//     //         { "banking.deposits._id": req.params.id },
//     //         {
//     //             $set: { "banking.deposits.$.status": "Approved" },  // ✅ Update Status
//     //             $inc: { "balance.0.pending": deposit.amount }  // ✅ Add Amount to Balance
//     //         }
//     //     );

//     //     console.log(`✅ Deposit Approved & Balance Updated for User: ${user.fullname}`);
//     //     res.redirect("/admin/dashboard");

//     // } catch (error) {
//     //     console.error("❌ Error Approving Deposit:", error);
//     //     res.status(500).json({ message: "Server error!" });
//     // }

//     try {
//         // ✅ Find User by Deposit ID
//         const user = await User.findOne({ "banking.deposits._id": req.params.id });

//         if (!user) {
//             return res.status(404).json({ message: "User not found!" });
//         }

//         // ✅ Find the Deposit Entry
//         let deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);

//         if (!deposit) {
//             return res.status(404).json({ message: "Deposit not found!" });
//         }

//         // ✅ Check if Already Approved
//         if (deposit.status === "Approved") {
//             return res.status(400).json({ message: "Deposit already approved!" });
//         }

//         // ✅ Total Amount to Add = Deposit Amount + Bonus
//         const totalAmount = deposit.amount + deposit.bonus;

//         // ✅ Update User Balance & Deposit Status
//         await User.updateOne(
//             { "banking.deposits._id": req.params.id },
//             {
//                 $set: { "banking.deposits.$.status": "Approved" },  // ✅ Update Status
//                 $inc: { "balance.0.pending": totalAmount }  // ✅ Add Amount + Bonus to Balance
//             }
//         );

//         console.log(`✅ Deposit Approved & Balance Updated (₹${deposit.amount} + Bonus ₹${deposit.bonus}) for User: ${user.fullname}`);
//         res.redirect("/admin/dashboard");

//     } catch (error) {
//         console.error("❌ Error Approving Deposit:", error);
//         res.status(500).json({ message: "Server error!" });
//     }
// });


// // ✅ **Reject Deposit Request**
// router.get("/reject-deposit/:id", auth, adminMiddleware, async (req, res) => {
//     await User.updateOne({ "banking.deposits._id": req.params.id }, { $set: { "banking.deposits.$.status": "Rejected" } });
//     res.redirect("/admin/dashboard");
// });

// // ✅ **Approve Withdrawal Request**
// router.get("/approve-withdraw/:id", auth, adminMiddleware, async (req, res) => {
//     await User.updateOne({ "banking.withdrawals._id": req.params.id }, { $set: { "banking.withdrawals.$.status": "Approved" } });
//     res.redirect("/admin/dashboard");
// });

// // ✅ **Reject Withdrawal Request**
// router.get("/reject-withdraw/:id", auth, adminMiddleware, async (req, res) => {
//     await User.updateOne({ "banking.withdrawals._id": req.params.id }, { $set: { "banking.withdrawals.$.status": "Rejected" } });
//     res.redirect("/admin/dashboard");
// });

// module.exports = router;


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
       
        // 📌 Filter Deposits
        const depositFilter = {
            "banking.deposits.status": req.query.depositStatus || { $exists: true },
            "banking.deposits.amount": { $gte: req.query.minDeposit || 0, $lte: req.query.maxDeposit || Infinity },
            "banking.deposits.transactionId": req.query.transactionId || { $exists: true }
        };
        const deposits = await User.find(depositFilter);


        // 📌 Filter Withdrawals
        const withdrawalFilter = {
            "banking.withdrawals.status": req.query.withdrawStatus || { $exists: true },
            "banking.withdrawals.amount": { $gte: req.query.minWithdraw || 0, $lte: req.query.maxWithdraw || Infinity }
        };
        const withdrawals = await User.find(withdrawalFilter);


        // 📌 Filter PreResults
        const preResults = await PreResult.find({
            gameId: req.query.gameId || { $exists: true },
            resultNumber: req.query.resultNumber || { $exists: true }
        }).sort({ createdAt: -1 });
       
       




        // const users = await User.find().select("-password");
        // const deposits = await User.find({ "banking.deposits.status": "Pending" });
        // const withdrawals = await User.find({ "banking.withdrawals.status": "Pending" });
        // const preResults = await PreResult.find().sort({ createdAt: -1 });


        res.render("admin", { users, deposits, withdrawals, preResults });
    } catch (error) {
        res.status(500).json({ message: "Server error!" });
    }
});


// ✅ **Approve Deposit Request**
// / ✅ **Approve Deposit Request & Update Balance**
router.get("/approve-deposit/:id", auth, adminMiddleware, async (req, res) => {
    // try {
    //     // ✅ Find User by Deposit ID
    //     const user = await User.findOne({ "banking.deposits._id": req.params.id });


    //     if (!user) {
    //         return res.status(404).json({ message: "User not found!" });
    //     }


    //     // ✅ Find the Deposit Entry
    //     let deposit = user.banking.deposits.find(dep => dep._id.toString() === req.params.id);


    //     if (!deposit) {
    //         return res.status(404).json({ message: "Deposit not found!" });
    //     }


    //     // ✅ Check if Already Approved
    //     if (deposit.status === "Approved") {
    //         return res.status(400).json({ message: "Deposit already approved!" });
    //     }


    //     // ✅ Update User Balance & Deposit Status
    //     await User.updateOne(
    //         { "banking.deposits._id": req.params.id },
    //         {
    //             $set: { "banking.deposits.$.status": "Approved" },  // ✅ Update Status
    //             $inc: { "balance.0.pending": deposit.amount }  // ✅ Add Amount to Balance
    //         }
    //     );


    //     console.log(`✅ Deposit Approved & Balance Updated for User: ${user.fullname}`);
    //     res.redirect("/admin/dashboard");


    // } catch (error) {
    //     console.error("❌ Error Approving Deposit:", error);
    //     res.status(500).json({ message: "Server error!" });
    // }


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


        // ✅ Update User Balance & Deposit Status
        await User.updateOne(
            { "banking.deposits._id": req.params.id },
            {
                $set: { "banking.deposits.$.status": "Approved" },  // ✅ Update Status
                $inc: { "balance.0.pending": totalAmount }  // ✅ Add Amount + Bonus to Balance
            }
        );


        console.log(`✅ Deposit Approved & Balance Updated (₹${deposit.amount} + Bonus ₹${deposit.bonus}) for User: ${user.fullname}`);
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


module.exports = router;



