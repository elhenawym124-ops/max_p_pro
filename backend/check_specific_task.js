const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificTask() {
    try {
        console.log('--- Checking Specific Task: نظام إدارة العملاء المحتملين ---');
        const tasks = await prisma.devTask.findMany({
            where: {
                title: { contains: 'نظام إدارة العملاء المحتملين' }
            },
            include: { project: true, assignee: { include: { user: true } } }
        });

        tasks.forEach(task => {
            console.log(`Task ID: ${task.id}`);
            console.log(`Title: ${task.title}`);
            console.log(`ProjectId: ${task.projectId}`);
            console.log(`Project Name: ${task.project?.name || 'NULL'}`);
            console.log(`AssigneeId: ${task.assigneeId}`);
            console.log(`Assignee Name: ${task.assignee?.user ? task.assignee.user.firstName + ' ' + task.assignee.user.lastName : 'NULL'}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkSpecificTask();
