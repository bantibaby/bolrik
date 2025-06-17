
const mongoose = require("mongoose");
const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameId: { type: String },
  betNumber: [{ type: Number }],
  betAmount: { type: Number },
  result: { type: String, default: "Pending" },
  status: { type: String, enum: ["pending", "won", "lost"], default: "pending" },
  payout: { type: Number, default: 0 },
  multiplier: { type: String, default: "wait" },  // ✅ Multiplier field added
  isWelcomeBonus: { type: Boolean, default: false }, // Track if bet was placed using welcome bonus
  betCount: { type: Number, default: 0 }, // Track which bet number this is for the user
  createdAt: { type: Date, default: Date.now } // Add timestamp for better tracking
}, {
  timestamps: true // Add automatic timestamps for createdAt and updatedAt
});

// Add index for faster queries
betSchema.index({ userId: 1, gameId: 1 });
betSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Bet", betSchema);
