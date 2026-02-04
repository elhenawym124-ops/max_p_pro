const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const projects = await prisma.devProject.findMany({
            select: { id: true, name: true, createdAt: true }
        });
        console.log('--- Dev Projects ---');
        projects.forEach(p => console.log(`[${p.id}] ${p.name} (Created: ${p.createdAt.toISOString()})`));
        console.log('--------------------');
    } catch (err) {
        console.err('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
