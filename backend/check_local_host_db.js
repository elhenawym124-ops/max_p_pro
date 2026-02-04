const { PrismaClient } = require('@prisma/client');

// Local MySQL URL (from the commented out line in .env)
// Trying with default root:password - ADJUST IF NEEDED
const LOCAL_DB_URL = 'mysql://root:password@localhost:3306/maxp?charset=utf8mb4&collation=utf8mb4_unicode_ci';

const prisma = new PrismaClient({
    datasources: { db: { url: LOCAL_DB_URL } }
});

async function check() {
    try {
        const taskCount = await prisma.devTask.count();
        const projectCount = await prisma.devProject.count();

        console.log('--- Local Host Database Status (maxp) ---');
        console.log('DevTasks:', taskCount);
        console.log('DevProjects:', projectCount);
        console.log('------------------------------------------');
    } catch (err) {
        console.error('Error connecting to local maxp database:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
