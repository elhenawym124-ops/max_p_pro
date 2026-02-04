const { PrismaClient } = require('@prisma/client');

// Remote VPS URL
const REMOTE_VPS_URL = 'mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci';

const prisma = new PrismaClient({
    datasources: { db: { url: REMOTE_VPS_URL } }
});

async function check() {
    try {
        const taskCount = await prisma.devTask.count();
        const generalTaskCount = await prisma.task.count();
        const projectCount = await prisma.devProject.count();
        const teamMemberCount = await prisma.devTeamMember.count();

        console.log('--- Remote Database Status ---');
        console.log('DevTasks:', taskCount);
        console.log('General Tasks:', generalTaskCount);
        console.log('DevProjects:', projectCount);
        console.log('DevTeamMembers:', teamMemberCount);
        console.log('------------------------------');
    } catch (err) {
        console.error('Error checking remote database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
