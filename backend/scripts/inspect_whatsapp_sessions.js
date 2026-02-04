
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSessions() {
    console.log('🔍 Inspecting WhatsApp sessions in database...');
    try {
        const sessions = await prisma.whatsAppSession.findMany();
        console.log(`Found ${sessions.length} sessions:`);

        sessions.forEach(s => {
            console.log(`- ID: ${s.id}, Company: ${s.companyId}, Status: ${s.status}, AuthState Length: ${s.authState ? s.authState.length : 0}`);
        });

    } catch (error) {
        console.error('❌ Error inspecting sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectSessions();
