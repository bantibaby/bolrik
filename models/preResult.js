const mongoose = require("mongoose");

const preResultSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    resultNumber: { type: Number, required: true },
    values: { type: [String], required: true }, // e.g. ["0x", "2x", "4x"]
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreResult", preResultSchema);
