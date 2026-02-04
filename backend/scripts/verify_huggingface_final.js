const HuggingFaceProvider = require('../services/aiAgent/providers/HuggingFaceProvider');

async function verify() {
    console.log('🔍 Verifying Updated HuggingFaceProvider Class...');

    const provider = new HuggingFaceProvider({
        apiKey: process.env.HUGGINGFACE_API_KEY || 'YOUR_HF_API_KEY',
        id: 'test_id_real'
    });

    console.log('\n⏳ Testing generateResponse (Wrapped chatCompletion)...');
    const response = await provider.generateResponse('Hello, are you working?', {
        maxOutputTokens: 50,
        temperature: 0.7
    });

    if (response.success) {
        console.log('✅ Success!');
        console.log('--------------------------------------------------');
        console.log('🤖 AI Response:', response.content);
        console.log('--------------------------------------------------');
    } else {
        console.error('❌ Failed:', response.error);
    }

    process.exit(0);
}

verify();
