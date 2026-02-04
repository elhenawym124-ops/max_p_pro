const { conversationCache } = require('../utils/cachingUtils');
const redisConfig = require('../config/redis');

async function testCache() {
    console.log('🚀 Starting Redis Cache Verification...');
    console.log('📊 Configuration:', JSON.stringify(redisConfig, null, 2));

    try {
        // Wait for Redis connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        const testId = 'test_company_' + Date.now();
        const testData = { id: 1, name: "Test Conversation" };

        console.log(`\n1️⃣ Create Cache Entry (${testId})...`);
        await conversationCache.setConversations(testId, [testData]);
        console.log('✅ Set operation completed');

        console.log('\n2️⃣ Read Cache Entry...');
        const cached = await conversationCache.getConversations(testId);

        if (cached && cached[0].id === 1) {
            console.log('✅ Cache HIT! Data retrieved successfully:', JSON.stringify(cached));
        } else {
            console.error('❌ Cache MISS or Data Mismatch:', cached);
            process.exit(1);
        }

        console.log('\n3️⃣ Invalidate Cache...');
        await conversationCache.invalidateConversation('dummy_msg_id', testId);

        const afterInvalidate = await conversationCache.getConversations(testId);
        if (!afterInvalidate) {
            console.log('✅ Cache Invalidated successfully');
        } else {
            console.error('❌ Failed to invalidate cache');
            process.exit(1);
        }

        console.log('\n🎉 ALL REDIS CACHE TESTS PASSED!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

testCache();
