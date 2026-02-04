const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ModelManager = require('../services/aiAgent/modelManager');

// Mock aiAgentService
const mockAiAgentService = {
    prisma: prisma,
    stateStore: {
        get: () => null,
        set: () => { }
    }
};

async function main() {
    console.log('🔍 Starting Quota Debugging...');
    const modelManager = new ModelManager(mockAiAgentService);

    // 1. Check Supported/Disabled Models
    console.log('\n📋 Configuration Check:');
    const supported = modelManager.getSupportedModels();
    const disabled = modelManager.getDisabledModels();
    console.log(`✅ Supported Models (${supported.length}):`, supported.join(', '));
    console.log(`❌ Disabled Models (${disabled.length}):`, disabled.join(', '));

    // 2. Load Limits
    await modelManager.loadModelLimits();
    const geminiProLimit = modelManager.getModelDefaults('gemini-1.5-pro');
    console.log('\n📊 Loaded Limit for gemini-1.5-pro:', geminiProLimit);

    // 3. Find a Central Key
    const centralKey = await prisma.geminiKey.findFirst({
        where: { type: 'CENTRAL', isActive: true },
        include: { aiModelConfigs: true }
    });

    if (!centralKey) {
        console.error('❌ No active CENTRAL key found!');
        return;
    }

    console.log(`\n🔑 Analyzing Key: ${centralKey.keyName} (ID: ${centralKey.id})`);

    // 4. Analyze detailed rejection logic for this key
    console.log('\n🕵️‍♀️ Simulating Model Selection:');

    // Fetch models for this key
    const models = await prisma.aIModelConfig.findMany({
        where: { keyId: centralKey.id, isEnabled: true },
        orderBy: { priority: 'asc' }
    });

    console.log(`Found ${models.length} enabled models for this key.`);

    for (const model of models) {
        console.log(`\n--- Checking Model: ${model.modelName} ---`);

        // Determine failure reason same as modelManager.js logic

        // Check 1: Disabled
        if (disabled.includes(model.modelName)) {
            console.log(`❌ REJECTED: Disabled model (not available in API)`);
            continue;
        }

        // Check 2: Supported
        if (!supported.includes(model.modelName)) {
            console.log(`❌ REJECTED: Unsupported model (not in v1beta list)`);
            continue;
        }

        // Check 3: Usage JSON
        let usage;
        try {
            usage = JSON.parse(model.usage || '{}');
            console.log('Usage State:', JSON.stringify(usage, null, 2));
        } catch (e) {
            console.log('Usage State: INVALID JSON (would be reset)');
            continue;
        }

        const now = new Date();
        const rpmWindowMs = 60 * 1000;
        const rphWindowMs = 60 * 60 * 1000;
        const rpdWindowMs = 24 * 60 * 60 * 1000;
        const tpmWindowMs = 60 * 1000;

        // RPM Check
        if (usage.rpm && usage.rpm.limit > 0 && usage.rpm.windowStart) {
            const rpmWindowStart = new Date(usage.rpm.windowStart);
            if ((now - rpmWindowStart) < rpmWindowMs) {
                if ((usage.rpm.used || 0) >= usage.rpm.limit) {
                    console.log(`❌ REJECTED: RPM Exceeded (${usage.rpm.used}/${usage.rpm.limit})`);
                    continue;
                }
            }
        }

        // RPH Check
        if (usage.rph && usage.rph.limit > 0 && usage.rph.windowStart) {
            const rphWindowStart = new Date(usage.rph.windowStart);
            if ((now - rphWindowStart) < rphWindowMs) {
                if ((usage.rph.used || 0) >= usage.rph.limit) {
                    console.log(`❌ REJECTED: RPH Exceeded (${usage.rph.used}/${usage.rph.limit})`);
                    continue;
                }
            }
        }

        // TPM Check
        if (usage.tpm && usage.tpm.limit > 0 && usage.tpm.windowStart) {
            const tpmWindowStart = new Date(usage.tpm.windowStart);
            if ((now - tpmWindowStart) < tpmWindowMs) {
                if ((usage.tpm.used || 0) >= usage.tpm.limit) {
                    console.log(`❌ REJECTED: TPM Exceeded (${usage.tpm.used}/${usage.tpm.limit})`);
                    continue;
                }
            }
        }

        // RPD Check
        if (usage.rpd && usage.rpd.limit > 0 && usage.rpd.windowStart) {
            const rpdWindowStart = new Date(usage.rpd.windowStart);

            // Check expiry
            if ((now - rpdWindowStart) >= rpdWindowMs) {
                console.log(`ℹ️ INFO: RPD Window Expired (Available to reset)`);
            } else {
                if ((usage.rpd.used || 0) >= usage.rpd.limit) {
                    console.log(`❌ REJECTED: RPD Exceeded (${usage.rpd.used}/${usage.rpd.limit})`);
                    continue;
                }
            }
        }

        // Global Limit check
        if ((usage.used || 0) >= (usage.limit || 1000000)) {
            console.log(`❌ REJECTED: Total Usage Exceeded (${usage.used}/${usage.limit})`);
            continue;
        }

        console.log(`✅ SELECTED: This model would be selected.`);
        break; // Stop after finding first available
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
