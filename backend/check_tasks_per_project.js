const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const projects = await prisma.devProject.findMany({
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });
        console.log('--- Project Task Counts ---');
        projects.forEach(p => {
            console.log(`[${p.id}] ${p.name}: ${p._count.tasks} tasks`);
        });
        console.log('---------------------------');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
