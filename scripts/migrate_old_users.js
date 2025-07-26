// scripts/migrate_old_users.js
const mongoose = require('mongoose');
require('dotenv').config();

async function migrateOldUsers() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bolrik', {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // 1. Set firstWithdrawalAfterDepositMade = true where missing/null
    const res1 = await mongoose.connection.collection('users').updateMany(
        { $or: [
            { firstWithdrawalAfterDepositMade: { $exists: false } },
            { firstWithdrawalAfterDepositMade: null },
            { firstWithdrawalAfterDepositMade: { $type: 10 } }
        ]},
        { $set: { firstWithdrawalAfterDepositMade: true } }
    );
    console.log(`firstWithdrawalAfterDepositMade set for ${res1.modifiedCount} users`);

    // 2. Set betsSinceLastWithdraw = 0 where missing/null
    const res2 = await mongoose.connection.collection('users').updateMany(
        { $or: [
            { betsSinceLastWithdraw: { $exists: false } },
            { betsSinceLastWithdraw: null },
            { betsSinceLastWithdraw: { $type: 10 } }
        ]},
        { $set: { betsSinceLastWithdraw: 0 } }
    );
    console.log(`betsSinceLastWithdraw set for ${res2.modifiedCount} users`);

    // 3. For all users, update all deposits: set bettingProgress=0, fulfilled=false if missing
    const users = await mongoose.connection.collection('users').find({}).toArray();
    let updatedDeposits = 0;
    for (const user of users) {
        let changed = false;
        if (user.banking && user.banking.deposits) {
            for (const dep of user.banking.deposits) {
                if (dep.status === "Approved") {
                    if (typeof dep.bettingProgress === 'undefined') {
                        dep.bettingProgress = 0;
                        changed = true;
                    }
                    if (typeof dep.fulfilled === 'undefined') {
                        dep.fulfilled = false;
                        changed = true;
                    }
                }
            }
            if (changed) {
                await mongoose.connection.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { "banking.deposits": user.banking.deposits } }
                );
                updatedDeposits++;
            }
        }
    }
    console.log(`Updated deposits for ${updatedDeposits} users`);

    await mongoose.disconnect();
    console.log('Migration complete.');
}

migrateOldUsers().catch(err => {
    console.error('Migration failed:', err);
    mongoose.disconnect();
}); 