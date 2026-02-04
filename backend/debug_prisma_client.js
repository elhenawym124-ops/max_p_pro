const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspection of PrismaClient instance keys:');
    const keys = Object.keys(prisma);
    const models = keys.filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log('✅ Available Models:', models);

    if (models.includes('systemSettings')) {
        console.log('✅ systemSettings model is present.');
    } else {
        console.error('❌ systemSettings model is MISSING!');
        // Check for fuzzy matches
        const fuzzy = models.filter(m => m.toLowerCase().includes('system'));
        console.log('❓ Possible matches:', fuzzy);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
