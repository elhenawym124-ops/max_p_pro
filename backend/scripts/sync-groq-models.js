const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function syncGroqModels() {
    try {
        console.log('🔄 Starting Groq Models Sync...');

        // 1. Get the Groq Key from DB
        const groqKey = await prisma.aIKey.findFirst({
            where: { provider: 'GROQ' }
        });

        if (!groqKey) {
            console.error('❌ No Groq API Key found in database!');
            return;
        }

        console.log(`🔑 Found Groq Key ID: ${groqKey.id}`);

        // 2. Fetch Models from Groq API
        console.log('📡 Fetching available models from Groq API...');
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${groqKey.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const activeModels = response.data.data;
        console.log(`✅ Found ${activeModels.length} models from Groq.`);

        // 3. Update Database
        const existingConfiguredModels = await prisma.aIModelConfig.findMany({
            where: { keyId: groqKey.id }
        });

        for (const model of activeModels) {
            const modelId = model.id;
            const existing = existingConfiguredModels.find(m => m.modelName === modelId);

            if (existing) {
                console.log(`🔹 Model active: ${modelId}`);
                if (!existing.isEnabled) {
                    await prisma.aIModelConfig.update({
                        where: { id: existing.id },
                        data: { isEnabled: true }
                    });
                    console.log(`  -> Enabled ${modelId}`);
                }
            } else {
                console.log(`🆕 Found new model: ${modelId}`);
                await prisma.aIModelConfig.create({
                    data: {
                        keyId: groqKey.id,
                        modelName: modelId,
                        isEnabled: true,
                        priority: 5 // Default priority for auto-discovered models
                    }
                });
                console.log(`  -> Added ${modelId} to database`);
            }
        }

        console.log('\n🎉 Active Models Sync Complete!');

    } catch (error) {
        console.error('❌ Error syncing models:', error.message);
        if (error.response) {
            console.error('   Details:', error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

syncGroqModels();
