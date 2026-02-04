const { PrismaClient } = require('../generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
        console.log('Tables in database:', JSON.stringify(tables, null, 2));
    } catch (error) {
        console.error('Error fetching tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
