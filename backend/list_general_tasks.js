const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const tasks = await prisma.task.findMany({
            take: 20,
            select: { id: true, title: true, createdAt: true }
        });
        console.log('--- General Tasks (Sample) ---');
        tasks.forEach(t => console.log(`[${t.id}] ${t.title} (Created: ${t.createdAt.toISOString()})`));
        console.log('------------------------------');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
