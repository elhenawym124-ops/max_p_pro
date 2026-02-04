const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const result = await prisma.$queryRaw`SHOW TABLES`;
        console.log('--- Tables in Local Database ---');
        console.log(JSON.stringify(result, null, 2));
        console.log('--------------------------------');
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
