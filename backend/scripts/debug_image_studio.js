const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugImageStudio() {
    console.log('Starting debug of ImageStudio...');

    try {
        const prisma = getSharedPrismaClient();
        if (!prisma) throw new Error("Failed to get prisma client");

        console.log('✅ Prisma Client obtained.');

        // Inspect available models
        const keys = Object.keys(prisma);
        console.log('🔑 Available Prisma Client properties (models):');
        // Filter for likely candidates
        const likelyKeys = keys.filter(k => k.toLowerCase().includes('key') || k.toLowerCase().includes('ai'));
        console.log(likelyKeys);

        // Check specific variations
        if (prisma.aIKey) console.log('✅ prisma.aIKey exists');
        else console.log('❌ prisma.aIKey does NOT exist');

        if (prisma.aiKey) console.log('✅ prisma.aiKey exists');
        else console.log('❌ prisma.aiKey does NOT exist');

        if (prisma.AIKey) console.log('✅ prisma.AIKey exists');
        else console.log('❌ prisma.AIKey does NOT exist');

    } catch (error) {
        console.error('❌ Debug Failed!');
        console.error('Error message:', error.message);
    } finally {
        process.exit();
    }
}

debugImageStudio();
