const { PrismaClient } = require('@prisma/client');

// Archive Database URL
const ARCHIVE_DB_URL = 'mysql://u339372869_Archive:0190711037Aa%40@srv1812.hstgr.io:3306/u339372869_Archive?charset=utf8mb4&collation=utf8mb4_unicode_ci';

const prisma = new PrismaClient({
    datasources: { db: { url: ARCHIVE_DB_URL } }
});

async function check() {
    try {
        const result = await prisma.$queryRaw`SHOW TABLES`;
        console.log('--- Tables in Archive Database ---');
        console.log(JSON.stringify(result, null, 2));
        console.log('---------------------------------');
    } catch (err) {
        console.error('Error listing tables in archive:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
