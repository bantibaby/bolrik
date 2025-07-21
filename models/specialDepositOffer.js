const mongoose = require('mongoose');

const specialDepositOfferSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mobile: { type: String, required: true },
  fullname: { type: String, required: true },
  depositAmount: { type: Number, required: true },
  expectedPayout: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'addedToWallet'],
    default: 'pending'
  },
  utr: { type: String },
  screenshot: { type: String },
  adminNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

specialDepositOfferSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SpecialDepositOffer', specialDepositOfferSchema); 