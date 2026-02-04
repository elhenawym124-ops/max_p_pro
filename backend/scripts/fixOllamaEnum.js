const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKeys() {
    try {
        const keys = await prisma.$queryRaw`SELECT id, name, provider FROM ai_keys`;
        console.log('AI Keys in DB:', JSON.stringify(keys, null, 2));

        const ollamaKeys = keys.filter(k => k.provider === 'OLLAMA');
        if (ollamaKeys.length > 0) {
            console.log('Found OLLAMA keys:', ollamaKeys);
            // Temporarily change them to GOOGLE to avoid Prisma crash
            for (const key of ollamaKeys) {
                await prisma.$executeRaw`UPDATE ai_keys SET provider = 'GOOGLE' WHERE id = ${key.id}`;
                console.log(`Updated key ${key.id} from OLLAMA to GOOGLE`);
            }
        } else {
            console.log('No OLLAMA keys found via raw query.');
        }
    } catch (err) {
        console.error('Error checking keys:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkKeys();
