const { Server } = require('socket.io'); 
const mongoose = require("mongoose");
const crypto = require("crypto");
const connectDB = require("../config/db");
const Result = require("../models/result");
const Bet = require("../models/bet");
const User = require("../models/user");
const PreResult = require("../models/preResult");
const connectedUsers = new Map();
let countdownTime = 150;
let flipCount = 0;
global.currentGameId = "";
global.countdownTime = countdownTime;

function initializeSocket(server) {
    const io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId || socket.id;
        
        // यूजर रूम जॉइन करने का बेहतर हैंडलिंग
        socket.on("joinRoom", (data) => {
            try {
                // यूजर आईडी की वैलिडेशन और सुरक्षित हैंडलिंग
                let userIdToJoin = '';
                
                if (data && data.userId) {
                    userIdToJoin = data.userId.toString();
                    console.log(`🔗 User ${userIdToJoin} joined room`);
                } else if (userId) {
                    userIdToJoin = userId.toString();
                    console.log(`🔗 User ${userIdToJoin} joined room (fallback method)`);
                } else {
                    console.error("❌ joinRoom event received without userId");
                    return;
                }
                
                // यूजर कनेक्शन को ट्रैक करें
                connectedUsers.set(userIdToJoin, socket.id);
                
                // यूजर को उसके रूम में जोड़ें
                socket.join(userIdToJoin);
                
                // यूजर को संदेश भेजें कि वे जुड़ गए हैं
                socket.emit("roomJoined", { 
                    success: true, 
                    message: "Room joined successfully" 
                });
            } catch (error) {
                console.error("❌ Error joining room:", error);
                socket.emit("roomJoined", { 
                    success: false, 
                    message: "Failed to join room" 
                });
            }
        });
        


        if (connectedUsers.has(userId)) {
            console.log(`⚠️ Duplicate connection prevented for User ID: ${userId}`);
            socket.disconnect();
            return;
        }

        connectedUsers.set(userId, socket.id);
        console.log(`✅ User connected: ${userId}`);

        socket.emit("timerUpdate", countdownTime);

        socket.on("disconnect", () => {
            connectedUsers.delete(userId);
            console.log(`❌ User disconnected: ${userId}`);
        });

        // पेजिनेटेड रिजल्ट्स के लिए इवेंट हैंडलर
        socket.on("fetchResults", async ({ page = 1, limit = 10 }) => {
            try {
                const skip = (page - 1) * limit;
                const totalResults = await Result.countDocuments();
                
                const results = await Result.find({})
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit);

                socket.emit("resultsData", {
                    results,
                    currentPage: page,
                    totalPages: Math.ceil(totalResults / limit)
                });
            } catch (error) {
                console.error("Error fetching results:", error);
                socket.emit("error", "Failed to fetch results");
            }
        });
    });

    startCountdown(io);
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


// ✅ Fetch Next Result Number
async function getNextResultNumber() {
    const lastResult = await Result.findOne().sort({ resultNumber: -1 });
    return lastResult ? lastResult.resultNumber + 1 : 1;
}



async function storePreResult(gameId, resultNumber, buttonValues) {
    try {
        // ✅ **Check karo ki PreResult pehle se available hai ya nahi**
        const existingPreResult = await PreResult.findOne({ gameId });

        if (!existingPreResult) {
            // ✅ **Agar pehle se exist nahi karta, tabhi naya store karo**
            const newPreResult = new PreResult({ gameId, resultNumber, values: buttonValues });
            await newPreResult.save();
        } else {
            console.log("⚠️ PreResult already exists, skipping duplicate storage.");
        }
    } catch (error) {
        console.error("❌ Error saving PreResult to DB:", error);
    }
}

