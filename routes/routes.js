const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const routecontroller = require('../controllers/routecont');
const User = require('../models/user');
const Bet = require('../models/bet');

// ✅ विथड्रॉ रुट्स
router.post('/withdraw', auth, async (req, res) => {
    try {
        if (routecontroller.withdrawMoney) {
            await routecontroller.withdrawMoney(req, res);
        } else {
            res.status(500).json({ success: false, message: "Withdraw function not implemented" });
        }
    } catch (error) {
        console.error("Error in withdraw route:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
router.post('/withdraw/cancel/:id', auth, async (req, res) => {
    try {
        if (routecontroller.cancelWithdraw) {
            await routecontroller.cancelWithdraw(req, res);
        } else {
            res.status(500).json({ success: false, message: "Cancel withdraw function not implemented" });
        }
    } catch (error) {
        console.error("Error in cancel withdraw route:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
router.get('/withdraw/eligibility', auth, async (req, res) => {
    try {
        if (routecontroller.getWithdrawalEligibility) {
            await routecontroller.getWithdrawalEligibility(req, res);
        } else {
            res.status(500).json({ success: false, message: "Get withdrawal eligibility function not implemented" });
        }
    } catch (error) {
        console.error("Error in get withdrawal eligibility route:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
router.get('/withdraw/history', auth, async (req, res) => {
    try {
        if (routecontroller.getWithdrawalHistory) {
            await routecontroller.getWithdrawalHistory(req, res);
        } else {
            res.status(500).json({ success: false, message: "Get withdrawal history function not implemented" });
        }
    } catch (error) {
        console.error("Error in get withdrawal history route:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ Add placeBet route
router.post('/placeBet', auth, async (req, res) => {
    try {
        const { betNumber, betAmount, timeframe } = req.body;
        const userId = req.user._id;
        
        if (!betNumber || !Array.isArray(betNumber) || betNumber.length !== 3 || !betAmount) {
            return res.status(400).json({
                success: false,
                message: "Invalid bet data. Please provide betNumber array with 3 numbers and betAmount."
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        // Check if user has sufficient balance
        if (user.balance.length === 0 || user.balance[0].pending < betAmount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });
        }
        
        // Check if user already has 3 pending bets
        const pendingBets = await Bet.countDocuments({ 
            userId: userId, 
            result: "Pending" 
        });
        
        if (pendingBets >= 3) {
            return res.status(400).json({ 
                success: false,
                message: "आप पहले से ही 3 बेट प्लेस कर चुके हैं। कृपया उनके रिजल्ट का इंतजार करें।"
            });
        }
        
        // Get current game ID for the timeframe
        const currentTimeframe = timeframe || 30; // Default to 30 seconds if not provided
        const currentGameId = global[`currentGameId_${currentTimeframe}`];
        
        if (!currentGameId) {
            return res.status(400).json({
                success: false,
                message: "No active game found for this timeframe"
            });
        }
        
        // Calculate actual bet amount after 10% fee
        const displayedBetAmount = betAmount; // Amount shown to user and deducted from balance
        const actualBetAmount = betAmount * 0.9;
        
        // Create new bet
        const newBet = new Bet({
            userId,
            betNumber,
            betAmount: displayedBetAmount,
            actualBetAmount,
            timeframe: currentTimeframe,
            gameId: currentGameId,
            result: "Pending"
        });
        
        await newBet.save();
        
        // Update user balance
        user.balance[0].pending -= displayedBetAmount;
        
        // Add bet to user's history
        user.history.push({
            betId: newBet._id,
            gameId: currentGameId,
            betNumber,
            betAmount: displayedBetAmount,
            result: "Pending",
            winAmount: 0,
            lossAmount: 0
        });
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: "Bet placed successfully",
            bet: {
                _id: newBet._id,
                gameId: newBet.gameId,
                betNumber: newBet.betNumber,
                betAmount: displayedBetAmount,
                status: newBet.status
            },
            newBalance: user.balance[0].pending
        });
        
    } catch (error) {
        console.error("Error placing bet:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Get current user data
router.get("/getCurrentUser", auth, async (req, res) => {
    try {
        if (routecontroller.getCurrentUser) {
            await routecontroller.getCurrentUser(req, res);
        } else {
            res.status(500).json({ success: false, message: "Get current user function not implemented" });
        }
    } catch (error) {
        console.error("Error in get current user route:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Get user bets for trading panel
router.get("/userBets", auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user._id;
        
        // Find only pending bets for this user
        const bets = await Bet.find({ 
            userId, 
            result: "Pending"
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
        
        res.status(200).json({
            success: true,
            bets
        });
    } catch (error) {
        console.error("Error fetching user bets:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}); 

module.exports = router; 