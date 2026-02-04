const ModelManager = require('../services/aiAgent/modelManager');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function verify() {
    console.log('🧪 Starting Verification of AI Limits Refactoring...');

    // Mock AI Agent Service (not needed for this test)
    const mockAiAgentService = {};

    const modelManager = new ModelManager(mockAiAgentService);

    // 1. Check if limits are loaded
    console.log('🔄 Loading limits...');
    await modelManager.loadModelLimits(true);

    // 2. Check a known model
    const modelName = 'gemini-1.5-pro';
    const defaults = modelManager.getModelDefaults(modelName);

    console.log(`📊 Defaults for ${modelName}:`, defaults);

    // Validation
    if (defaults.rpm === 150 && defaults.tpm === 4000000) {
        console.log('✅ PASS: Limits match expected values (seeded from legacy config).');
    } else {
        console.error('❌ FAIL: Limits do not match expected values.');
        console.error('Expected: RPM=150, TPM=4000000');
        console.error(`Actual: RPM=${defaults.rpm}, TPM=${defaults.tpm}`);
        process.exit(1);
    }

    // 3. Check unknown model (should fallback to default)
    const unknownModel = 'unknown-model-xyz';
    const unknownDefaults = modelManager.getModelDefaults(unknownModel);
    console.log(`📊 Defaults for ${unknownModel}:`, unknownDefaults);

    if (unknownDefaults.limit === 250000) { // Default limit
        console.log('✅ PASS: Fallback mechanism works.');
    } else {
        console.error('❌ FAIL: Fallback mechanism failed.');
    }

    process.exit(0);
}

verify().catch(e => {
    console.error('💥 Error during verification:', e);
    process.exit(1);
});
