
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugCount() {
    console.log('🔍 Counting companies...');
    const prisma = getSharedPrismaClient();
    const count = await prisma.company.count();
    console.log('Total Companies:', count);

    if (count > 0) {
        const first5 = await prisma.company.findMany({ take: 5, select: { email: true } });
        console.log('First 5 emails:', first5.map(c => c.email));
    }
    process.exit(0);
}

debugCount();
