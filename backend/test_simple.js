const axios = require('axios');

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function test() {
    try {
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'shrouk0@gmail.com',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('Testing Report 1: All Assets');
        const r1 = await axios.get(`${BASE_URL}/hr/asset-reports/all-assets`, { headers });
        console.log('✅ Success:', r1.data.data.summary);

        console.log('\nTesting Report 2: Employee Custody');
        const r2 = await axios.get(`${BASE_URL}/hr/asset-reports/employee-custody`, { headers });
        console.log('✅ Success:', r2.data.data.summary);

        console.log('\nTesting Report 3: Available Assets');
        const r3 = await axios.get(`${BASE_URL}/hr/asset-reports/available`, { headers });
        console.log('✅ Success:', r3.data.data.summary);

        console.log('\nTesting Report 4: Maintenance');
        const r4 = await axios.get(`${BASE_URL}/hr/asset-reports/maintenance`, { headers });
        console.log('✅ Success:', r4.data.data.summary);

        console.log('\nTesting Report 5: Lost/Damaged');
        const r5 = await axios.get(`${BASE_URL}/hr/asset-reports/lost-damaged`, { headers });
        console.log('✅ Success:', r5.data.data.summary);

        console.log('\nTesting Report 6: Total Value');
        const r6 = await axios.get(`${BASE_URL}/hr/asset-reports/total-value`, { headers });
        console.log('✅ Success:', r6.data.data.summary);

        console.log('\n🎉 All 6 reports tested successfully!');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

test();
