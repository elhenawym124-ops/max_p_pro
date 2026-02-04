const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables in DB:', JSON.stringify(tables, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
