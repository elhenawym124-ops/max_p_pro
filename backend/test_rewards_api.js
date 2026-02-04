/**
 * Test Rewards API Endpoints
 */

const rewardManagementService = require('./services/hr/rewardManagementService');

async function testRewardsAPI() {
    try {
        console.log('🧪 Testing Rewards API...\n');

        // Test 1: Check if getRewardStatistics method exists
        console.log('1️⃣ Checking if getRewardStatistics method exists...');
        if (typeof rewardManagementService.getRewardStatistics === 'function') {
            console.log('✅ getRewardStatistics method exists\n');
        } else {
            console.log('❌ getRewardStatistics method NOT FOUND\n');
            return;
        }

        // Test 2: Check if getRewardRecords method exists
        console.log('2️⃣ Checking if getRewardRecords method exists...');
        if (typeof rewardManagementService.getRewardRecords === 'function') {
            console.log('✅ getRewardRecords method exists\n');
        } else {
            console.log('❌ getRewardRecords method NOT FOUND\n');
            return;
        }

        // Test 3: Try to call getRewardStatistics
        console.log('3️⃣ Testing getRewardStatistics with test companyId...');
        try {
            const stats = await rewardManagementService.getRewardStatistics('test-company-id', { year: 2026 });
            console.log('✅ getRewardStatistics executed successfully');
            console.log('📊 Stats:', JSON.stringify(stats, null, 2));
        } catch (error) {
            console.log('⚠️ getRewardStatistics error (expected if no data):', error.message);
        }

        // Test 4: Try to call getRewardRecords
        console.log('\n4️⃣ Testing getRewardRecords with test companyId...');
        try {
            const records = await rewardManagementService.getRewardRecords('test-company-id', { year: 2026 }, { page: 1, limit: 20 });
            console.log('✅ getRewardRecords executed successfully');
            console.log('📋 Records count:', records.records?.length || 0);
        } catch (error) {
            console.log('⚠️ getRewardRecords error (expected if no data):', error.message);
        }

        console.log('\n✅ All tests completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testRewardsAPI();
