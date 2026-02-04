const axios = require('axios');
const fs = require('fs');

async function testLovableEndpoint() {
    const url = 'https://hmngebgvsuxrwcvadaxa.supabase.co/functions/v1/external-generate-image';
    const prompt = 'A futuristic city skyline at sunset, cyberpunk style';

    console.log(`Testing Lovable Endpoint: ${url}`);
    console.log(`Prompt: ${prompt}`);

    try {
        const startTime = Date.now();
        const response = await axios.post(url, {
            prompt: prompt,
            model: "basic"
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Response received in ${duration}ms`);

        if (response.data && response.data.image) {
            console.log('🎉 Image data found (Base64).');
            const buffer = Buffer.from(response.data.image, 'base64');
            const filename = `lovable_test_${Date.now()}.png`;
            fs.writeFileSync(filename, buffer);
            console.log(`🖼️ Saved image to ${filename}`);
        } else {
            console.log('⚠️ Warning: No image field in response:', response.data);
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testLovableEndpoint();
