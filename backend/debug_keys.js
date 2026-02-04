/**
 * Debug: Check which keys have active models
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugKeys() {
    const allKeys = await prisma.aIKey.findMany({
        where: { isActive: true },
        include: {
            models: {
                where: { isEnabled: true },
                orderBy: { priority: 'asc' },
                take: 1
            }
        },
        orderBy: { priority: 'asc' }
    });

    console.log('📊 All Active Keys with Models:\n');

    for (const key of allKeys) {
        const hasModels = key.models && key.models.length > 0;
        const modelName = hasModels ? key.models[0].modelName : 'NO MODELS';
        const provider = key.provider || 'GOOGLE';

        console.log(`${hasModels ? '✅' : '❌'} ${key.name}`);
        console.log(`   Provider: ${provider}`);
        console.log(`   Model: ${modelName}`);
        console.log('');
    }

    // Filter for GOOGLE only with models
    const googleKeys = allKeys.filter(k => {
        const provider = (k.provider || 'GOOGLE').toUpperCase();
        return provider === 'GOOGLE' && k.models && k.models.length > 0;
    });

    console.log(`\n📊 GOOGLE keys with models: ${googleKeys.length}`);
    googleKeys.forEach(k => console.log(`   - ${k.name}: ${k.models[0].modelName}`));

    await prisma.$disconnect();
}

debugKeys();
