
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ModelManager = require('../services/aiAgent/modelManager');

// Mock AiAgentService
const mockAiAgent = {};

async function verifyFailover() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97'; // "شركة التسويق"
    console.log(`🧪 [TEST] Starting Mock-Based Failover Verification for company: ${companyId}`);

    const modelManager = new ModelManager(mockAiAgent);

    // MOCK findBestModel to always return QUOTA_EXHAUSTED
    modelManager.findBestModel = async () => {
        console.log('   🤖 [MOCK] findBestModel called -> Returning QUOTA_EXHAUSTED');
        return { error: 'QUOTA_EXHAUSTED' };
    };

    try {
        // 1. Setup: Ensure Failover is ENABLED
        console.log('\n--- Step 1: Testing with Failover ENABLED ---');
        await prisma.aiSettings.upsert({
            where: { companyId: companyId },
            update: { enableFailover: true },
            create: { companyId: companyId, enableFailover: true }
        });

        // Test Selection
        let result = await modelManager.getCurrentActiveModel(companyId);

        // With failover enabled, it should try to find a global fallback (DeepSeek/Google Global)
        // Since we didn't mock the global part, it should return SOMETHING (either DeepSeek or a global key)
        // IMPORTANT: getCurrentActiveModel has a fallback to `getActiveaIKeyWithModel` or simply returns `systemResult` if provider filtering kicks in.
        // If it returns a result that is NOT the error 'FAILOVER_DISABLED', it passed step 1.

        if (result.error === 'FAILOVER_DISABLED') {
            console.error('   ❌ FAILED: Got FAILOVER_DISABLED even though it is enabled!');
        } else {
            console.log('   ✅ PASSED: System attempted fallback (Result Provider: ' + (result.provider || 'UNKNOWN') + ')');
        }

        // 2. Setup: Ensure Failover is DISABLED
        console.log('\n--- Step 2: Testing with Failover DISABLED ---');
        await prisma.aiSettings.update({
            where: { companyId: companyId },
            data: { enableFailover: false }
        });

        // Test Selection
        result = await modelManager.getCurrentActiveModel(companyId);

        if (result.error === 'FAILOVER_DISABLED') {
            console.log('   ✅ SUCCESS: Received FAILOVER_DISABLED error as expected.');
        } else {
            console.error('   ❌ FAILED: Did not receive expected error. Got:', result);
        }

        // 3. Cleanup
        console.log('\n--- Step 3: Cleanup ---');
        await prisma.aiSettings.update({
            where: { companyId: companyId },
            data: { enableFailover: true }
        });
        console.log('   ✅ Cleanup complete. Failover reset to TRUE.');

    } catch (error) {
        console.error('❌ [TEST] Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFailover();
