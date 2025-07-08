const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  startTime: { type: Date, required: true }, // काउंटडाउन शुरू होने का समय
  endTime: { type: Date, required: true },   // काउंटडाउन खत्म होने का समय
  timeframe: { type: Number, enum: [30, 45, 60, 150], default: 30 } // seconds (30sec, 45sec, 1min, 2:30min)
});

module.exports = mongoose.model("Game", gameSchema);
