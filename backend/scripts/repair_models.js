const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairModels() {
    console.log('🔧 Repairing AI Models Configuration...');

    try {
        const configs = await prisma.aIModelConfig.findMany();
        let repairedCount = 0;

        for (const config of configs) {
            let isValid = false;
            try {
                const parsed = JSON.parse(config.usage);
                if (parsed && typeof parsed === 'object') {
                    isValid = true;
                }
            } catch (e) {
                isValid = false;
            }

            if (!isValid) {
                console.log(`🛠️ Repairing invalid JSON for model ${config.modelName} (ID: ${config.id})`);
                await prisma.aIModelConfig.update({
                    where: { id: config.id },
                    data: {
                        usage: '{}', // Reset to empty object
                        updatedAt: new Date()
                    }
                });
                repairedCount++;
            }
        }

        console.log(`✅ Repair complete. Fixed ${repairedCount} models.`);

    } catch (error) {
        console.error('❌ Error repairing models:', error);
    } finally {
        await prisma.$disconnect();
    }
}

repairModels();
