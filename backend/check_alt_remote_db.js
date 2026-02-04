const { PrismaClient } = require('@prisma/client');

// Alternate Remote VPS URL
const REMOTE_VPS_URL = 'mysql://u339372869_test:0165676135Aa%40A@92.113.22.70:3306/u339372869_test?charset=utf8mb4&collation=utf8mb4_unicode_ci';

const prisma = new PrismaClient({
    datasources: { db: { url: REMOTE_VPS_URL } }
});

async function check() {
    try {
        const taskCount = await prisma.devTask.count();
        const projectCount = await prisma.devProject.count();

        console.log('--- Alternate Remote Database Status (test) ---');
        console.log('DevTasks:', taskCount);
        console.log('DevProjects:', projectCount);
        console.log('----------------------------------------------');
    } catch (err) {
        console.error('Error checking alternate remote database:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
