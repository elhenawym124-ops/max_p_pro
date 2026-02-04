const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('Checking DevProject model...');
        // access property case sensitively. Model is DevProject -> devProject or DevProject? usually lowercase camelCase
        // Let's try to access it via property names
        if (prisma.devProject) {
            const count = await prisma.devProject.count();
            console.log('DevProject count:', count);
        } else {
            console.log('prisma.devProject is undefined');
            console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
        }
    } catch (e) {
        console.error('DevProject Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
