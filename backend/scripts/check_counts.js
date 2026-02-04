const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
    const companyId = 'cmjpl47ym0dzwjupybv59lisu'; // SM Company
    console.log(`🔍 Detailed check for company: ${companyId}`);

    try {
        await initializeSharedDatabase();

        // Count ALL users with this companyId
        const allCount = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.count({
                where: { companyId }
            });
        });
        console.log(`✅ Total users with companyId=${companyId}: ${allCount}`);

        // Count ACTIVE users with this companyId
        const activeCount = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.count({
                where: {
                    companyId,
                    isActive: true
                }
            });
        });
        console.log(`✅ Total ACTIVE users with companyId=${companyId}: ${activeCount}`);

        // Count users with this companyId AND (empNum OR dept OR pos)
        const filteredCount = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.count({
                where: {
                    companyId,
                    isActive: true,
                    OR: [
                        { employeeNumber: { not: null } },
                        { departmentId: { not: null } },
                        { positionId: { not: null } }
                    ]
                }
            });
        });
        console.log(`✅ Total ACTIVE users with companyId=${companyId} AND (empNum OR dept OR pos): ${filteredCount}`);

        // List the active users
        const users = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.findMany({
                where: { companyId, isActive: true },
                select: { email: true, employeeNumber: true, firstName: true }
            });
        });
        console.log('✅ Active users list:', JSON.stringify(users, null, 2));

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
    }
}

main();