async function startCountdown(io) {
    global.currentGameId = generateGameId();
    console.log(`🔹 Countdown started for Game ID: ${global.currentGameId}`);

    let buttonValues, resultNumber;

    try {
        // ✅ **Get New Unique Result Number**
        resultNumber = await getNextResultNumber();

        // ✅ **Check if PreResult Exists**
        let preResult = await PreResult.findOne({ gameId: global.currentGameId });

        if (preResult) {
            buttonValues = preResult.values;
            resultNumber = preResult.resultNumber;
            console.log("📢 Using Existing PreResult from DB:", preResult);
        } else {
            // ✅ **Store New PreResult Only If Not Already Stored**
            buttonValues = shuffleValues();
            await storePreResult(global.currentGameId, resultNumber, buttonValues);
            // console.log("📢 New PreResult Generated & Stored:", { gameId: global.currentGameId, resultNumber, buttonValues });
        }
    } catch (error) {
        console.error("❌ Error Fetching PreResult:", error);
        return;
    }

    let countdownInterval = setInterval(async () => {
        if (countdownTime > 0) {
            countdownTime--;
            global.countdownTime = countdownTime;
        } else {
            clearInterval(countdownInterval);

            // रिजल्ट दिखाएं और सेव करें
            io.emit("flipButtons", { gameId: global.currentGameId, resultNumber, buttonValues });
            await saveResultToDB(global.currentGameId, resultNumber, buttonValues, io);

            setTimeout(async () => {
                countdownTime = 150;
                global.countdownTime = countdownTime;
                global.currentGameId = generateGameId();

                resultNumber = await getNextResultNumber();

                // UI को पूरी तरह से रीसेट करें
                io.emit("resetUI");
                io.emit("timerUpdate", countdownTime);
                
                // नया राउंड शुरू करें
                startCountdown(io);
            }, 5000);
        }
        io.emit("timerUpdate", countdownTime);
    }, 1000);
}

async function saveResultToDB(gameId, resultNumber, values, io) {
    try {
        const newResult = new Result({ gameId, resultNumber, values });
        await newResult.save();
        console.log("✅ Result saved:", newResult);

        // ✅ Emit flipped button values
        io.emit("flipButtons", { gameId, resultNumber, buttonValues: values });
        console.log("📡 Emitted flipButtons event");

        let userResults = await updateBetResults(gameId, values, io) || {};

        if (Object.keys(userResults).length === 0) {
            console.log("🔸 No users placed bets, skipping final result emission.");
        }

        // ✅ Fetch Updated Bets from DB
        const updatedBets = await Bet.find({ gameId }).lean();
        
        // ✅ Send bet updates only to users who placed a bet
        Object.keys(userResults).forEach(userId => {
            const userBets = updatedBets.filter(bet => bet.userId.toString() === userId);
            io.to(userId.toString()).emit("updateBetResultsUI", {
                gameId,
                bets: userBets
            });
        });

        console.log("📡 Emitted updateBetResultsUI for Game ID:", gameId);

        // Send final results to each user
        Object.keys(userResults).forEach(userId => {
            console.log(`📡 Emitting finalBetResult to User ${userId}:`, userResults[userId]);
            io.to(userId.toString()).emit("finalBetResult", {
                gameId,
                totalWin: userResults[userId].totalWin,
                totalLoss: userResults[userId].totalLoss,
                finalResult: userResults[userId].finalResult,
                updatedBalance: userResults[userId].previousBalance + userResults[userId].finalResult
            });
        });

        // ✅ Fetch Updated Results from DB
        const totalResults = await Result.countDocuments();
        const latestResults = await Result.find({})
            .sort({ createdAt: -1 })
            .limit(10);

        // ✅ Emit updated results to ALL users
        io.emit("newResult", {
            results: latestResults,
            totalPages: Math.ceil(totalResults / 10),
            currentPage: 1
        });

        console.log("📡 Emitted all necessary events successfully");
        flipCount++;
console.log(`🎯 flipButtons emitted ${flipCount} times. Game ID: ${global.currentGameId}`);


    } catch (error) {
        console.error("❌ Error saving result to DB:", error);
    }
}

// ✅ Calculate Bet Multiplier
function calculateMultiplier(selected, buttonValues) {
    let selectedValues = selected.map(num => buttonValues[num - 1]);
    let counts = { "0x": 0, "2x": 0, "4x": 0 };

    selectedValues.forEach(value => {
        if (counts[value] !== undefined) counts[value]++;
    });

    if (counts["2x"] === 3) return "4x";
    if (counts["4x"] === 3) return "8x";
    if (counts["0x"] === 3) return "0x";
    if (counts["2x"] === 2 && counts["0x"] === 1) return "0x";
    if (counts["2x"] === 2 && counts["4x"] === 1) return "2x";
    if (counts["4x"] === 2 && counts["0x"] === 1) return "2x";
    if (counts["4x"] === 2 && counts["2x"] === 1) return "4x";
    // if (counts["4x"] === 2) return "2x";

    return "0x";
}




