const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const payrollService = require('../services/hr/payrollService');

async function main() {
    try {
        console.log('🔄 Initializing database connection...');
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        if (!prisma) {
            throw new Error('Failed to initialize Prisma client');
        }

        const companyId = 'cmgj92byv003djutl34dkh6ab';
        const month = 1;
        const year = 2026;

        console.log(`\n🚀 Generating payroll for ${month}/${year}...`);
        const results = await payrollService.generateMonthlyPayroll(companyId, month, year, true);

        console.log('\n--- Generation Results ---');
        console.log(`✅ Success: ${results.success.length}`);
        console.log(`🔄 Regenerated: ${results.regenerated.length}`);
        console.log(`➡️ Skipped: ${results.skipped.length}`);
        console.log(`❌ Failed: ${results.failed.length}`);

        if (results.failed.length > 0) {
            console.log('\n--- Failures ---');
            results.failed.forEach(f => console.log(`${f.employeeName}: ${f.error}`));
        }

        // Verify existing records
        const payrollCount = await prisma.payroll.count({
            where: { companyId, month, year }
        });
        console.log(`\nVerified Records in DB: ${payrollCount}`);

    } catch (error) {
        console.error('\n❌ Error during generation:', error);
    } finally {
        const prisma = getSharedPrismaClient();
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}

main();
