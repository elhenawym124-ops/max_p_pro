const axios = require('axios');

async function testDashboardApi() {
    try {
        // 1. Login as Super Admin to get token
        console.log('1. Logging in as Super Admin...');
        const loginResponse = await axios.post('https://maxp-ai.pro/api/v1/super-admin/login', {
            email: 'superadmin@system.com',
            password: 'password123'
        });

        if (!loginResponse.data.success) {
            console.error('Login failed:', loginResponse.data);
            return;
        }

        const token = loginResponse.data.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Call Dashboard API
        console.log('2. Fetching Dev Dashboard Data...');
        const dashboardResponse = await axios.get('https://maxp-ai.pro/api/v1/super-admin/dev/dashboard', {
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
            console.log('✅ Structure looks correct:');
            console.log('   - overview.totalTasks:', data.overview.totalTasks);
            console.log('   - overview.myTasks:', data.overview.myTasks);
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
