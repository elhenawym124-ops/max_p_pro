const OllamaProvider = require('../services/aiAgent/providers/OllamaProvider');

console.log('🧪 Testing Ollama Provider Integration...');

async function testOllama() {
    // 1. Initialize Provider
    // Assuming localhost:11434 for now. User can change this in DB later.
    const provider = new OllamaProvider({
        apiKey: 'ollama', // Not used by Ollama usually, but needed for constructor
        baseUrl: 'https://ollama.maxp.online'
    });

    console.log(`🔌 Connecting to: ${provider.baseUrl}`);

    // 2. Test Connection
    try {
        console.log('Checking connection...');
        const isConnected = await provider.testConnection();
        if (isConnected) {
            console.log('✅ Connection successful!');
        } else {
            console.error('❌ Connection failed! Is Ollama running?');
            return;
        }
    } catch (e) {
        console.error('❌ Connection test error:', e.message);
        return;
    }

    // 3. List Models
    try {
        console.log('Fetching available models...');
        const models = await provider.getAvailableModels();
        console.log('📋 Available Models:', models);

        if (models.length === 0) {
            console.warn('⚠️ No models found in Ollama. You might need to pull one (e.g. `ollama pull llama3`)');
        }
    } catch (e) {
        console.warn('⚠️ Failed to list models:', e.message);
    }

    // 4. Test Generation
    try {
        const modelName = 'qwen3-vl:2b'; // Default to llama3, change if needed
        console.log(`🧠 Generating response with model: ${modelName}...`);

        const response = await provider.generateResponse('Hello, tell me a one-sentence joke.', {
            model: modelName,
            max_tokens: 50
        });

        console.log('✅ Response received:');
        console.log('------------------------------------------------');
        console.log(response.text());
        console.log('------------------------------------------------');
        console.log('Usage:', response.usageMetadata);
    } catch (e) {
        console.error('❌ Generation failed:', e.message);
        console.log('Using fallback model may help if llama3 is missing.');
    }
}

testOllama();
