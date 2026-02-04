/**
 * Check if RewardRecord table exists in database
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkRewardTable() {
    try {
        const prisma = getSharedPrismaClient();
        
        console.log('🔍 Checking if RewardRecord table exists...');
        
        // Try to count records
        const count = await prisma.rewardRecord.count();
        console.log(`✅ RewardRecord table exists! Current count: ${count}`);
        
        // Try to find one record
        const sample = await prisma.rewardRecord.findFirst();
        if (sample) {
            console.log('✅ Sample record found:', sample.id);
        } else {
            console.log('ℹ️ Table is empty (no records yet)');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking RewardRecord table:', error.message);
        console.error('Full error:', error);
        
        if (error.message.includes('does not exist') || error.message.includes('Unknown arg')) {
            console.error('\n⚠️ RewardRecord model not found in Prisma Client!');
            console.error('💡 Solution: Run "npx prisma generate" to regenerate Prisma Client');
        }
        
        if (error.code === 'P2021') {
            console.error('\n⚠️ Table hr_reward_records does not exist in database!');
            console.error('💡 Solution: Run "npx prisma db push --accept-data-loss" to create the table');
        }
        
        process.exit(1);
    }
}

checkRewardTable();
