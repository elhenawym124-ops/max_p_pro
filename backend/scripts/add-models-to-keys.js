const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_MODELS_TO_ADD = [
    'gemini-3-pro',
    'gemini-3-flash',
    'gemini-3-deep-think',
    'gemini-2.0-pro'
];

async function main() {
    console.log('🔗 Linking New Gemini Models to Existing Keys...');

    // 1. Get all active keys (Central and Company)
    const allKeys = await prisma.aIKey.findMany({
        where: { isActive: true }
    });

    console.log(`Found ${allKeys.length} active keys.`);

    for (const key of allKeys) {
        console.log(`\n🔑 Processing Key: ${key.name} (ID: ${key.id})`);

        let priorityCounter = 10; // Start priority for new models

        for (const modelName of NEW_MODELS_TO_ADD) {
            // Check if config already exists
            const existingConfig = await prisma.aIModelConfig.findFirst({
                where: {
                    keyId: key.id,
                    modelName: modelName
                }
            });

            if (existingConfig) {
                console.log(`   - Model ${modelName} already linked.`);
                // Ensure enabled
                if (!existingConfig.isEnabled) {
                    await prisma.aIModelConfig.update({
                        where: { id: existingConfig.id },
                        data: { isEnabled: true }
                    });
                    console.log(`     -> Re-enabled.`);
                }
            } else {
                // Create new config
                await prisma.aIModelConfig.create({
                    data: {
                        keyId: key.id,
                        modelName: modelName,
                        isEnabled: true,
                        priority: priorityCounter++,
                        usage: JSON.stringify({ used: 0, limit: 1000000 }) // Initial usage
                    }
                });
                console.log(`   + Linked New Model: ${modelName}`);
            }
        }
    }

    console.log('\n✅ Done! Links created. Please restart server or clear cache.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