async function updateBetResults(gameId, buttonValues, io) {
    if (!io) {
        console.error("❌ Error: io is undefined!");
        return {};
    }

    const bets = await Bet.find({ gameId, status: "pending" });
    let userResults = {};

    if (!bets.length) {
        console.log("🔸 No bets found for this round.");
        return userResults;
    }

    // ✅ सभी Users का Total Bet Amount पहले से calculate करें  
    let userTotalBets = {};  

    for (let bet of bets) {
        if (!userTotalBets[bet.userId]) {
            userTotalBets[bet.userId] = 0;
        }
        userTotalBets[bet.userId] += bet.betAmount;
    }

    for (let bet of bets) {
        let multiplier = calculateMultiplier(bet.betNumber, buttonValues);
        let payout = multiplier === "0x" ? 0 : bet.betAmount * parseInt(multiplier);

        bet.result = bet.betNumber.map(num => buttonValues[num - 1]).join(", ");
        bet.status = payout > 0 ? "won" : "lost";
        bet.payout = payout;
        bet.multiplier = multiplier;
        await bet.save();

        // बेट अपडेट होने पर तुरंत यूजर को नोटिफाई करें
        io.to(bet.userId.toString()).emit("updateBetResultsUI", {
            gameId,
            bets: [bet]
        });

        if (!userResults[bet.userId]) {
            const user = await User.findById(bet.userId);
            userResults[bet.userId] = {
                totalWin: 0,
                totalLoss: 0,
                finalResult: 0,
                previousBalance: user.balance[0].pending + userTotalBets[bet.userId]  // ✅ अब सभी bets का टोटल Add होगा
            };
        }

        userResults[bet.userId].totalWin += payout;
        userResults[bet.userId].totalLoss += payout === 0 ? bet.betAmount : 0;

        await User.findOneAndUpdate(
            { _id: bet.userId },
            {
                $push: {
                    history: {
                        gameId: gameId,
                        betAmount: bet.betAmount,
                        betNumber: bet.betNumber,
                        result: bet.result,
                        winAmount: payout,
                        lossAmount: payout === 0 ? bet.betAmount : 0,
                        time: new Date(),
                        multiplier: multiplier
                    }
                }
            }
        );
    }

    for (let userId in userResults) {
        let result = userResults[userId];
        result.finalResult = result.totalWin - result.totalLoss;  

        let lastBal = result.previousBalance - userTotalBets[userId];  
        let updatedBalance = lastBal + result.totalWin;
        // let overall = result.previousBalance - updatedBalance;
        let overall = updatedBalance - result.previousBalance;
        console.log(`over all ${overall}`);
        
        await User.findOneAndUpdate(
            { _id: userId },
            { $set: { "balance.0.pending": updatedBalance } }
        );

        io.to(userId.toString()).emit("balanceUpdate", {
            updatedBalance: updatedBalance
        });

        io.to(userId.toString()).emit("finalBetResult", {
            gameId,
            totalWin: result.totalWin,
            totalLoss: result.totalLoss,
            finalResult: result.finalResult,
            updatedBalance: updatedBalance,
            overall:overall,
        });

        const updatedHistory = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$history" },
            { $sort: { "history.time": -1 } },
            { $group: { _id: "$_id", history: { $push: "$history" } } }
        ]).then(result => result[0]?.history || []);

        io.to(userId.toString()).emit("bettingHistoryUpdate", {
            history: updatedHistory
        });
    }

    console.log("🔹 Final Results Sent:", userResults);
    return userResults;
}


// function generateGameId() {
//     return crypto.randomBytes(3).toString("hex").toUpperCase();
// }


function generateGameId() {
    const now = new Date();
const day = now.getDate().toString().padStart(2, "0"); 
const month = (now.getMonth() + 1).toString().padStart(2, "0"); 
const year = now.getFullYear();
const hours = now.getHours().toString().padStart(2, "0");
const minutes = now.getMinutes().toString().padStart(2, "0");
const seconds = now.getSeconds().toString().padStart(2, "0");
    // return crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${hours}${minutes}${seconds}${day}${month}`
}

function shuffleValues() {
    let values = ["0x", "0x", "0x", "2x", "2x", "2x", "4x", "4x", "4x"];
    return values.sort(() => Math.random() - 0.5);
}

module.exports = { initializeSocket, updateBetResults, generateGameId };




