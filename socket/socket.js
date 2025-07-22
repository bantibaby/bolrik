const { Server } = require('socket.io'); 
const mongoose = require("mongoose");
const crypto = require("crypto");
const connectDB = require("../config/db");
const Result = require("../models/result");
const Bet = require("../models/bet");
const User = require("../models/user");
const PreResult = require("../models/preResult");
const connectedUsers = new Map();

// Define timeframes and their configurations
const timeframes = {
    30: { // 30 seconds
        countdownTime: 30,
        bettingClosesAt: 5, // betting closes when 5 seconds remain
        currentGameId: "",
        countdownInterval: null,
        isShowingResult: false,
        resultValues: null,
        resultTimeout: null
    },
    45: { // 45 seconds
        countdownTime: 45,
        bettingClosesAt: 10, // betting closes when 10 seconds remain
        currentGameId: "",
        countdownInterval: null,
        isShowingResult: false,
        resultValues: null,
        resultTimeout: null
    },
    60: { // 1 minute
        countdownTime: 60,
        bettingClosesAt: 15, // betting closes when 15 seconds remain
        currentGameId: "",
        countdownInterval: null,
        isShowingResult: false,
        resultValues: null,
        resultTimeout: null
    },
    150: { // 2:30 minutes
        countdownTime: 150,
        bettingClosesAt: 30, // betting closes when 30 seconds remain
        currentGameId: "",
        countdownInterval: null,
        isShowingResult: false,
        resultValues: null,
        resultTimeout: null
    }
};

// Initialize global state for each timeframe
Object.keys(timeframes).forEach(timeframe => {
    global[`countdownTime_${timeframe}`] = timeframes[timeframe].countdownTime;
    global[`currentGameId_${timeframe}`] = "";
});

