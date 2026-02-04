const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listModels() {
    try {
        const keyRecord = await prisma.aIKey.findFirst({
            where: { provider: 'GOOGLE', isActive: true }
        });

        if (!keyRecord) {
            console.error('No active Google key found in DB');
            return;
        }

        const genAI = new GoogleGenerativeAI(keyRecord.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init

        console.log('Fetching available models...');
        // The SDK might not expose listModels directly easily on the instance, need strict API call?
        // Actually typically the SDK has a ModelManager or similar.
        // Let's use REST to list models to be sure.

        // Using fetch/axios
        const axios = require('axios');
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${keyRecord.apiKey}`;
        try {
            const response = await axios.get(url);
            console.log('Available Models:');
            response.data.models.forEach(m => {
                if (m.name.includes('image') || m.supportedGenerationMethods.includes('image')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
                }
            });
            // console.log(JSON.stringify(response.data, null, 2));
        } catch (e) {
            console.error('REST List Failed:', e.message);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listModels();
