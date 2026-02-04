const HuggingFaceProvider = require('../services/aiAgent/providers/HuggingFaceProvider');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Starting Hugging Face Verification with REAL Token...');

    // 1. Test Provider Implementation directly
    console.log('\nTesting Provider Class...');
    try {
        const provider = new HuggingFaceProvider({
            apiKey: process.env.HUGGINGFACE_API_KEY || 'YOUR_HF_API_KEY',
            id: 'test_id_real'
        });

        console.log('✅ Provider instantiated successfully');

        // 1.1 Test Real Generation
        console.log('\n⏳ Testing Real Generation (Model: meta-llama/Meta-Llama-3-8B-Instruct)...');
        console.log('   Note: This might take a few seconds...');

        const response = await provider.generateResponse('Are you working? Reply with "Yes, I am working!"', {
            maxOutputTokens: 50,
            temperature: 0.7
        });

        if (response.success) {
            console.log('✅ Real Generation Successful!');
            console.log('--------------------------------------------------');
            console.log('🤖 AI Response:', response.content);
            console.log('--------------------------------------------------');
        } else {
            console.error('❌ Real Generation Failed:', response.error);
        }

    } catch (e) {
        console.error('❌ Provider Test Failed:', e);
    }

    // 2. Test Database Enum Support (Quick Check)
    console.log('\nTesting Database Enum Support...');
    try {
        await prisma.aIKey.create({
            data: {
                name: 'Test HF Key',
                provider: 'HUGGINGFACE',
                apiKey: 'hf_test_123',
                keyType: 'COMPANY',
                companyId: 'non_existent_company'
            }
        });
    } catch (e) {
        if (e.message.includes('Foreign key constraint failed')) {
            console.log('✅ Prisma Client accepted "HUGGINGFACE" enum (Database rejected FK as expected)');
        } else {
            // console.log('⚠️ Other error (Result inconclusive):', e.message);
        }
    }

    console.log('\nVerification Complete.');
    process.exit(0);
}

verify();
