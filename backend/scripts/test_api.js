const axios = require('axios');

async function test() {
    const companyId = 'cme8oj1fo000cufdcg2fquia9';
    const baseUrl = 'https://maxp-ai.pro/api/v1/analytics';

    try {
        console.log('--- Testing Analytics Routes ---');
        // This will likely fail with 401 as we don't have a token, 
        // but it confirms the route is handled by Express and not crashing.
        const res = await axios.get(`${baseUrl}/store`, {
            headers: {
                'X-Company-Id': companyId
            }
        });
        console.log('Response:', res.data);
    } catch (error) {
        console.log('Response Status:', error.response?.status);
        console.log('Response Body:', error.response?.data || error.message);
    }
}

test();