function initializeSocket(server) {
    const io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId || socket.id;
        
        // Send current countdown times for all timeframes
        Object.keys(timeframes).forEach(timeframe => {
            socket.emit("timerUpdate", {
                timeframe: parseInt(timeframe),
                time: global[`countdownTime_${timeframe}`]
            });
        });

        // Handle user selecting a timeframe
        socket.on("selectTimeframe", (data) => {
            if (data && data.timeframe && timeframes[data.timeframe]) {
                socket.join(`timeframe_${data.timeframe}`);
                console.log(`User ${userId} joined timeframe ${data.timeframe}`);
                
                // Send current state for this timeframe
                socket.emit("timerUpdate", {
                    timeframe: parseInt(data.timeframe),
                    time: global[`countdownTime_${data.timeframe}`]
                });
            }
        });
        
        // Handle request for timeframe status
        socket.on("requestTimeframeStatus", () => {
            const timeframeStatus = {};
            
            Object.keys(timeframes).forEach(timeframe => {
                timeframeStatus[timeframe] = {
                    isShowingResult: timeframes[timeframe].isShowingResult,
                    values: timeframes[timeframe].resultValues
                };
            });
            
            socket.emit("timeframeStatus", { timeframes: timeframeStatus });
        });
        
        // New handler for requesting bet results for a specific game
        socket.on("requestBetResults", async ({ gameId, timeframe, userId: clientUserId }) => {
            try {
                // Use clientUserId if provided, otherwise fall back to socket's userId
                const userId = clientUserId || socket.handshake.query.userId || socket.id;
                
                if (!userId || userId === socket.id) {
                    console.log("User ID not provided for bet results request");
                    return; // Don't send any response if user is not logged in
                }
                
                console.log(`Processing bet results request for user ${userId}, game ${gameId}, timeframe ${timeframe}`);
                
                // Get user data first to ensure we have a valid user
                const user = await User.findById(userId);
                if (!user) {
                    console.log(`User not found for ID: ${userId}`);
                    return; // Don't send any response if user not found
                }
                
                // Find user's bets for this game with more flexible query
                const bets = await Bet.find({ 
                    userId,
                    timeframe,
                    $or: [
                        { gameId },
                        { gameId: { $regex: new RegExp(timeframe + '-.*') }, result: "Pending" }
                    ]
                });
                
                console.log(`Found ${bets.length} bets for user ${userId} in game ${gameId}`);
                
                // If user has no bets for this game, send a zero result anyway
                if (!bets || bets.length === 0) {
                    console.log(`No bets found for user ${userId} in game ${gameId}, sending zero result`);
                    socket.emit("finalBetResult", {
                        gameId,
                        totalWin: 0,
                        totalLoss: 0,
                        finalResult: 0,
                        updatedBalance: user.balance[0].pending,
                        timeframe
                    });
                    return;
                }
                
                // Calculate total win/loss
                let totalWin = 0;
                let totalLoss = 0;
                
                bets.forEach(bet => {
                    if (bet.result === "Won") {
                        totalWin += bet.payout;
                    } else if (bet.result === "Lost") {
                        totalLoss += bet.betAmount;
                    }
                });
                
                // Calculate final result (only add winnings since losses are already deducted)
                const finalResult = totalWin;
                
                // Send result to user immediately
                socket.emit("finalBetResult", {
                    gameId,
                    totalWin,
                    totalLoss,
                    finalResult,
                    updatedBalance: user.balance[0].pending,
                    timeframe
                });
                
                console.log(`Sent bet results to user ${userId} for game ${gameId}: Win=${totalWin}, Loss=${totalLoss}, Final=${finalResult}`);
                
            } catch (error) {
                console.error(`Error sending bet results to user ${userId}:`, error);
                // Send a fallback response in case of error
                socket.emit("finalBetResult", {
                    gameId,
                    totalWin: 0,
                    totalLoss: 0,
                    finalResult: 0,
                    error: "Failed to process bet results",
                    timeframe
                });
            }
        });
        
        // Handle user joining room
        socket.on('joinRoom', ({ userId }) => {
            if (userId) {
                console.log(`User ${userId} joined with socket ${socket.id}`);
                
                // Leave previous rooms if any
                if (connectedUsers.has(socket.id)) {
                    const oldUserId = connectedUsers.get(socket.id);
                    socket.leave(oldUserId);
                }
                
                // Join user's room
                socket.join(userId);
                connectedUsers.set(socket.id, userId);
                
                // Send confirmation
                socket.emit('roomJoined', { userId });
            }
        });

        if (connectedUsers.has(userId)) {
            console.log(`⚠️ Duplicate connection prevented for User ID: ${userId}`);
            socket.disconnect();
            return;
        }

        connectedUsers.set(userId, socket.id);
        console.log(`✅ User connected: ${userId}`);

        socket.on("disconnect", () => {
            connectedUsers.delete(userId);
            console.log(`❌ User disconnected: ${userId}`);
        });

        // पेजिनेटेड रिजल्ट्स के लिए इवेंट हैंडलर
        socket.on("fetchResults", async ({ page = 1, limit = 10, timeframe = 30 }) => {
            try {
                const skip = (page - 1) * limit;
                const totalResults = await Result.countDocuments({ timeframe });
                
                const results = await Result.find({ timeframe })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit);

                socket.emit("resultsData", {
                    results,
                    currentPage: page,
                    totalPages: Math.ceil(totalResults / limit),
                    timeframe
                });
            } catch (error) {
                console.error("Error fetching results:", error);
                socket.emit("error", "Failed to fetch results");
            }
        });

        // Handle bet placement with timeframe
        socket.on("placeBet", async (data) => {
            try {
                const { userId, betNumber, betAmount, timeframe } = data;
                
                if (!timeframes[timeframe]) {
                    socket.emit("betError", { message: "Invalid timeframe selected" });
                    return;
                }
                
                const currentGameId = global[`currentGameId_${timeframe}`];
                const remainingTime = global[`countdownTime_${timeframe}`];
                
                // Check if betting is still allowed for this timeframe
                if (remainingTime <= timeframes[timeframe].bettingClosesAt) {
                    socket.emit("betError", { message: "Betting closed for this round" });
                    return;
                }
                
                // ✅ Check if user already has 2 pending bets
                const pendingBets = await Bet.countDocuments({ 
                    userId: userId, 
                    result: "Pending" 
                });
                
                if (pendingBets >= 2) {
                    socket.emit("betError", { 
                        message: "आप पहले से ही 2 बेट प्लेस कर चुके हैं। कृपया उनके रिजल्ट का इंतजार करें।",
                        errorType: "betLimitReached"
                    });
                    return;
                }
                
                // Process the bet with the timeframe
                // ... (existing bet processing logic)
                
                // Calculate actual bet amount after 10% fee
                const displayedBetAmount = betAmount; // Amount shown to user and deducted from balance
                const actualBetAmount = betAmount * 0.9; // 90% of bet amount used for calculating winnings
                
                // Save bet to database with both displayed and actual amounts
                const newBet = new Bet({
                    userId: data.userId,
                    betNumber: data.betNumber,
                    betAmount: displayedBetAmount, // Store displayed amount
                    actualBetAmount: actualBetAmount, // Store actual amount after fee
                    timeframe: timeframe,
                    gameId: currentGameId,
                    result: "Pending"
                });
                
                await newBet.save();
                
                // Update user balance
                const user = await User.findById(data.userId);
                if (!user) {
                    return socket.emit("betPlaced", {
                        success: false,
                        message: "User not found"
                    });
                }
                
                // Check if user has sufficient balance
                if (user.balance.length === 0 || user.balance[0].pending < displayedBetAmount) {
                    return socket.emit("betPlaced", {
                        success: false,
                        message: "Insufficient balance"
                    });
                }
                
                // Deduct bet amount from user's balance (full amount including fee)
                user.balance[0].pending -= displayedBetAmount;
                
                // Add bet to user's history
                user.history.push({
                    betId: newBet._id,
                    gameId: currentGameId,
                    betNumber: data.betNumber,
                    betAmount: displayedBetAmount, // Store displayed amount in history
                    result: "Pending",
                    winAmount: 0,
                    lossAmount: 0
                });
                
                await user.save();
                
                // Send bet placed confirmation to user
                socket.emit("betPlaced", { 
                    success: true, 
                    message: "Bet placed successfully",
                    bet: {
                        _id: newBet._id,
                        gameId: newBet.gameId,
                        betNumber: newBet.betNumber,
                        betAmount: displayedBetAmount, // Send displayed amount to user
                        status: newBet.status
                    },
                    newBalance: user.balance[0].pending
                });
                
                // Send balance update event
                socket.emit("balanceUpdate", {
                    updatedBalance: user.balance[0].pending
                });
                
                // Send history update to user
                socket.emit("historyUpdate", {
                    history: user.history.slice(0, 20) // Send last 20 entries
                });
                
            } catch (error) {
                console.error("Error placing bet:", error);
                socket.emit("betPlaced", {
                    success: false,
                    message: "Error placing bet"
                });
            }
        });
    });

    // Start countdowns for all timeframes
    Object.keys(timeframes).forEach(timeframe => {
        startCountdown(io, parseInt(timeframe));
    });
    
    return io;
}

