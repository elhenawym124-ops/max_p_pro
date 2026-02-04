
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testModels() {
    const prisma = getSharedPrismaClient();
    const testCompanyId = 'cme8ondkz0000uf6s5gy28i17'; // From user logs

    try {
        console.log('--- Testing ManualDeduction with include ---');
        const deductions = await prisma.manualDeduction.findMany({
            where: { companyId: testCompanyId },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            take: 1
        });
        console.log('✅ ManualDeduction access successful:', deductions);
    } catch (error) {
        console.error('❌ ManualDeduction access failed:', error.message);
        console.error(error.stack);
    }

    try {
        console.log('--- Testing RewardRecord with include ---');
        const rewards = await prisma.rewardRecord.findMany({
            where: { companyId: testCompanyId },
            include: {
                user: { select: { id: true, firstName: true } },
                rewardType: { select: { id: true, name: true } }
            },
            take: 1
        });
        console.log('✅ RewardRecord access successful:', rewards);
    } catch (error) {
        console.error('❌ RewardRecord access failed:', error.message);
        console.error(error.stack);
    }
}

testModels();
