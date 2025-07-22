const mongoose = require("mongoose");
const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameId: { type: String },
  betNumber: [{ type: Number }],
  betAmount: { type: Number }, // Displayed bet amount (what user sees)
  actualBetAmount: { type: Number }, // Actual bet amount after 10% fee (used for calculations)
  timeframe: { type: Number, enum: [30, 45, 60, 150], default: 30 }, // seconds (30sec, 45sec, 1min, 2:30min)
  result: { type: String, default: "Pending" },
  status: { type: String, enum: ["pending", "won", "lost"], default: "pending" },
  payout: { type: Number, default: 0 },
  multiplier: { type: String, default: "wait" },  // ✅ Multiplier field added
  multipliers: [{ type: String }], // ✅ Individual multipliers for each bet number
  betCount: { type: Number, default: 0 }, // Track which bet number this is for the user
  createdAt: { type: Date, default: Date.now } // Add timestamp for better tracking
}, {
  timestamps: true // Add automatic timestamps for createdAt and updatedAt
});

// Add index for faster queries
betSchema.index({ userId: 1, gameId: 1 });
betSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Bet", betSchema);
