const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const companyId = 'cmgj92byv003djutl34dkh6ab';
        const payrolls = await prisma.payroll.findMany({
            where: { companyId }
        });

        console.log(`--- Payroll Records for ${companyId} ---`);
        console.log(JSON.stringify(payrolls, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
