const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvalidUsage() {
    console.log('🔧 Starting Usage JSON Repair...');

    try {
        const allModels = await prisma.aIModelConfig.findMany();
        console.log(`📋 Found ${allModels.length} models. Checking JSON...`);

        let fixedCount = 0;

        for (const model of allModels) {
            let isValid = false;
            try {
                if (model.usage) {
                    JSON.parse(model.usage);
                    isValid = true;
                } else {
                    // Null usage is valid (will be initialized later), but we can init it now
                    isValid = false;
                }
            } catch (e) {
                isValid = false;
            }

            if (!isValid) {
                console.log(`⚠️ Invalid/Empty JSON for model [${model.modelName}] (ID: ${model.id}). Resetting...`);

                const defaultUsage = {
                    used: 0,
                    limit: 1000000, // Safe default
                    rpm: { used: 0, limit: 10, windowStart: new Date().toISOString() },
                    rph: { used: 0, limit: 1000, windowStart: new Date().toISOString() },
                    rpd: { used: 0, limit: 10000, windowStart: new Date().toISOString() },
                    tpm: { used: 0, limit: 1000000, windowStart: new Date().toISOString() }
                };

                await prisma.aIModelConfig.update({
                    where: { id: model.id },
                    data: { usage: JSON.stringify(defaultUsage) }
                });

                fixedCount++;
            }
        }

        console.log(`✅ Repair Complete! Fixed ${fixedCount} models.`);

    } catch (error) {
        console.error('❌ Error during repair:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixInvalidUsage();
