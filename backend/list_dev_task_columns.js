const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listColumns() {
    try {
        console.log('--- Listing Columns of dev_tasks ---');
        const columns = await prisma.$queryRaw`SHOW COLUMNS FROM dev_tasks`;
        console.table(columns);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listColumns();
