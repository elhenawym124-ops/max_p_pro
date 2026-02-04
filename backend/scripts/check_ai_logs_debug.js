const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkLogs() {
    const prisma = getSharedPrismaClient();
    try {
        console.log('🔍 Checking AiInteraction table...');
        const count = await prisma.aiInteraction.count();
        console.log(`📊 Total AI Logs found: ${count}`);

        if (count > 0) {
            const logs = await prisma.aiInteraction.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, modelUsed: true, keyName: true, createdAt: true }
            });
            console.log('🕒 Recent Logs:', logs);
        } else {
            console.log('❌ No logs found. The logging mechanism might be failing.');
        }
    } catch (error) {
        console.error('❌ Error checking logs:', error);
    } finally {
        process.exit();
    }
}

checkLogs();
