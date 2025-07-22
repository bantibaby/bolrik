// scripts/migrate_users_to_latest_schema.js
const mongoose = require('mongoose');
const User = require('../models/user');

async function migrateUsers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolrik');
  const users = await User.find({});
  for (const user of users) {
    let updated = false;
    // 1. banking object
    if (!user.banking) {
      user.banking = {
        bankName: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
        deposits: [],
        withdrawals: []
      };
      updated = true;
    } else {
      if (!user.banking.deposits) { user.banking.deposits = []; updated = true; }
      if (!user.banking.withdrawals) { user.banking.withdrawals = []; updated = true; }
      if (!user.banking.bankName) { user.banking.bankName = ''; updated = true; }
      if (!user.banking.accountNumber) { user.banking.accountNumber = ''; updated = true; }
      if (!user.banking.ifsc) { user.banking.ifsc = ''; updated = true; }
      if (!user.banking.upiId) { user.banking.upiId = ''; updated = true; }
    }
    // 2. balance array
    if (!user.balance || !Array.isArray(user.balance) || user.balance.length === 0) {
      user.balance = [{ pending: 0, bonus: 0 }];
      updated = true;
    }
    // 3. referredUsers array
    if (!user.referredUsers) {
      user.referredUsers = [];
      updated = true;
    }
    // 4. referralCode
    if (!user.referralCode) {
      user.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      updated = true;
    }
    // 5. Other new fields (as per your latest schema)
    if (user.withdrawLimitCrossed === undefined) { user.withdrawLimitCrossed = false; updated = true; }
    if (user.qualifiedReferralsBeforeLimitCross === undefined) { user.qualifiedReferralsBeforeLimitCross = 0; updated = true; }
    if (user.nextWithdrawPhase === undefined) { user.nextWithdrawPhase = 1; updated = true; }
    if (user.referralBonusWithdrawals === undefined) { user.referralBonusWithdrawals = 0; updated = true; }
    if (user.referralEarnings === undefined) { user.referralEarnings = 0; updated = true; }
    if (user.adminNotified === undefined) { user.adminNotified = false; updated = true; }
    // 6. tokens array
    if (!user.tokens) { user.tokens = []; updated = true; }
    // 7. history array
    if (!user.history) { user.history = []; updated = true; }
    // 8. referredBy
    if (user.referredBy === undefined) { user.referredBy = null; updated = true; }
    // 9. nextWithdrawUnlockDate
    if (user.nextWithdrawUnlockDate === undefined) { user.nextWithdrawUnlockDate = null; updated = true; }
    // 10. createdAt fallback
    if (!user.createdAt) { user.createdAt = new Date(); updated = true; }
    if (updated) {
      await user.save();
      console.log(`Updated user: ${user.fullname} (${user.mobile})`);
    }
  }
  console.log('Migration complete!');
  process.exit();
}

migrateUsers(); 