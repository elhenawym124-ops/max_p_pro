/**
 * Create RewardRecord table in production database
 * This script manually creates the table if prisma db push fails
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function createRewardTables() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('🔧 Creating RewardRecord table...');
        
        // Check if table already exists
        try {
            const count = await prisma.rewardRecord.count();
            console.log(`✅ Table already exists with ${count} records`);
            return;
        } catch (error) {
            console.log('ℹ️ Table does not exist, creating...');
        }
        
        // Create table using raw SQL
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS hr_reward_records (
                id VARCHAR(191) NOT NULL PRIMARY KEY,
                companyId VARCHAR(191) NOT NULL,
                userId VARCHAR(191) NOT NULL,
                rewardTypeId VARCHAR(191) NOT NULL,
                rewardName VARCHAR(255) NOT NULL,
                rewardCategory VARCHAR(100) NOT NULL,
                calculatedValue DECIMAL(10,2) NOT NULL DEFAULT 0,
                calculationDetails TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                appliedMonth INT NOT NULL,
                appliedYear INT NOT NULL,
                periodStart DATETIME(3) NOT NULL,
                periodEnd DATETIME(3) NOT NULL,
                reason TEXT,
                eligibilityMet TEXT,
                isIncludedInPayroll BOOLEAN NOT NULL DEFAULT false,
                isLocked BOOLEAN NOT NULL DEFAULT false,
                approvedBy VARCHAR(191),
                approvedAt DATETIME(3),
                appliedAt DATETIME(3),
                voidedBy VARCHAR(191),
                voidedAt DATETIME(3),
                voidReason TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                INDEX idx_hr_reward_records_companyId (companyId),
                INDEX idx_hr_reward_records_userId (userId),
                INDEX idx_hr_reward_records_rewardTypeId (rewardTypeId),
                INDEX idx_hr_reward_records_status (status),
                INDEX idx_hr_reward_records_appliedMonth (appliedMonth),
                INDEX idx_hr_reward_records_appliedYear (appliedYear),
                CONSTRAINT hr_reward_records_companyId_fkey FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT hr_reward_records_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT hr_reward_records_rewardTypeId_fkey FOREIGN KEY (rewardTypeId) REFERENCES hr_reward_types(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log('✅ Table hr_reward_records created successfully!');
        
        // Verify table was created
        const count = await prisma.rewardRecord.count();
        console.log(`✅ Verification: Table exists with ${count} records`);
        
    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createRewardTables()
    .then(() => {
        console.log('✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Failed:', error);
        process.exit(1);
    });
