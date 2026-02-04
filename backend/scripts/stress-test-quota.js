const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ModelManager } = require('../services/aiAgent/modelManager');
// Mock the aiAgentService dependency if needed, or null
const modelManager = new (require('../services/aiAgent/modelManager'))(null);

async function main() {
    console.log('🔥 Starting Quota Stress Test...');

    // 1. Get a test model (Gemini 3 Flash in Central Key)
    const testModel = await prisma.aIModelConfig.findFirst({
        where: {
            modelName: 'gemini-3-flash',
            isEnabled: true
        },
        include: { key: true }
    });

    if (!testModel) {
        console.error('❌ No test model found!');
        return;
    }

    console.log(`🧪 Testing Model: ${testModel.modelName} (ID: ${testModel.id})`);

    // Reset usage to 0
    const initialUsage = JSON.parse(testModel.usage || '{}');
    initialUsage.used = 0;
    initialUsage.rpm = { used: 0, limit: 1000, windowStart: new Date().toISOString() };
    await prisma.aIModelConfig.update({
        where: { id: testModel.id },
        data: { usage: JSON.stringify(initialUsage) }
    });
    console.log('🔄 Reset usage to 0');

    // 2. Run concurrent updates
    const CONCURRENT_REQUESTS = 20;
    console.log(`🚀 Launching ${CONCURRENT_REQUESTS} concurrent updates...`);

    const promises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(modelManager.updateModelUsage(testModel.id, 10)); // 10 tokens each
    }

    await Promise.allSettled(promises);

    // 3. Verify Result
    const finalRecord = await prisma.aIModelConfig.findUnique({
        where: { id: testModel.id }
    });
    const finalUsage = JSON.parse(finalRecord.usage);

    console.log('---------------------------------------------------');
    console.log(`📊 Final Usage Count: ${finalUsage.used}`);
    console.log(`✅ Expected Usage:    ${CONCURRENT_REQUESTS}`);

    if (finalUsage.used === CONCURRENT_REQUESTS) {
        console.log('✅ PERFECT! No race conditions detected (Locking is working).');
    } else {
        console.log(`❌ FAILED! Lost ${CONCURRENT_REQUESTS - finalUsage.used} updates.`);
        console.log('⚠️ Race condition confirmed.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