// यूजर वैलिडिटी चेक करने का फंक्शन
async function checkUserValidity(userId) {
    try {
        const user = await User.findById(userId);
        return !!user; // यूजर मौजूद है या नहीं
    } catch (error) {
        console.error("❌ Error checking user validity:", error);
        return false;
    }
}

// ✅ Fetch Next Result Number for a specific timeframe
async function getNextResultNumber(timeframe) {
    const lastResult = await Result.findOne({ timeframe }).sort({ resultNumber: -1 });
    return lastResult ? lastResult.resultNumber + 1 : 1;
}

async function storePreResult(gameId, resultNumber, buttonValues, timeframe) {
    try {
        // ✅ **Check karo ki PreResult pehle se available hai ya nahi**
        const existingPreResult = await PreResult.findOne({ gameId });

        if (!existingPreResult) {
            // ✅ **Agar pehle se exist nahi karta, tabhi naya store karo**
            const newPreResult = new PreResult({ 
                gameId, 
                resultNumber, 
                values: buttonValues,
                timeframe
            });
            await newPreResult.save();
        } else {
            console.log("⚠️ PreResult already exists, skipping duplicate storage.");
        }
    } catch (error) {
        console.error("❌ Error in storePreResult:", error);
    }
}

async function startCountdown(io, timeframe) {
    const config = timeframes[timeframe];
    if (!config) {
        console.error(`Invalid timeframe: ${timeframe}`);
        return;
    }
    
    global[`currentGameId_${timeframe}`] = generateGameId(timeframe);
    global[`countdownTime_${timeframe}`] = config.countdownTime;
    
    console.log(`🔹 Countdown started for Game ID: ${global[`currentGameId_${timeframe}`]} (Timeframe: ${timeframe}s)`);

    let buttonValues, resultNumber;

    try {
        // ✅ **Get New Unique Result Number**
        resultNumber = await getNextResultNumber(timeframe);

        // ✅ **Check if PreResult Exists**
        let preResult = await PreResult.findOne({ 
            gameId: global[`currentGameId_${timeframe}`],
            timeframe
        });

        if (preResult) {
            buttonValues = preResult.values;
            resultNumber = preResult.resultNumber;
            console.log(`📢 Using Existing PreResult from DB for timeframe ${timeframe}:`, preResult);
        } else {
            // ✅ **Store New PreResult Only If Not Already Stored**
            buttonValues = shuffleValues();
            await storePreResult(
                global[`currentGameId_${timeframe}`], 
                resultNumber, 
                buttonValues,
                timeframe
            );
        }
    } catch (error) {
        console.error(`❌ Error Fetching PreResult for timeframe ${timeframe}:`, error);
        return;
    }

    // Clear any existing interval for this timeframe
    if (config.countdownInterval) {
        clearInterval(config.countdownInterval);
    }

    config.countdownInterval = setInterval(async () => {
        if (global[`countdownTime_${timeframe}`] > 0) {
            global[`countdownTime_${timeframe}`]--;
            
            // Emit timer update to clients subscribed to this timeframe
            io.to(`timeframe_${timeframe}`).emit("timerUpdate", {
                timeframe,
                time: global[`countdownTime_${timeframe}`]
            });
            
            // Also emit to all clients for backward compatibility
            io.emit("timerUpdate", {
                timeframe,
                time: global[`countdownTime_${timeframe}`]
            });
            
            // When betting should close, emit an event
            if (global[`countdownTime_${timeframe}`] === config.bettingClosesAt) {
                io.to(`timeframe_${timeframe}`).emit("bettingClosed", { timeframe });
            }
        } else {
            clearInterval(config.countdownInterval);

            // Set result showing state
            timeframes[timeframe].isShowingResult = true;
            timeframes[timeframe].resultValues = buttonValues;
            
            // Clear any existing timeout
            if (timeframes[timeframe].resultTimeout) {
                clearTimeout(timeframes[timeframe].resultTimeout);
            }
            
            // Set timeout to clear result after 5 seconds
            timeframes[timeframe].resultTimeout = setTimeout(() => {
                timeframes[timeframe].isShowingResult = false;
                timeframes[timeframe].resultValues = null;
            }, 5000);

            // रिजल्ट दिखाएं और सेव करें
            io.to(`timeframe_${timeframe}`).emit("flipButtons", { 
                gameId: global[`currentGameId_${timeframe}`], 
                resultNumber, 
                buttonValues,
                timeframe
            });
            
            await saveResultToDB(
                global[`currentGameId_${timeframe}`], 
                resultNumber, 
                buttonValues, 
                io,
                timeframe
            );

            setTimeout(async () => {
                global[`countdownTime_${timeframe}`] = config.countdownTime;
                global[`currentGameId_${timeframe}`] = generateGameId(timeframe);

                resultNumber = await getNextResultNumber(timeframe);

                // UI को पूरी तरह से रीसेट करें
                io.to(`timeframe_${timeframe}`).emit("resetUI", { timeframe });
                io.to(`timeframe_${timeframe}`).emit("timerUpdate", {
                    timeframe,
                    time: global[`countdownTime_${timeframe}`]
                });
                
                // Emit new round started with timeframe
                io.to(`timeframe_${timeframe}`).emit("newRoundStarted", { timeframe });
                
                // नया राउंड शुरू करें
                startCountdown(io, timeframe);
            }, 5000);
        }
    }, 1000);
}

