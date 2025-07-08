const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({

  gameId: { type: String, required: true, unique: true }, // Unique Game ID
  resultNumber: { 
    type: Number, 
    required: true 
  }, 

  

  values: { 
    type: [String],
    required: true 
  },     
  timeframe: { 
    type: Number, 
    enum: [30, 45, 60, 150], 
    default: 30 
  }, // seconds (30sec, 45sec, 1min, 2:30min)
  betsResolved: { type: Boolean, default: false }, // Kya bets resolve ho chuki hain?
  
  createdAt: {  
    type: Date, 
    default: Date.now 
  }  
});

module.exports = mongoose.model("Result", resultSchema);
