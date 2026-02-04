const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('Checking Project model...');
        const count = await prisma.project.count();
        console.log('Project count:', count);
    } catch (e) {
        console.error('Project Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
