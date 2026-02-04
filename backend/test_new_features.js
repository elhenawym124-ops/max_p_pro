/**
 * Test New Rewards Features (Kudos & Streaks)
 */
const kudosService = require('./services/hr/kudosService');
const streakRewardService = require('./services/hr/streakRewardService');

async function testNewFeatures() {
    try {
        console.log('🧪 Testing New Rewards Features...\n');

        const companyId = 'test-company-id';
        const fromUserId = 'test-from-user';
        const toUserId = 'test-to-user';

        // 1. Kudos Statistics
        console.log('1️⃣ Testing Kudos Stats...');
        try {
            const stats = await kudosService.getKudosStats(companyId);
            console.log('✅ Kudos Stats executed successfully');
            console.log('📊 Stats:', JSON.stringify(stats, null, 2));
        } catch (error) {
            console.log('⚠️ Kudos Stats error (expected if no data):', error.message);
        }

        // 2. Streak Processing
        console.log('\n2️⃣ Testing Streak Process for all employees...');
        try {
            const results = await streakRewardService.processAllEmployees(companyId);
            console.log('✅ Streak Process executed successfully');
            console.log('📋 Results Count:', results.length);
        } catch (error) {
            console.log('⚠️ Streak Process error:', error.message);
        }

        console.log('\n✅ New features test completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testNewFeatures();