async function saveResultToDB(gameId, resultNumber, values, io, timeframe) {
    try {
        const newResult = new Result({ 
            gameId, 
            resultNumber, 
            values,
            timeframe
        });
        await newResult.save();
        console.log(`✅ Result saved for timeframe ${timeframe}:`, newResult);

        // Process all bets and update user balances
        let userResults = await updateBetResults(gameId, values, io, timeframe) || {};

        if (Object.keys(userResults).length === 0) {
            console.log(`🔸 No users placed bets for timeframe ${timeframe}, skipping final result emission.`);
        }

        // ✅ Fetch Updated Bets from DB
        const updatedBets = await Bet.find({ gameId, timeframe }).lean();
        
        // ✅ Send bet updates only to users who placed a bet
        Object.keys(userResults).forEach(userId => {
            const userBets = updatedBets.filter(bet => bet.userId.toString() === userId);
            io.to(userId.toString()).emit("updateBetResultsUI", {
                gameId,
                bets: userBets,
                timeframe
            });
        });

        console.log(`📡 Emitted updateBetResultsUI for Game ID: ${gameId} (Timeframe: ${timeframe})`);

        // ✅ Fetch Updated Results from DB
        const totalResults = await Result.countDocuments({ timeframe });
        const latestResults = await Result.find({ timeframe })
            .sort({ createdAt: -1 })
            .limit(10);

        // ✅ Emit updated results to users subscribed to this timeframe
        io.to(`timeframe_${timeframe}`).emit("newResult", {
            results: latestResults,
            totalPages: Math.ceil(totalResults / 10),
            currentPage: 1,
            timeframe
        });

    } catch (error) {
        console.error(`❌ Error saving result for timeframe ${timeframe}:`, error);
    }
}

