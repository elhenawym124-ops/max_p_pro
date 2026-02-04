const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        // We need to wait for connection because getSharedPrismaClient doesn't guarantee it immediately
        // or we can use safeQuery if it was exported, but it's not.
        // Let's just try a simple query first.

        console.log('Fetching plan configurations...');
        const configs = await prisma.planConfiguration.findMany();
        console.log('Plan Configurations in DB:', JSON.stringify(configs, null, 2));

        console.log('Fetching companies grouped by plan...');
        const companies = await prisma.company.groupBy({
            by: ['plan'],
            _count: { id: true }
        });
        console.log('Companies by Plan:', JSON.stringify(companies, null, 2));
    } catch (error) {
        console.error('Error in checkPlans:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        // Don't disconnect a shared client usually, but for a script it's okay
        await prisma.$disconnect();
    });
