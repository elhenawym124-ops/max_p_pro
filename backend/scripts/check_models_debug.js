const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
    console.log('🔍 Checking AI Models and Keys...');

    try {
        const totalKeys = await prisma.aIKey.count();
        const activeKeys = await prisma.aIKey.count({ where: { isActive: true } });
        console.log(`🔑 Total Keys: ${totalKeys} (Active: ${activeKeys})`);

        const keys = await prisma.aIKey.findMany({
            include: {
                models: true
            }
        });

        for (const key of keys) {
            console.log(`\n---------------------------------------------------`);
            console.log(`Key ID: ${key.id}`);
            console.log(`Name: ${key.name}`);
            console.log(`Provider: ${key.provider}`);
            console.log(`Active: ${key.isActive}`);
            console.log(`Models (${key.models.length}):`);

            if (key.models.length === 0) {
                console.warn(`⚠️  WARNING: This key has NO models attached!`);
            }

            for (const model of key.models) {
                console.log(`  - ${model.modelName} (Enabled: ${model.isEnabled}, Priority: ${model.priority})`);
                // Check usage validity
                try {
                    JSON.parse(model.usage);
                } catch (e) {
                    console.error(`  ❌ INVALID JSON usage for model ${model.modelName}`);
                }
            }
        }

    } catch (error) {
        console.error('Error checking models:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkModels();
