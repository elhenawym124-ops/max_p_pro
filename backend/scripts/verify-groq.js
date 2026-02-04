const { PrismaClient } = require('@prisma/client');
const GroqProvider = require('../services/aiAgent/providers/GroqProvider');

const prisma = new PrismaClient();
const apiKey = process.env.GROQ_API_KEY || 'your-groq-api-key';

async function main() {
    console.log('🚀 Starting Groq Verification...');

    try {
        // 1. Ensure Key Exists in DB (Upsert)
        console.log('💾 Checking/Inserting Key in Database...');
        const key = await prisma.aIKey.upsert({
            where: { apiKey: apiKey },
            update: {
                provider: 'GROQ',
                isActive: true
            },
            create: {
                name: 'Groq Verification Key',
                provider: 'GROQ',
                apiKey: apiKey,
                baseUrl: 'https://api.groq.com/openai/v1',
                isActive: true,
                keyType: 'CENTRAL',
                usage: JSON.stringify({ note: 'Verification Script' }),
                priority: 10,
                models: {
                    create: [
                        { modelName: 'llama-3.1-8b-instant', priority: 1, isEnabled: true },
                        { modelName: 'llama-3.3-70b-versatile', priority: 2, isEnabled: true },
                        { modelName: 'mixtral-8x7b-32768', priority: 3, isEnabled: true },
                        { modelName: 'gemma2-9b-it', priority: 4, isEnabled: true }
                    ]
                }
            }
        });
        console.log('✅ Key ensured in DB with ID:', key.id);

        // 2. Instantiate Provider
        console.log('🔌 Instantiating GroqProvider...');
        const provider = new GroqProvider({
            apiKey: key.apiKey,
            baseUrl: key.baseUrl
        });

        // 3. Test Connection
        console.log('📡 Testing Connection (Listing Models)...');
        const models = await provider.getAvailableModels();
        console.log('📋 Available Models:', models);

        if (models.length > 0) {
            console.log('✅ Connection Successful!');
        } else {
            console.error('❌ Connection Failed or No Models!');
            return;
        }

        // 4. Test Generation
        console.log('💬 Testing Chat Generation...');
        const prompt = 'Hello, are you working? Reply in one word.';
        const response = await provider.generateResponse(prompt, {
            model: 'llama-3.3-70b-versatile'
        });

        console.log('✅ Response Received:');
        console.log('--------------------------------------------------');
        console.log(response.content);
        console.log('--------------------------------------------------');
        console.log('💰 Cost:', response.cost?.formatted);
        console.log('📊 Tokens:', response.usageMetadata?.totalTokenCount);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
