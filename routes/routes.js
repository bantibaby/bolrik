// ✅ विथड्रॉ रुट्स
router.post('/withdraw', auth, routecontroller.withdrawMoney);
router.post('/withdraw/cancel/:id', auth, routecontroller.cancelWithdraw); 

// Get current user data
router.get("/user/getCurrentUser", auth, routecontroller.getCurrentUser);

// Get user bets for trading panel
router.get("/user/userBets", auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user._id;
        
        // Find active bets for this user
        const bets = await Bet.find({ 
            userId, 
            gameId: { $ne: null }
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