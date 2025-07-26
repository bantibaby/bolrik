// scripts/fix_first_withdrawal_flag.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixFirstWithdrawalFlag() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bolrik');
    console.log('Connected to MongoDB');

    // Find users with firstWithdrawalAfterDepositMade: false and at least 1 withdrawal
    const users = await mongoose.connection.collection('users').find({
        firstWithdrawalAfterDepositMade: false,
        "banking.withdrawals.0": { $exists: true }
    }).toArray();

    let updated = 0;
    for (const user of users) {
        await mongoose.connection.collection('users').updateOne(
            { _id: user._id },
            { $set: { firstWithdrawalAfterDepositMade: true } }
        );
        updated++;
    }
    console.log(`firstWithdrawalAfterDepositMade set to true for ${updated} users`);
    await mongoose.disconnect();
    console.log('Done.');
}

fixFirstWithdrawalFlag().catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
}); 