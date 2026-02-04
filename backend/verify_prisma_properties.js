
const { getSharedPrismaClient } = require('./services/sharedDatabase');

function checkProperties() {
    const prisma = getSharedPrismaClient();
    const keys = Object.keys(prisma);

    console.log('--- Prisma Model Keys ---');
    const models = keys.filter(k => !k.startsWith('$') && !k.startsWith('_'));
    console.log(models.join(', '));

    console.log('\n--- Specific Property Check ---');
    console.log('manualDeduction exists:', !!prisma.manualDeduction);
    console.log('rewardRecord exists:', !!prisma.rewardRecord);
    console.log('user exists:', !!prisma.user);

    if (!prisma.manualDeduction) {
        console.error('❌ manualDeduction is MISSING from Prisma client');
    }
    if (!prisma.rewardRecord) {
        console.error('❌ rewardRecord is MISSING from Prisma client');
    }
}

checkProperties();
