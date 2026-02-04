const { PrismaClient } = require('../prisma/generated/mysql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('Starting manual DB update for Assets (Direct Client)...');
    console.log('DB URL:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');

    const prisma = new PrismaClient();

    try {
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected.');

        // 1. Create asset_custody_history table if it doesn't exist
        console.log('Creating/Checking asset_custody_history table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS asset_custody_history (
                id VARCHAR(191) NOT NULL,
                assetId VARCHAR(191) NOT NULL,
                userId VARCHAR(191) NOT NULL,
                assignedBy VARCHAR(191),
                action VARCHAR(191) NOT NULL,
                assignedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                expectedReturnAt DATETIME(3),
                returnedAt DATETIME(3),
                returnCondition VARCHAR(191),
                notes TEXT,
                documentUrl VARCHAR(191),
                signatureUrl VARCHAR(191),
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                PRIMARY KEY (id),
                INDEX asset_custody_history_assetId_idx (assetId),
                INDEX asset_custody_history_userId_idx (userId),
                INDEX asset_custody_history_assignedBy_idx (assignedBy)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('Table asset_custody_history handled.');

        // 2. Add expectedReturnAt to asset_assignments if not exists
        console.log('Adding expectedReturnAt to asset_assignments...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE asset_assignments 
                ADD COLUMN expectedReturnAt DATETIME(3) NULL;
            `);
            console.log('Column added.');
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log('Column expectedReturnAt already exists in asset_assignments.');
            } else {
                console.log('Error adding column (might be okay if exists):', e.message);
            }
        }

        // 3. Update asset_custody_history to include expectedReturnAt if it was created before but missing column
        console.log('Checking expectedReturnAt in asset_custody_history...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE asset_custody_history 
                ADD COLUMN expectedReturnAt DATETIME(3) NULL;
            `);
            console.log('Column added to history.');
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log('Column expectedReturnAt already exists in history.');
            }
        }

        // 4. Add conditionOnAssign to asset_assignments
        console.log('Adding conditionOnAssign to asset_assignments...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE asset_assignments 
                ADD COLUMN conditionOnAssign VARCHAR(191) NULL;
            `);
            console.log('Column conditionOnAssign added to assignments.');
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log('Column conditionOnAssign already exists in assignments.');
            } else {
                console.log('Error adding conditionOnAssign:', e.message);
            }
        }

        // 5. Add conditionOnAssign to asset_custody_history
        console.log('Adding conditionOnAssign to asset_custody_history...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE asset_custody_history 
                ADD COLUMN conditionOnAssign VARCHAR(191) NULL;
            `);
            console.log('Column conditionOnAssign added to history.');
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log('Column conditionOnAssign already exists in history.');
            } else {
                console.log('Error adding conditionOnAssign to history:', e.message);
            }
        }

        console.log('DB Update completed successfully.');
    } catch (e) {
        console.error('Error updating DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
