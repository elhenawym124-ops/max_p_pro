const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('Checking tasks completed after:', today.toISOString());

        const completedToday = await prisma.devTask.findMany({
            where: {
                status: 'DONE',
                completedDate: {
                    gte: today
                }
            },
            select: {
                id: true,
                title: true,
                status: true,
                completedDate: true,
                assignee: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            }
        });

        console.log(`Found ${completedToday.length} tasks completed today.`);
        completedToday.forEach(task => {
            console.log(`- [${task.id}] ${task.title} (Member: ${task.assignee?.user?.firstName} ${task.assignee?.user?.lastName}) - Completed at: ${task.completedDate}`);
        });

        // Also check all DONE tasks regardless of date to see what's in DB
        const allDone = await prisma.devTask.count({
            where: { status: 'DONE' }
        });
        console.log(`Total tasks with status DONE in DB: ${allDone}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTasks();
