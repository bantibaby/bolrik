// // require('dotenv').config();
// // const User = require('../models/user'); // MongoDB model for User
// // const jwt = require('jsonwebtoken');


// // const auth = async(req, res, next) => {
// //   try {
// //     const token = req.cookies.jwt;
// //     const verifyUser =  jwt.verify(token, process.env.JWT_SECRET);
    

// //     const user= await User.findOne({_id:verifyUser._id})
// //     console.log(`for verified user: ${user.fullname}`)
// //     req.token = token; 
// //     req.user = user;
// //     next();
// //   } catch (error) {
// //     res.status(401).send(error);
// //   }
// // }

// // const checkUser = async (req, res, next) => {
// //   try {
// //     const token = req.cookies.jwt;

// //     if (!token) {
// //       // अगर टोकन नहीं है, तो user डेटा null सेट करें
// //       // console.log('token not found, please login or register for a valid token')
// //       res.locals.user = null;
// //       return next();
// //     }
    
// //     // टोकन verify करें
// //     const verifyUser = jwt.verify(token, process.env.JWT_SECRET);

// //     // यूज़र की जानकारी डेटाबेस से प्राप्त करें
// //     const user= await User.findOne({_id:verifyUser._id})
// //     // console.log('hurry!up you have valid token' + user.fullname)

// //     // अगर user उपलब्ध है, तो उसे res.locals में सेट करें
// //     res.locals.user = user || null;
// //     // console.log('hurry!up you have valid token')

// //     next();
// //   } catch (error) {
// //     res.locals.user = null; // अगर कोई एरर हो तो भी user डेटा null सेट करें
// //     next();
// //   }
// // };
// // module.exports = {auth, checkUser};


// require('dotenv').config();
// const User = require('../models/user'); // MongoDB model for User
// const jwt = require('jsonwebtoken');

// const auth = async (req, res, next) => {
//   try {
//     // Request cookies me se JWT token le rahe hain
//     const token = req.cookies.jwt;
//     if (!token) {
//       return res.status(401).json({ error: "Authentication token not found" });
//     }
    
//     // Token verify karna, agar verify fail hota hai to error throw karega
//     const verifyUser = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Database se user ko fetch karna, _id ke basis par
//     const user = await User.findOne({ _id: verifyUser._id });
//     if (!user) {
//       return res.status(401).json({ error: "User not found" });
//     }
    
//     console.log(`For verified user: ${user.fullname}`);
//     // User aur token ko request object me attach kar rahe hain
//     req.token = token;
//     req.user = user;
//     next();
//   } catch (error) {
//     console.error("Authentication error:", error);
//     return res.status(401).json({ error: "Authentication failed" });
//   }
// };

// const checkUser = async (req, res, next) => {
//   try {
//     const token = req.cookies.jwt;

//     if (!token) {
//       // Agar token na mile to res.locals.user ko null set kar dein
//       res.locals.user = null;
//       return next();
//     }
    
//     // Token ko verify karein
//     const verifyUser = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Database se user fetch karen
//     const user = await User.findOne({ _id: verifyUser._id });
    
//     // Agar user exist karta hai to use res.locals.user me set karen, warna null
//     res.locals.user = user || null;
//     next();
//   } catch (error) {
//     console.error("checkUser error:", error);
//     // Agar koi error aaye to bhi res.locals.user ko null set kar dein
//     res.locals.user = null;
//     next();
//   }
// };

// module.exports = { auth, checkUser };




require('dotenv').config();
const User = require('../models/user'); // MongoDB model for User
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication token not found" });
    }

    const verifyUser = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: verifyUser._id });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    console.log(`✅ Verified User: ${user.fullname}`);
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// ✅ **Check if the user is an admin**
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied! Admins only." });
  }
  next();
};

// ✅ **For checking the logged-in user (optional)**
const checkUser = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.user = null;
      return next();
    }

    const verifyUser = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: verifyUser._id });

    res.locals.user = user || null;
    next();
  } catch (error) {
    console.error("❌ checkUser error:", error);
    res.locals.user = null;
    next();
  }
};

module.exports = { auth, adminMiddleware, checkUser };
