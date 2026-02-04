
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllSessions() {
    console.log('🗑️  Deleting ALL WhatsApp sessions from database...');
    try {
        const result = await prisma.whatsAppSession.deleteMany();
        console.log(`✅ Deleted ${result.count} sessions.`);
    } catch (error) {
        console.error('❌ Error deleting sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllSessions();
