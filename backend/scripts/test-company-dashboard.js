const axios = require('axios');
const jwt = require('jsonwebtoken');

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'; // Fallback to common dev secret if env not loaded
const API_URL = 'https://maxp-ai.pro/api/v1/company/dashboard';

async function testCompanyDashboardApi() {
    try {
        console.log('🔧 Starting Company Dashboard Verification...');

        // 1. Forge a Token for the specific failing user
        // User ID: cml850j4n001bvaccfc2oicqc (from logs)
        // Company ID: cml850idq0018vaccef4a0g96 (from logs)
        console.log('1. Forging Token for Owner...');
        const payload = {
            id: 'cml850j4n001bvaccfc2oicqc',
            userId: 'cml850j4n001bvaccfc2oicqc', // Some middleware checks id, some userId
            email: 'superadmin2@system.com',
            role: 'OWNER',
            companyId: 'cml850idq0018vaccef4a0g96'
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        console.log('   Token forged successfully.');

        // 2. Call Dashboard API
        console.log('2. Fetching Company Dashboard Data...');
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        // 3. Validation
        const data = response.data.data;
        if (!data) {
            console.error('❌ CRITICAL: Response data is missing!');
            process.exit(1);
        }

        console.log('3. Validating Reponse Structure...');

        // Check for key fields that were failing (users count)
        if (data.counts && typeof data.counts.users === 'number') {
            console.log(`   ✅ Success! Users count retrieved: ${data.counts.users}`);
        } else {
            console.error('   ❌ FAILED: User count is missing or invalid.');
            console.log('   Received:', JSON.stringify(data.counts, null, 2));
            process.exit(1);
        }

        console.log('\n✨ verification Passed! The 500 Corrected.');

    } catch (error) {
        if (error.response) {
            console.error('\n❌ API Error:', error.response.status);
            console.error('   Message:', error.response.data.message);
            if (error.response.data.error) {
                console.error('   Details:', error.response.data.error);
            }
        } else {
            console.error('\n❌ Network/Script Error:', error.message);
        }
        process.exit(1);
    }
}

testCompanyDashboardApi();