function calculateMultiplier(selected, buttonValues) {
    // Validate inputs
    if (!selected || !Array.isArray(selected) || selected.length !== 3) {
        console.error("Invalid selected values:", selected);
        return "0x";
    }
    
    if (!buttonValues || !Array.isArray(buttonValues) || buttonValues.length !== 9) {
        console.error("Invalid button values:", buttonValues);
        return "0x";
    }
    
    // Extract values for the selected buttons
    const selectedValues = selected.map(index => {
        if (index < 1 || index > 9) {
            console.error(`Invalid button index: ${index}`);
            return "0x";
        }
        return buttonValues[index - 1];
    });
    
    console.log(`Selected values for calculation: ${selectedValues.join(', ')}`);
    
    // Count occurrences of each value
    const counts = {
        "0x": 0,
        "2x": 0,
        "4x": 0
    };

    selectedValues.forEach(value => {
        if (counts.hasOwnProperty(value)) {
            counts[value]++;
        } else {
            console.warn(`Unknown multiplier value: ${value}`);
        }
    });

    console.log(`Counts: 0x=${counts["0x"]}, 2x=${counts["2x"]}, 4x=${counts["4x"]}`);

    // Apply multiplier rules according to the updated specifications
    // Rule 1: All three buttons have the same value
    if (counts["0x"] === 3) return "0x"; // 0x 0x 0x = 0x (Loss)
    if (counts["2x"] === 3) return "4x"; // 2x 2x 2x = 4x
    if (counts["4x"] === 3) return "8x"; // 4x 4x 4x = 8x
    
    // Rule 2: Two buttons have the same value, one has a different value
    if (counts["0x"] === 2 && counts["2x"] === 1) return "0x"; // 0x 0x 2x = 0x (Loss)
    if (counts["0x"] === 2 && counts["4x"] === 1) return "0x"; // 0x 0x 4x = 0x (Loss)
    if (counts["2x"] === 2 && counts["4x"] === 1) return "2x"; // 2x 2x 4x = 2x
    if (counts["2x"] === 2 && counts["0x"] === 1) return "1.5x"; // 2x 2x 0x = 1.5x (Win)
    if (counts["4x"] === 2 && counts["2x"] === 1) return "2x"; // 4x 4x 2x = 2x (Updated: was 4x)
    if (counts["4x"] === 2 && counts["0x"] === 1) return "1.5x"; // 4x 4x 0x = 1.5x (Updated: was 2x)
    
    // Rule 3: All three buttons have different values
    if (counts["0x"] === 1 && counts["2x"] === 1 && counts["4x"] === 1) {
        // Updated: 4x 2x 0x combination is now always 0x regardless of order
        return "0x"; // All different combinations = 0x (Loss)
    }

    // Default case - if we somehow got here, it's a loss
    console.warn(`Unhandled multiplier case: ${selectedValues.join(', ')}`);
    return "0x";
}

