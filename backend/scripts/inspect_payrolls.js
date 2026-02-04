const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const payrolls = await prisma.payroll.findMany({
            include: {
                // employee: true // relation is commented out in schema
            }
        });

        console.log('--- Payroll Records ---');
        console.log(JSON.stringify(payrolls, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
