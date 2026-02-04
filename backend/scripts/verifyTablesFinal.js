const { PrismaClient } = require('../generated/mysql');
const prisma = new PrismaClient();

async function main() {
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
    const list = tables.map(t => Object.values(t)[0]);
    const targets = list.filter(name =>
        name.includes('affiliate') ||
        name.startsWith('hr_') ||
        name.includes('telegram_auto_reply')
    );
    console.log('Relevant Tables:', JSON.stringify(targets, null, 2));
    await prisma.$disconnect();
}
main();
