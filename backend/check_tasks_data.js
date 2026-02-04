const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
    try {
        console.log('--- Checking Dev Tasks Data ---');
        const tasks = await prisma.devTask.findMany({
            take: 5,
            include: {
                project: true,
                assignee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        tasks.forEach(task => {
            console.log(`Task ID: ${task.id}`);
            console.log(`Title: ${task.title}`);
            console.log(`ProjectId: ${task.projectId}`);
            console.log(`Project Name: ${task.project?.name || 'NULL'}`);
            console.log(`AssigneeId: ${task.assigneeId}`);
            console.log(`Assignee User Name: ${task.assignee?.user ? task.assignee.user.firstName + ' ' + task.assignee.user.lastName : 'NULL'}`);
            console.log('---------------------------');
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTasks();
