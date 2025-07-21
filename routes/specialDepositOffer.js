const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const SpecialDepositOffer = require('../models/specialDepositOffer');
const User = require('../models/user');

// Multer config for screenshot upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// User submits special deposit offer
router.post('/submit', auth, upload.single('screenshot'), async (req, res) => {
  try {
    const { depositAmount, expectedPayout, utr } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const offer = new SpecialDepositOffer({
      user: user._id,
      mobile: user.mobile,
      fullname: user.fullname,
      depositAmount,
      expectedPayout,
      utr,
      screenshot: req.file ? '/uploads/' + req.file.filename : undefined
    });
    await offer.save();
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting offer', error: err.message });
  }
});

// Admin middleware (replace with your admin check)
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin only' });
}

// Admin: list all special deposit offers
router.get('/admin/list', auth, adminOnly, async (req, res) => {
  const offers = await SpecialDepositOffer.find().sort({ createdAt: -1 });
  res.json({ success: true, offers });
});

// Admin: approve
router.post('/admin/approve/:id', auth, adminOnly, async (req, res) => {
  const offer = await SpecialDepositOffer.findByIdAndUpdate(req.params.id, { status: 'approved', updatedAt: new Date() }, { new: true });
  res.json({ success: true, offer });
});

// Admin: reject
router.post('/admin/reject/:id', auth, adminOnly, async (req, res) => {
  const offer = await SpecialDepositOffer.findByIdAndUpdate(req.params.id, { status: 'rejected', updatedAt: new Date(), adminNote: req.body.note }, { new: true });
  res.json({ success: true, offer });
});

// Admin: mark as paid
router.post('/admin/paid/:id', auth, adminOnly, async (req, res) => {
  const offer = await SpecialDepositOffer.findByIdAndUpdate(req.params.id, { status: 'paid', updatedAt: new Date() }, { new: true });
  res.json({ success: true, offer });
});

// Admin: add to wallet
router.post('/admin/add-to-wallet/:id', auth, adminOnly, async (req, res) => {
  const offer = await SpecialDepositOffer.findById(req.params.id);
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
  const user = await User.findById(offer.user);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  // Add depositAmount to user's pending balance
  user.balance[0].pending += Number(offer.depositAmount);
  await user.save();
  offer.status = 'addedToWallet';
  offer.updatedAt = new Date();
  await offer.save();
  res.json({ success: true, offer });
});

module.exports = router; 