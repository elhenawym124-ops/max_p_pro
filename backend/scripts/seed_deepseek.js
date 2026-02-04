const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDeepSeek() {
    console.log('🚀 Seeding DeepSeek API Key...');

    const apiKey = 'sk-cb6e587c19f04a1ba0ee83f6005a0392';

    try {
        // 1. Create or Update DeepSeek Key
        const deepseekKey = await prisma.aIKey.upsert({
            where: { apiKey: apiKey },
            update: {
                name: 'DeepSeek V3 (Custom)',
                provider: 'DEEPSEEK',
                isActive: true,
                keyType: 'CENTRAL'
            },
            create: {
                name: 'DeepSeek V3 (Custom)',
                apiKey: apiKey,
                provider: 'DEEPSEEK',
                isActive: true,
                keyType: 'CENTRAL'
            }
        });

        console.log(`✅ Key created/updated: ${deepseekKey.id}`);

        // 2. Add DeepSeek Models
        const models = [
            { name: 'deepseek-chat', priority: 1 },
            { name: 'deepseek-reasoner', priority: 2 }
        ];

        for (const m of models) {
            await prisma.aIModelConfig.upsert({
                where: {
                    keyId_modelName: {
                        keyId: deepseekKey.id,
                        modelName: m.name
                    }
                },
                update: {
                    isEnabled: true,
                    priority: m.priority
                },
                create: {
                    keyId: deepseekKey.id,
                    modelName: m.name,
                    isEnabled: true,
                    priority: m.priority
                }
            });
            console.log(`✅ Model added: ${m.name}`);
        }

        // 3. Switch Global Default to DEEPSEEK (optional for testing)
        // await prisma.globalAIConfig.updateMany({
        //   data: { defaultProvider: 'DEEPSEEK' }
        // });
        // console.log('🔄 Switched default provider to DEEPSEEK');

        console.log('\n✨ DeepSeek seeding finished.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedDeepSeek();
