const axios = require('axios');

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function testExcelExport() {
    try {
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'shrouk0@gmail.com',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('📥 Testing Excel Export for All Assets Report...');
        const response = await axios.get(`${BASE_URL}/hr/asset-reports/all-assets?format=excel`, {
            headers,
            responseType: 'arraybuffer'
        });

        // Convert buffer to string to see error
        const text = Buffer.from(response.data).toString('utf-8');
        console.log('Response:', text);

    } catch (error) {
        if (error.response?.data) {
            const text = Buffer.from(error.response.data).toString('utf-8');
            console.error('❌ Error:', text);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testExcelExport();
