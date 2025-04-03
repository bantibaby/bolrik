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
  betsResolved: { type: Boolean, default: false }, // Kya bets resolve ho chuki hain?
  
  createdAt: {  
    type: Date, 
    default: Date.now 
  }  
});

module.exports = mongoose.model("Result", resultSchema);
