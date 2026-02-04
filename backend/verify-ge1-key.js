const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkSpecificKey() {
    const prisma = getSharedPrismaClient();
    try {
        const key = await prisma.aiKey.findFirst({
            where: { name: 'ge1', isActive: true }
        });

        if (key) {
            console.log('✅ Found key "ge1"');
            console.log(`- ID: ${key.id}`);
            console.log(`- Provider: ${key.provider}`);
            console.log(`- Type: ${key.keyType}`);
            // Don't log the full key for security, just prefix
            console.log(`- Key starts with: ${key.apiKey.substring(0, 10)}...`);
        } else {
            console.log('❌ Key "ge1" not found or not active');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkSpecificKey();
