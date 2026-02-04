
const systemManager = require('./services/systemManager');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function runDebug() {
    console.log('🚀 Starting Debug Script for System Initialization...');
    try {
        // Ensure DB connection
        const prisma = getSharedPrismaClient();

        console.log('📋 Current Systems in DB (Before):');
        const systemsBefore = await prisma.systemSettings.findMany({ select: { systemName: true } });
        console.log(systemsBefore.map(s => s.systemName));

        console.log('\n⚙️ Running initializeSystemSettings()...');
        await systemManager.initializeSystemSettings();

        console.log('\n📋 Current Systems in DB (After):');
        const systemsAfter = await prisma.systemSettings.findMany({ select: { systemName: true } });
        console.log(systemsAfter.map(s => s.systemName));

        console.log('\n✅ Debug check complete.');
    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        process.exit();
    }
}

runDebug();
