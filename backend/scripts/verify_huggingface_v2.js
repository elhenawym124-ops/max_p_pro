const HuggingFaceProvider = require('../services/aiAgent/providers/HuggingFaceProvider');
const { HfInference } = require('@huggingface/inference');

async function verify() {
    console.log('🔍 Starting Hugging Face Verification (Chat Completion Mode)...');

    // Manual Test with HfInference directly to verify API method first
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || 'YOUR_HF_API_KEY');

    try {
        console.log('\n⏳ Testing Direct Link (chatCompletion) with meta-llama/Meta-Llama-3-8B-Instruct...');

        const response = await hf.chatCompletion({
            model: "meta-llama/Meta-Llama-3-8B-Instruct",
            messages: [
                { role: "user", content: "Hello! Are you working?" }
            ],
            max_tokens: 50, // Note: max_tokens for chat, max_new_tokens for text_gen
            temperature: 0.7
        });

        console.log('✅ Direct Chat Completion Success!');
        console.log('   Response:', response.choices[0].message.content);

    } catch (e) {
        console.error('❌ Direct Test Failed:', e.message);
        console.error(e);
    }

    console.log('\nVerification Complete.');
    process.exit(0);
}

verify();
