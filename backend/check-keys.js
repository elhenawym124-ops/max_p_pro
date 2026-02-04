const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkKeys() {
    const prisma = getSharedPrismaClient();
    try {
        const keys = await prisma.aiKey.findMany({
            where: { isActive: true }
        });
        console.log(`🔑 Found ${keys.length} active keys`);
        keys.forEach(k => {
            console.log(`- Key ID: ${k.id}, Company ID: ${k.companyId || 'Central'}, Priority: ${k.priority}`);
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkKeys();
