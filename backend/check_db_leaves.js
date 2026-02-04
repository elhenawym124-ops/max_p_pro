const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`SHOW COLUMNS FROM hr_leave_requests`;
        console.log('Columns in hr_leave_requests:', JSON.stringify(columns, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
