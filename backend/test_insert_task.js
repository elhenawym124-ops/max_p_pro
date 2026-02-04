const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInsert() {
    try {
        // Find a project to link to
        const project = await prisma.devProject.findFirst();
        if (!project) {
            console.log('No projects found to link task to.');
            return;
        }

        // Find a team member to be reporter
        const member = await prisma.devTeamMember.findFirst();
        if (!member) {
            console.log('No team members found to be reporter.');
            return;
        }

        const newTask = await prisma.devTask.create({
            data: {
                title: 'اختبار وجود المهام',
                description: 'هذه مهمة تجريبية للتحقق من قاعدة البيانات',
                type: 'FEATURE',
                status: 'BACKLOG',
                priority: 'MEDIUM',
                projectId: project.id,
                reporterId: member.id,
                order: 999
            }
        });

        console.log('✅ Success! Created test task:', newTask.id);

        // Now delete it to keep it clean
        await prisma.devTask.delete({ where: { id: newTask.id } });
        console.log('🗑️ Deleted test task.');

    } catch (err) {
        console.error('❌ Insertion failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testInsert();
