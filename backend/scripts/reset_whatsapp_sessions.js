
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetSessions() {
    console.log('🔄 Resetting WhatsApp sessions in database...');
    try {
        // Find all sessions
        const sessions = await prisma.whatsAppSession.findMany();
        console.log(`Found ${sessions.length} sessions.`);

        for (const session of sessions) {
            console.log(`🧹 Clearing authState for session ${session.id}...`);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    authState: "{}",
                    status: 'DISCONNECTED',

                }
            });
        }
        console.log('✅ All sessions reset successfully.');
    } catch (error) {
        console.error('❌ Error resetting sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetSessions();
