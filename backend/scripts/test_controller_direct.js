// backend/scripts/test_controller_direct.js
require('dotenv').config({ path: '.env.production' }); // Load env for AI Keys
const aiDevTaskController = require('../controllers/aiDevTaskController');

// Mock Request and Response
const mockReq = {
    user: {
        id: 'test-admin',
        role: 'SUPER_ADMIN',
        firstName: 'Test',
        lastName: 'Admin'
    },
    body: {
        message: 'Hello System Expert ' + Date.now(),
        history: [] // Empty history
    }
};

const mockRes = {
    statusCode: 200,
    headers: {},
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`\n✅ Controller Response [${this.statusCode}]:`);
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n🎉 Test Passed: AI responded successfully.');
            process.exit(0);
        } else {
            console.error('\n❌ Test Failed: AI returned error.');
            process.exit(1);
        }
    }
};

console.log('🚀 Testing aiDevTaskController.chatWithSystemExpert directly...');
console.log('📝 Input Message:', mockReq.body.message);

// Execute the controller method
// Note: This calls the real service, which calls the real AI Agent.
// Ensure your .env.production has valid AI Keys.

(async () => {
    try {
        await aiDevTaskController.chatWithSystemExpert(mockReq, mockRes);
    } catch (error) {
        console.error('❌ catastrophic Error:', error);
        process.exit(1);
    }
})();
