const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listKeys() {
    try {
        const keys = await prisma.aIKey.findMany({
            select: { id: true, name: true, keyType: true, isActive: true, priority: true }
        });
        console.log('🔑 Available Keys:', JSON.stringify(keys, null, 2));
    } catch (error) {
        console.error('❌ Error listing keys:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listKeys();