async function updateBetResults(gameId, buttonValues, io, timeframe) {
    try {
        // Find all bets for this game and timeframe
        const bets = await Bet.find({ 
            gameId, 
            timeframe,
            result: "Pending" 
        });
        
        if (!bets || bets.length === 0) {
            console.log(`No bets found for Game ID: ${gameId} (Timeframe: ${timeframe})`);
        return {};
    }

        console.log(`Processing ${bets.length} bets for Game ID: ${gameId} (Timeframe: ${timeframe})`);
        console.log("Button values for this game:", buttonValues);
        
        // Group bets by user
        const userBets = {};
        bets.forEach(bet => {
            const userId = bet.userId.toString();
            if (!userBets[userId]) {
                userBets[userId] = [];
            }
            userBets[userId].push(bet);
        });
        
        // Process each user's bets
        const userResults = {};
        
        for (const userId in userBets) {
            const user = await User.findById(userId);
            if (!user) {
                console.log(`User not found for ID: ${userId}`);
                continue;
            }
            
            // Only process users who have placed bets for this game
            if (!userBets[userId] || userBets[userId].length === 0) {
                console.log(`User ${userId} has no bets for game ${gameId}`);
                continue;
            }
            
            let totalWin = 0;
            let totalLoss = 0;
            
            for (const bet of userBets[userId]) {
                // Validate bet data
                if (!bet.betNumber || !Array.isArray(bet.betNumber) || bet.betNumber.length !== 3) {
                    console.error(`Invalid bet data for bet ${bet._id}:`, bet);
                    continue;
                }
                
                if (!bet.betAmount || bet.betAmount <= 0) {
                    console.error(`Invalid bet amount for bet ${bet._id}:`, bet.betAmount);
                    continue;
                }
                
                // Get the specific multipliers for each selected number
                const multipliers = bet.betNumber.map(num => {
                    // Ensure the index is valid
                    const index = num - 1;
                    if (index >= 0 && index < buttonValues.length) {
                        console.log(`Extracting multiplier for number ${num} at index ${index}: ${buttonValues[index]}`);
                        return buttonValues[index];
                    }
                    console.log(`Invalid index for number ${num}, defaulting to 0x`);
                    return "0x"; // Default value if index is out of range
                });
                
                // Calculate multiplier based on selected buttons and the rules
                const multiplier = calculateMultiplier(bet.betNumber, buttonValues);
                
                console.log(`Bet ${bet._id} for user ${userId}:`, {
                    betNumber: bet.betNumber,
                    multipliers: multipliers,
                    calculatedMultiplier: multiplier,
                    buttonValues: buttonValues
                });
                
                // Update bet with result
                let winAmount = 0;
                let status = "lost";
                
                if (multiplier !== "0x") {
                    // Parse the multiplier value (remove the 'x' and convert to number)
                    const multiplierValue = parseFloat(multiplier);
                    
                    // Validate multiplier value
                    if (isNaN(multiplierValue) || multiplierValue <= 0) {
                        console.error(`Invalid multiplier value: ${multiplier}`);
                        status = "lost";
                        winAmount = 0;
                    } else {
                        // Get the actual bet amount (90% of displayed amount)
                        // If actualBetAmount is not available (for backward compatibility), calculate it
                        const actualBetAmount = bet.actualBetAmount || (bet.betAmount * 0.9);
                        
                        // Calculate winnings based on actual bet amount (after fee) and multiplier
                        winAmount = actualBetAmount * multiplierValue;
                        
                        // For UI consistency, we need to show winnings based on displayed bet amount
                        const displayedWinAmount = bet.betAmount * multiplierValue;
                        
                        status = "won";
                        
                        // Add to total winnings
                        totalWin += winAmount;
                        
                        console.log(`User ${userId} won ${winAmount} with multiplier ${multiplier} on bet ${bet._id} (displayed win: ${displayedWinAmount})`);
                    }
                } else {
                    // User lost this bet
                    // The bet amount was already deducted when placing the bet, so we don't deduct it again
                    // But we do track it for display purposes
                    totalLoss += bet.betAmount;
                    console.log(`User ${userId} lost ${bet.betAmount} on bet ${bet._id}`);
                }
                
                bet.multiplier = multiplier;
                bet.multipliers = multipliers; // Add the individual multipliers
                bet.result = status === "won" ? "Won" : "Lost";
                bet.status = status;
                bet.payout = winAmount;
                
                await bet.save();

                // Update user history
                user.history.push({
                    betId: bet._id,
                    gameId: gameId,
                    betNumber: bet.betNumber,
                    betAmount: bet.betAmount, // Store displayed amount in history
                    result: multipliers.join(", "), // Store multipliers as result instead of Won/Lost
                    winAmount: winAmount,
                    lossAmount: status === "lost" ? bet.betAmount : 0,
                    multiplier,
                    multipliers // Individual multipliers for each bet number
                });
            }
            
            // Update user balance - only add winnings, don't subtract losses again
            const finalResult = totalWin;
            const previousBalance = user.balance[0].pending;
            
            // Validate final result
            if (isNaN(finalResult) || finalResult < 0) {
                console.error(`Invalid final result for user ${userId}: ${finalResult}`);
                continue;
            }
            
            // Update balance
            user.balance[0].pending += finalResult;
            
            // Validate updated balance
            if (user.balance[0].pending < 0) {
                console.error(`Negative balance detected for user ${userId}. Previous: ${previousBalance}, Added: ${finalResult}, New: ${user.balance[0].pending}`);
                // Reset to 0 to prevent negative balance
                user.balance[0].pending = 0;
            }
            
            // Save user
            await user.save();
            
            console.log(`User ${userId} balance updated: ${previousBalance} + ${finalResult} = ${user.balance[0].pending}`);
            
            userResults[userId] = {
                totalWin,
                totalLoss, // Now sending the actual totalLoss value
                finalResult,
                previousBalance,
                updatedBalance: user.balance[0].pending
            };

            // Emit balance update event to this user
            io.to(userId.toString()).emit("balanceUpdate", {
                updatedBalance: user.balance[0].pending
            });

            // Emit finalBetResult directly to this user
            io.to(userId.toString()).emit("finalBetResult", {
                gameId,
                totalWin,
                totalLoss, // Now sending the actual totalLoss value
                finalResult,
                updatedBalance: user.balance[0].pending,
                timeframe
            });

            // Fetch all user bets (not just for this game)
            const allUserBets = await Bet.find({ 
                userId, 
                timeframe,
                gameId: { $ne: null }
            }).sort({ createdAt: -1 }).limit(10).lean();
            
            // Debug: Check if multipliers are present in fetched bets
            console.log(`Sending bets to user ${userId}:`, 
                allUserBets.map(b => ({
                    id: b._id,
                    gameId: b.gameId,
                    result: b.result,
                    multipliers: b.multipliers
                }))
            );
            
            // Send all bets to user
            io.to(userId.toString()).emit("updateBetResultsUI", {
                gameId,
                bets: allUserBets,
                timeframe
            });
            
            // Send user history update
            io.to(userId.toString()).emit("historyUpdate", {
                history: user.history.slice(0, 20).reverse() // Send last 20 entries in reverse order (newest first)
            });
        }
        
        return userResults;
    } catch (error) {
        console.error(`Error updating bet results for timeframe ${timeframe}:`, error);
        return {};
    }
}

function generateGameId(timeframe) {
    // Generate a shorter game ID
    const timestamp = Date.now();
    
    // Convert timestamp to a shorter format (last 6 digits)
    const shortTimestamp = timestamp % 1000000;
    
    // Generate a shorter random part (3 digits)
    const randomPart = Math.floor(Math.random() * 1000);
    
    // Format with leading zeros for consistent length
    const formattedTimestamp = String(shortTimestamp).padStart(6, '0');
    const formattedRandom = String(randomPart).padStart(3, '0');
    
    // Create a shorter game ID format: TF-TIMESTAMP-RANDOM
    // Example: 30-123456-789 (12 characters instead of ~20+)
    return `${timeframe}-${formattedTimestamp}-${formattedRandom}`;
}

function shuffleValues() {
    // Create an array with exactly 3 of each value
    const values = ["0x", "0x", "0x", "2x", "2x", "2x", "4x", "4x", "4x"];
    
    // Fisher-Yates shuffle algorithm
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }
    
    return values;
}

module.exports = {
    initializeSocket,
    calculateMultiplier,
    shuffleValues,
    updateBetResults
};




