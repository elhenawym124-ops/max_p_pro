const axios = require('axios');

async function testRaw() {
    const url = 'https://ollama.maxp.online/api/chat';
    const body = {
        model: 'deepscaler:1.5b',
        messages: [{ role: 'user', content: 'hi' }],
        stream: false
    };

    console.log('📡 Sending RAW request to:', url);
    console.log('📦 Body:', JSON.stringify(body, null, 2));

    try {
        const start = Date.now();
        const response = await axios.post(url, body, {
            timeout: 180000,
            headers: { 'Content-Type': 'application/json' }
        });
        const duration = Date.now() - start;
        console.log(`✅ Success in ${duration}ms`);
        console.log('📄 Data:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('📄 Response Data:', error.response.data);
            console.error('📄 Response Status:', error.response.status);
        }
    }
}

testRaw();
