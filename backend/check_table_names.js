const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        const tableList = tables.map(t => Object.values(t)[0]);
        console.log('Attendance in DB?', tableList.includes('attendance'));
        console.log('hr_attendance in DB?', tableList.includes('hr_attendance'));
        console.log('hr_employees in DB?', tableList.includes('hr_employees'));
        console.log('hr_leave_requests in DB?', tableList.includes('hr_leave_requests'));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
