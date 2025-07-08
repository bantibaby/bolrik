const mongoose = require("mongoose");

const preResultSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    resultNumber: { type: Number, required: true },
    values: { type: [String], required: true }, // e.g. ["0x", "2x", "4x"]
    timeframe: { type: Number, enum: [30, 45, 60, 150], default: 30 }, // seconds (30sec, 45sec, 1min, 2:30min)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreResult", preResultSchema);
