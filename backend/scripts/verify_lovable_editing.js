const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Simple 1x1 Red Pixel for testing input
const SAMPLE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testLovableEdit() {
    const url = 'https://hmngebgvsuxrwcvadaxa.supabase.co/functions/v1/external-edit-image';
    const prompt = 'Turn this red pixel into a blue pixel'; // Simple test prompt

    console.log(`Testing Lovable Edit Endpoint: ${url}`);
    console.log(`Prompt: ${prompt}`);

    try {
        const startTime = Date.now();
        const response = await axios.post(url, {
            image: SAMPLE_IMAGE_BASE64,
            prompt: prompt
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Response received in ${duration}ms`);

        if (response.data && response.data.image) {
            console.log('🎉 Edited Image data found (Base64).');
            const buffer = Buffer.from(response.data.image, 'base64');
            const filename = `lovable_edit_test_${Date.now()}.png`;
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

testLovableEdit();
