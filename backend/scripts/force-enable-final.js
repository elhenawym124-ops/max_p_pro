
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function run() {
    const id = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`🚀 Forcing Enable for Company: ${id}`);

    try {
        const s = await prisma.aiSettings.upsert({
            where: { companyId: id },
            update: { autoReplyEnabled: true, replyMode: 'all' },
            create: {
                companyId: id,
                autoReplyEnabled: true,
                replyMode: 'all',
                qualityEvaluationEnabled: true,
                multimodalEnabled: true,
                ragEnabled: true
            }
        });
        console.log(`✅ FORCE_STATUS: ${s.autoReplyEnabled}`);
        console.log(`   ReplyMode: ${s.replyMode}`);
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
