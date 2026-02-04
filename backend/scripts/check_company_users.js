const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
    const companyId = 'cmjpl47ym0dzwjupybv59lisu'; // SM Company
    console.log(`🔍 Checking users for company: ${companyId}`);

    try {
        await initializeSharedDatabase();

        const count = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.count({
                where: { companyId }
            });
        });

        console.log(`✅ Total users with direct companyId=${companyId}: ${count}`);

        const users = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.findMany({
                where: { companyId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true, employeeNumber: true }
            });
        });

        console.log('✅ Users list:');
        console.log(JSON.stringify(users, null, 2));

        // Also check UserCompany table associations
        const assocCount = await executeWithRetry(async () => {
            return await getSharedPrismaClient().userCompany.count({
                where: { companyId }
            });
        });
        console.log(`✅ Total UserCompany associations for companyId=${companyId}: ${assocCount}`);

        const assocUsers = await executeWithRetry(async () => {
            return await getSharedPrismaClient().userCompany.findMany({
                where: { companyId },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true }
                    }
                }
            });
        });
        console.log('✅ Associated Users (via UserCompany):');
        console.log(JSON.stringify(assocUsers.map(a => ({
            userId: a.userId,
            email: a.user?.email,
            role: a.role,
            isActive: a.isActive
        })), null, 2));

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
    }
}

main();
