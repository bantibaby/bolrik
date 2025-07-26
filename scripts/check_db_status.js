// scripts/check_db_status.js
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseStatus() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bolrik', {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
        console.log('Database URI:', process.env.MONGO_URI || 'mongodb://localhost:27017/bolrik');

        // 1. Count total users
        const totalUsers = await mongoose.connection.collection('users').countDocuments();
        console.log(`\nTotal users in database: ${totalUsers}`);

        if (totalUsers === 0) {
            console.log('No users found in database!');
            return;
        }

        // 2. Check field status
        const usersWithoutFirstWithdraw = await mongoose.connection.collection('users').countDocuments({
            $or: [
                { firstWithdrawalAfterDepositMade: { $exists: false } },
                { firstWithdrawalAfterDepositMade: null },
                { firstWithdrawalAfterDepositMade: { $type: 10 } }
            ]
        });
        console.log(`Users missing firstWithdrawalAfterDepositMade: ${usersWithoutFirstWithdraw}`);

        const usersWithoutBetsCount = await mongoose.connection.collection('users').countDocuments({
            $or: [
                { betsSinceLastWithdraw: { $exists: false } },
                { betsSinceLastWithdraw: null },
                { betsSinceLastWithdraw: { $type: 10 } }
            ]
        });
        console.log(`Users missing betsSinceLastWithdraw: ${usersWithoutBetsCount}`);

        // 3. Show sample user structure
        const sampleUser = await mongoose.connection.collection('users').findOne({});
        if (sampleUser) {
            console.log('\nSample user structure:');
            console.log('- _id:', sampleUser._id);
            console.log('- firstWithdrawalAfterDepositMade:', sampleUser.firstWithdrawalAfterDepositMade);
            console.log('- betsSinceLastWithdraw:', sampleUser.betsSinceLastWithdraw);
            
            if (sampleUser.banking && sampleUser.banking.deposits) {
                console.log('- Total deposits:', sampleUser.banking.deposits.length);
                if (sampleUser.banking.deposits.length > 0) {
                    const firstDeposit = sampleUser.banking.deposits[0];
                    console.log('- First deposit structure:');
                    console.log('  - status:', firstDeposit.status);
                    console.log('  - amount:', firstDeposit.amount);
                    console.log('  - bettingProgress:', firstDeposit.bettingProgress);
                    console.log('  - fulfilled:', firstDeposit.fulfilled);
                }
            } else {
                console.log('- No banking/deposits found');
            }
        }

        await mongoose.disconnect();
        console.log('\nCheck complete.');

    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

checkDatabaseStatus(); 