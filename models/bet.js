
const mongoose = require("mongoose");
const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameId: { type: String },
  betNumber: [{ type: Number }],
  betAmount: { type: Number },
  result: { type: String, default: "Pending" },
  status: { type: String, enum: ["pending", "won", "lost"], default: "pending" },
  payout: { type: Number, default: 0 },
  multiplier: { type: String, default: "wait" }  // ✅ Multiplier field added
});
module.exports = mongoose.model("Bet", betSchema);
