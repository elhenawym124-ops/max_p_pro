const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc2NTQxOTc2MCwiZXhwIjo0OTIxMTc5NzYwfQ.luOHZEb2BgHS35j2Vn6GiazVwKUOy4Eqm5nR-WmrDVk';

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function testFrontendFlow() {
    console.log('🌐 Simulating Frontend UI Action: Add HUGGINGFACE Key...');

    try {
        const payload = {
            name: "UI Simulation HF Key",
            provider: "HUGGINGFACE",
            apiKey: process.env.HUGGINGFACE_API_KEY || "YOUR_HF_API_KEY", // Use environment variable
            baseUrl: ""
        };

        const response = await axios.post(`${BASE_URL}/super-admin/ai/keys`, payload, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log('✅ Success! Key added via API (just like the UI).');
            console.log('Response:', response.data);

            // Cleanup: Delete the key we just added
            const keyId = response.data.data.id;
            console.log(`\n🧹 Cleaning up (Deleting Key ${keyId})...`);
            await axios.delete(`${BASE_URL}/super-admin/ai/keys/${keyId}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            console.log('✅ Cleanup successful.');

        } else {
            console.error('❌ API returned failure:', response.data);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ HTTP Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Network/Script Error:', error.message);
        }
    }
}

testFrontendFlow();
