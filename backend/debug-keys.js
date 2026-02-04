
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKeys() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97'; // The ID from the logs

    console.log(`🔍 Checking company: ${companyId}`);

    // 1. Check Company
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });
    console.log('🏢 Company:', company ? `Found (useCentralKeys: ${company.useCentralKeys})` : 'Not Found');

    // 2. Check Company Keys
    const companyKeys = await prisma.geminiKey.findMany({
        where: { companyId: companyId }
    });
    console.log(`🔑 Company Keys: ${companyKeys.length}`);
    companyKeys.forEach(k => console.log(`   - ${k.name} (Active: ${k.isActive}, Type: ${k.keyType})`));

    // 3. Check Central Keys
    const centralKeys = await prisma.geminiKey.findMany({
        where: {
            OR: [
                { keyType: 'CENTRAL' },
                { companyId: null }
            ]
        },
        include: {
            models: true
        }
    });
    console.log(`🔑 Central Keys: ${centralKeys.length}`);
    centralKeys.forEach(k => {
        console.log(`   - ${k.name} (Active: ${k.isActive}, Type: ${k.keyType})`);
        console.log(`     Models: ${k.models.length}`);
        k.models.forEach(m => console.log(`       * ${m.model} (Enabled: ${m.isEnabled}, Priority: ${m.priority})`));
    });

    await prisma.$disconnect();
}

checkKeys();
