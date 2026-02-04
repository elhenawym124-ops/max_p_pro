const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function fixDb() {
    try {
        console.log('Sorting out orphan time logs...');
        // Find tasks that exist
        const tasks = await prisma.devTask.findMany({ select: { id: true } });
        const taskIds = tasks.map(t => t.id);

        console.log(`Found ${taskIds.length} tasks.`);

        // Delete time logs with taskId NOT in taskIds
        const deleted = await prisma.devTimeLog.deleteMany({
            where: {
                taskId: { notIn: taskIds }
            }
        });

        console.log(`Deleted ${deleted.count} orphan time logs.`);
    } catch (error) {
        console.error('Error fixing DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDb();
