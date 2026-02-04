const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 'cmjpl484f0e01jupyzyacurbe';
    console.log('Checking employee details for userId:', userId);

    const employee = await prisma.employee.findUnique({
        where: { userId }
    });

    console.log('Employee details:', JSON.stringify(employee, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
