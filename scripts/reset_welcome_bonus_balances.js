/**
 * Reset Welcome Bonus Balances Script
 * ===================================
 * 
 * IMPORTANT: This script permanently modifies user balances in the database.
 * Make sure you understand what it does before running it.
 * 
 * Purpose:
 * --------
 * This script is designed to remove welcome bonus amounts and any winnings derived 
 * from welcome bonuses from user balances, while preserving legitimate deposit amounts 
 * and deposit bonuses.
 * 
 * How it works:
 * ------------
 * 1. For each user, it calculates the total of all approved deposits and their associated bonuses
 * 2. It compares this "deposit-related balance" with the user's current balance
 * 3. If the current balance is higher than the deposit-related balance, the difference
 *    is considered to be from welcome bonuses or winnings from welcome bonuses
 * 4. The script then resets the user's balance to only include the deposit-related amount
 * 
 * Safety features:
 * ---------------
 * - Dry run mode (--dry-run) to see what would change without making actual changes
 * - Confirmation prompt in live mode to prevent accidental execution
 * - Complete backup of all affected balances before making changes
 * - Detailed logging of all changes made
 * 
 * Usage:
 * ------
 * - Regular run: node reset_welcome_bonus_balances.js
 * - Dry run (no changes): node reset_welcome_bonus_balances.js --dry-run
 * - Custom MongoDB URI: node reset_welcome_bonus_balances.js --uri mongodb://username:password@hostname:port/database
 * - Both options: node reset_welcome_bonus_balances.js --dry-run --uri mongodb://username:password@hostname:port/database
 * 
 * Examples for different databases:
 * -------------------------------
 * - Production DB: node reset_welcome_bonus_balances.js --uri mongodb+srv://username:password@cluster0.mongodb.net/production
 * - Development DB: node reset_welcome_bonus_balances.js --uri mongodb+srv://username:password@cluster0.mongodb.net/development
 * - Local DB: node reset_welcome_bonus_balances.js --uri mongodb://localhost:27017/bolrik
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

// Get custom MongoDB URI if provided
let customMongoURI = null;
const uriIndex = process.argv.indexOf('--uri');
if (uriIndex !== -1 && process.argv.length > uriIndex + 1) {
    customMongoURI = process.argv[uriIndex + 1];
}

// Create readline interface for confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt for confirmation
function confirmAction() {
    return new Promise((resolve) => {
        if (isDryRun) {
            // No confirmation needed for dry run
            resolve(true);
            return;
        }
        
        console.log('\n⚠️  WARNING: This will permanently modify user balances! ⚠️');
        console.log('This action will remove welcome bonus amounts and associated winnings from all user balances.');
        console.log('A backup will be created, but this operation cannot be easily undone.');
        
        if (customMongoURI) {
            console.log(`\n📊 Target Database: ${customMongoURI}`);
        } else {
            console.log('\n📊 Target Database: Default from environment');
        }
        
        rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

// Custom connect function to use provided URI
async function connectToMongoDB() {
    try {
        const mongoURI = customMongoURI || process.env.MONGO_URI;
        
        if (!mongoURI) {
            throw new Error('No MongoDB URI provided. Please set MONGO_URI in .env file or use --uri option.');
        }
        
        console.log(`🔄 Connecting to MongoDB${customMongoURI ? ' (using custom URI)' : ''}...`);
        
        // Extract database name from URI for display (without showing credentials)
        let dbName = 'unknown';
        try {
            const uriParts = mongoURI.split('/');
            if (uriParts.length > 0) {
                dbName = uriParts[uriParts.length - 1].split('?')[0];
            }
        } catch (err) {
            // Ignore parsing errors
        }
        
        console.log(`📊 Database: ${dbName}`);
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            family: 4
        });
        
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.error('  - Check if MongoDB server is running');
        } else if (error.message.includes('Authentication failed')) {
            console.error('  - Check username and password in connection string');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('  - Check hostname in connection string');
        }
        return false;
    }
}

async function resetWelcomeBonusBalances() {
    try {
        console.log(`🔄 Running in ${isDryRun ? 'DRY RUN' : 'LIVE'} mode`);
        
        // Get confirmation before proceeding in live mode
        const confirmed = await confirmAction();
        if (!confirmed) {
            console.log('❌ Operation cancelled by user');
            rl.close();
            return;
        }
        
        // Connect to MongoDB with custom URI if provided
        const connected = await connectToMongoDB();
        if (!connected) {
            console.error('❌ Failed to connect to MongoDB. Exiting...');
            rl.close();
            return;
        }
        
        // Dynamically import User model after connection is established
        // This ensures we're using the correct connection
        const User = require('../models/user');
        
        console.log('🔍 Finding all users...');
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users`);
        
        if (users.length === 0) {
            console.warn('⚠️ No users found in database. Please check your connection string.');
            rl.close();
            return;
        }
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let totalRemovedAmount = 0;
        
        // Prepare backup data
        const backupData = [];
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupFilename = `balance_backup_${timestamp}.json`;
        
        console.log('🔄 Processing users...');
        
        for (const user of users) {
            try {
                // Calculate total approved deposits and bonuses
                let totalDepositAmount = 0;
                let totalDepositBonus = 0;
                
                if (user.banking && user.banking.deposits && user.banking.deposits.length > 0) {
                    user.banking.deposits.forEach(deposit => {
                        if (deposit.status === 'Approved') {
                            totalDepositAmount += deposit.amount || 0;
                            totalDepositBonus += deposit.bonus || 0;
                        }
                    });
                }
                
                // Calculate total deposit-related balance
                const depositRelatedBalance = totalDepositAmount + totalDepositBonus;
                
                // Get current balance
                const currentBalance = user.balance[0]?.pending || 0;
                const removedAmount = Math.max(0, currentBalance - depositRelatedBalance);
                
                // If current balance is greater than deposit-related balance,
                // it means there's welcome bonus or winnings from welcome bonus
                if (currentBalance > depositRelatedBalance) {
                    console.log(`👤 User: ${user.fullname} (${user.mobile})`);
                    console.log(`   Current Balance: ₹${currentBalance}`);
                    console.log(`   Deposit Amount: ₹${totalDepositAmount}`);
                    console.log(`   Deposit Bonus: ₹${totalDepositBonus}`);
                    console.log(`   Deposit-Related Balance: ₹${depositRelatedBalance}`);
                    console.log(`   Welcome Bonus & Winnings to Remove: ₹${removedAmount}`);
                    
                    totalRemovedAmount += removedAmount;
                    
                    // Add to backup
                    backupData.push({
                        userId: user._id.toString(),
                        mobile: user.mobile,
                        fullname: user.fullname,
                        originalBalance: currentBalance,
                        depositAmount: totalDepositAmount,
                        depositBonus: totalDepositBonus,
                        newBalance: depositRelatedBalance,
                        removedAmount: removedAmount,
                        timestamp: new Date()
                    });
                    
                    if (!isDryRun) {
                        // Update user's balance to only include deposit-related balance
                        user.balance[0].pending = depositRelatedBalance;
                        await user.save();
                        console.log(`✅ Balance reset to ₹${depositRelatedBalance}`);
                    } else {
                        console.log(`🔍 [DRY RUN] Would reset balance to ₹${depositRelatedBalance}`);
                    }
                    
                    updatedCount++;
                } else {
                    // User doesn't have welcome bonus or winnings from it
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing user ${user.fullname} (${user.mobile}):`, error);
                errorCount++;
            }
        }
        
        // Save backup file
        if (backupData.length > 0) {
            const backupDir = path.join(__dirname, '../backups');
            
            // Create backups directory if it doesn't exist
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupPath = path.join(backupDir, backupFilename);
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`💾 Backup saved to ${backupPath}`);
        }
        
        console.log('\n📊 Summary:');
        console.log(`${isDryRun ? '🔍 [DRY RUN] Would update' : '✅ Updated'} users: ${updatedCount}`);
        console.log(`⏭️ Skipped users (no welcome bonus): ${skippedCount}`);
        console.log(`❌ Error count: ${errorCount}`);
        console.log(`🔄 Total processed: ${users.length}`);
        console.log(`💰 Total amount removed: ₹${totalRemovedAmount.toFixed(2)}`);
        
        if (isDryRun) {
            console.log('\n🔍 This was a dry run. No changes were made.');
            console.log('   To apply changes, run without the --dry-run flag.');
        } else {
            console.log('\n✅ All balances have been updated successfully.');
            console.log(`   Backup file: ${backupFilename}`);
        }
        
    } catch (error) {
        console.error('❌ Script error:', error);
    } finally {
        console.log('👋 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        rl.close();
    }
}

// Show usage examples if --help flag is provided
if (process.argv.includes('--help')) {
    console.log('\n📚 Reset Welcome Bonus Balances Script - Usage Examples:');
    console.log('---------------------------------------------------');
    console.log('1. Dry run with default database:');
    console.log('   node scripts/reset_welcome_bonus_balances.js --dry-run');
    console.log('\n2. Live run with default database:');
    console.log('   node scripts/reset_welcome_bonus_balances.js');
    console.log('\n3. Dry run with custom database:');
    console.log('   node scripts/reset_welcome_bonus_balances.js --dry-run --uri mongodb://username:password@hostname:port/database');
    console.log('\n4. Live run with custom database:');
    console.log('   node scripts/reset_welcome_bonus_balances.js --uri mongodb://username:password@hostname:port/database');
    console.log('\nExamples for different databases:');
    console.log('- Production: node scripts/reset_welcome_bonus_balances.js --uri mongodb+srv://username:password@cluster0.mongodb.net/production');
    console.log('- Development: node scripts/reset_welcome_bonus_balances.js --uri mongodb+srv://username:password@cluster0.mongodb.net/development');
    console.log('- Local: node scripts/reset_welcome_bonus_balances.js --uri mongodb://localhost:27017/bolrik');
    process.exit(0);
}

// Run the script
resetWelcomeBonusBalances()
    .then(() => {
        console.log('✅ Script completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }); 