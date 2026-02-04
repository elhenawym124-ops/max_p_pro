const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const taskCount = await prisma.devTask.count();
        const generalTaskCount = await prisma.task.count();
        const projectCount = await prisma.devProject.count();
        const teamMemberCount = await prisma.devTeamMember.count();
        const releaseCount = await prisma.devRelease.count();
        const userCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });

        console.log('--- Database Status ---');
        console.log('DevTasks:', taskCount);
        console.log('General Tasks:', generalTaskCount);
        console.log('DevProjects:', projectCount);
        console.log('DevTeamMembers:', teamMemberCount);
        console.log('DevReleases:', releaseCount);
        console.log('Super Admin Users:', userCount);
        console.log('-----------------------');
    } catch (err) {
        console.error('Error checking database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
