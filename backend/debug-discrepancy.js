const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDiscrepancy() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('--- Completed Tasks Today ---');
        const tasks = await prisma.devTask.findMany({
            where: {
                status: 'DONE',
                completedDate: { gte: today }
            },
            include: {
                assignee: {
                    include: { user: true }
                }
            }
        });

        tasks.forEach(task => {
            console.log(`Task ID: ${task.id}`);
            console.log(`Title: ${task.title}`);
            console.log(`AssigneeId: ${task.assigneeId}`);
            if (task.assignee) {
                console.log(`Member Name: ${task.assignee.user?.firstName} ${task.assignee.user?.lastName}`);
                console.log(`Member ID: ${task.assignee.id}`);
            } else {
                console.log('Assignee record NOT FOUND for this ID');
            }
            console.log('---------------------------');
        });

        console.log('\n--- Team Members List ---');
        const members = await prisma.devTeamMember.findMany({
            include: { user: true }
        });
        members.forEach(m => {
            console.log(`ID: ${m.id} | Name: ${m.user?.firstName} ${m.user?.lastName}`);
        });

    } catch (e) { console.error(e); }
    finally { await prisma.$disconnect(); }
}

debugDiscrepancy();
