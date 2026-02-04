const { getSharedPrismaClient } = require('./services/sharedDatabase');
const assetController = require('./controller/hr/assetController');

async function testAlerts() {
    console.log('🧪 Testing Asset Alerts API Logic...');

    // Mock req/res
    const req = {
        user: { companyId: '71ab1ca7-271d-4e3a-b77c-72a51ddff454' }
    };

    const res = {
        json: (data) => console.log('Response:', JSON.stringify(data, null, 2)),
        status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
    };

    try {
        await assetController.getAssetAlerts(req, res);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAlerts();
