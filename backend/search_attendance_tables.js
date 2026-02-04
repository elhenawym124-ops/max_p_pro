const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        const tableList = tables.map(t => Object.values(t)[0]);
        console.log('Tables matching attend:', tableList.filter(t => t.toLowerCase().includes('attend')));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
