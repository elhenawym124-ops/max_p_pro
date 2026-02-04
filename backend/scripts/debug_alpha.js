
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugSearch() {
    console.log('🔍 Debugging Search...');

    try {
        const prisma = getSharedPrismaClient();

        // precise search
        const exact = await prisma.company.findFirst({
            where: { email: 'Alpha@gmail.com' }
        });
        console.log('Exact Match Result:', exact ? exact.id : 'Not Found');

        // loose search
        const loose = await prisma.company.findMany({
            where: {
                email: {
                    contains: 'lpha'
                }
            }
        });
        console.log('Contains "lpha" Results:', loose.map(c => `${c.email} (${c.id})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debugSearch();
