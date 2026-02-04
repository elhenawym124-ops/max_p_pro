const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function invalidateKey() {
    try {
        const keyId = 'cmvqx2wxmju1l5blq8e6'; // Correct ID for "basic"
        console.log(`🔒 Disabling Leaked API Key ID: ${keyId}...`);

        const key = await prisma.aIKey.findUnique({ where: { id: keyId } });

        if (!key) {
            console.log('⚠️ Key not found.');
            return;
        }

        await prisma.aIKey.update({
            where: { id: keyId },
            data: {
                isActive: false
            }
        });

        console.log(`✅ Key ${keyId} has been disabled successfully.`);

        // Also check for other active keys
        const activeKeys = await prisma.aIKey.count({ where: { isActive: true } });
        console.log(`ℹ️ Remaining active keys: ${activeKeys}`);

    } catch (error) {
        console.error('❌ Error invalidating key:', error);
    } finally {
        await prisma.$disconnect();
    }
}

invalidateKey();
