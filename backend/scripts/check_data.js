const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log('🔍 Checking Dev Task Data...');
    try {
        // Check distinct components
        const components = await prisma.devTask.groupBy({
            by: ['component'],
            _count: { component: true }
        });
        console.log('📦 Components found:', components);

        // Check tags format
        const tasksWithTags = await prisma.devTask.findMany({
            where: { tags: { not: null } },
            select: { id: true, tags: true },
            take: 5
        });
        console.log('🏷️ Sample Tags:', tasksWithTags);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
