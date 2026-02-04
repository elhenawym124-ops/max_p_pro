const ragService = require('../services/ragService');

async function verifyRagFix() {
    console.log('🧪 Starting RAG ipAddress Fix Verification...');

    // 1. Test with valid IP string
    console.log('\n--- Scenario 1: Valid IP String ---');
    try {
        // We don't need real results, just check if it fails or logs correctly
        await ragService.retrieveRelevantData('test query', 'general', null, 'company123', '1.2.3.4');
        console.log('✅ Scenario 1: Passed (Valid string accepted)');
    } catch (e) {
        console.error('❌ Scenario 1: Failed', e.message);
    }

    // 2. Test with invalid IP (Array/Object) - This was the bug
    console.log('\n--- Scenario 2: Invalid IP (Array/Object) ---');
    try {
        const maliciousIp = [{ msg: 'I am a memory object' }];
        await ragService.retrieveRelevantData('test query', 'general', null, 'company123', maliciousIp);
        console.log('✅ Scenario 2: Passed (Invalid type handled cleanly)');
    } catch (e) {
        console.error('❌ Scenario 2: Failed', e.message);
    }

    // 3. Test with null
    console.log('\n--- Scenario 3: Null IP ---');
    try {
        await ragService.retrieveRelevantData('test query', 'general', null, 'company123', null);
        console.log('✅ Scenario 3: Passed (Null handled cleanly)');
    } catch (e) {
        console.error('❌ Scenario 3: Failed', e.message);
    }

    console.log('\n✨ RAG Fix Verification Complete!');
    process.exit(0);
}

verifyRagFix();
