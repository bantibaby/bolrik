const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  startTime: { type: Date, required: true }, // काउंटडाउन शुरू होने का समय
  endTime: { type: Date, required: true },   // काउंटडाउन खत्म होने का समय
});

module.exports = mongoose.model("Game", gameSchema);
