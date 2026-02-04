const axios = require('axios');
const jwt = require('jsonwebtoken');

// Config
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const API_URL = 'https://maxp-ai.pro/api/v1/super-admin/dev/dashboard';

async function testDashboardApi() {
    try {
        // 1. Forge a Super Admin Token
        console.log('1. Forging Super Admin Token...');
        const payload = {
            id: 'cme8one7i0002uf6s5vj1gpv0', // Using ID from user logs
            email: 'superadmin@system.com',
            role: 'SUPER_ADMIN'
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        console.log('Token forged successfully.');

        // 2. Call Dashboard API
        console.log('2. Fetching Dev Dashboard Data...');
        const dashboardResponse = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Status:', dashboardResponse.status);
        console.log('Response Structure:');
        console.log(JSON.stringify(dashboardResponse.data, null, 2));

        // 3. Validation
        const data = dashboardResponse.data.data;
        if (!data) {
            console.error('CRITICAL: Response data is missing!');
        } else if (!data.overview) {
            console.error('CRITICAL: data.overview is missing!');
        } else {
            console.log('✅ Structure looks correct!');
            console.log('   - Total Tasks:', data.overview.totalTasks);
            console.log('   - My Tasks:', data.overview.myTasks);
        }

    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        } else {
            console.error('Network/Script Error:', error.message);
        }
    }
}

testDashboardApi();
