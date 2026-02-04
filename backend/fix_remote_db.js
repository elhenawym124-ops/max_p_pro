const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function fixRemoteDb() {
    console.log('🛠️ Attempting to add missing columns to remote DB...');
    const prisma = getSharedPrismaClient();

    try {
        // 1. Add createdByUserId to orders
        console.log('📝 Adding createdByUserId to orders table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS createdByUserId VARCHAR(191) NULL;`);
        console.log('✅ Column createdByUserId added or already exists.');

        // 2. Check if order_notes table exists
        console.log('🔍 Checking order_notes table...');
        await prisma.$queryRawUnsafe(`SELECT 1 FROM order_notes LIMIT 1;`).catch(async (e) => {
            console.log('⚠️ order_notes table missing. Creating it...');
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS order_notes (
                    id VARCHAR(191) PRIMARY KEY,
                    content TEXT NOT NULL,
                    orderId VARCHAR(191) NULL,
                    guestOrderId VARCHAR(191) NULL,
                    authorId VARCHAR(191) NULL,
                    authorName VARCHAR(191) NULL,
                    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                );
            `);
            console.log('✅ table order_notes created.');
        });

        console.log('✨ Database is now ready for testing Logic.');

        // 3. Add lastMessageIsFromCustomer and unreadCount to conversations
        console.log('📝 Adding missing columns to conversations table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lastMessageIsFromCustomer BOOLEAN NOT NULL DEFAULT FALSE;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unreadCount INT NOT NULL DEFAULT 0;`);
        console.log('✅ Columns added to conversations.');

        // 4. Create ai_notifications table
        console.log('📝 Creating ai_notifications table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS ai_notifications (
                id VARCHAR(191) PRIMARY KEY,
                companyId VARCHAR(191) NOT NULL,
                type VARCHAR(191) NOT NULL,
                severity VARCHAR(191) NOT NULL DEFAULT 'medium',
                title VARCHAR(191) NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT NULL,
                isRead BOOLEAN NOT NULL DEFAULT false,
                readAt DATETIME(3) NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                INDEX ai_notifications_companyId_idx (companyId),
                INDEX ai_notifications_createdAt_idx (createdAt),
                INDEX ai_notifications_isRead_idx (isRead)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ table ai_notifications created.');

        // 5. Create ai_failure_logs table
        console.log('📝 Creating ai_failure_logs table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS ai_failure_logs (
                id VARCHAR(191) PRIMARY KEY,
                companyId VARCHAR(191) NOT NULL,
                conversationId VARCHAR(191) NULL,
                customerId VARCHAR(191) NULL,
                errorType VARCHAR(191) NOT NULL,
                errorMessage TEXT NULL,
                context TEXT NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                INDEX ai_failure_logs_companyId_idx (companyId),
                INDEX ai_failure_logs_createdAt_idx (createdAt),
                INDEX ai_failure_logs_errorType_idx (errorType)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ table ai_failure_logs created.');

    } catch (error) {
        console.error('❌ SQL execution failed:', error.message);
    }
}

fixRemoteDb()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
