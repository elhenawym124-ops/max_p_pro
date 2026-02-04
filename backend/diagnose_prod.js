const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function diagnose() {
    console.log('🛸 Production Diagnostics Running...');

    try {
        // 1. Check DB Config via Prisma
        const chatCount = await prisma.message.count({ where: { type: 'IMAGE' } });
        const whatsappCount = await prisma.whatsAppMessage.count({ where: { messageType: 'IMAGE' } });
        const totalMessages = await prisma.message.count();
        const totalWAMessages = await prisma.whatsAppMessage.count();

        console.log(`\n--- Production Counts ---`);
        console.log(`Total Messages: ${totalMessages}`);
        console.log(`Chat Images: ${chatCount}`);
        console.log(`WhatsApp Images: ${whatsappCount}`);
        console.log(`Total WA Messages: ${totalWAMessages}`);

        // Check by type (avoid uppercase issue)
        const chatLower = await prisma.message.count({ where: { type: 'image' } });
        console.log(`Chat images (lowercase): ${chatLower}`);

        // Check for orphaned or invalid dates
        const oldChatCount = await prisma.message.count({
            where: { type: 'IMAGE', createdAt: { lt: new Date() } }
        });
        console.log(`Chat Images with valid createdAt: ${oldChatCount}`);

    } catch (err) {
        console.error('❌ Diagnostics failed:', err);
    }
    process.exit(0);
}

diagnose();
