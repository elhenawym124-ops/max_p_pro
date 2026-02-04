const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
    try {
        await initializeSharedDatabase();

        // List all companies
        const companies = await executeWithRetry(async () => {
            return await getSharedPrismaClient().company.findMany({
                select: { id: true, name: true }
            });
        });

        console.log(`✅ Found ${companies.length} companies:`);

        for (const comp of companies) {
            const directCount = await getSharedPrismaClient().user.count({
                where: { companyId: comp.id }
            });
            const assocCount = await getSharedPrismaClient().userCompany.count({
                where: { companyId: comp.id }
            });
            console.log(`🏢 ${comp.name} (${comp.id}): direct=${directCount}, userCompany=${assocCount}`);
        }

        // Count users with no companyId
        const noCompCount = await getSharedPrismaClient().user.count({
            where: { companyId: null }
        });
        console.log(`❓ Users with NO companyId: ${noCompCount}`);

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
    }
}

main();
