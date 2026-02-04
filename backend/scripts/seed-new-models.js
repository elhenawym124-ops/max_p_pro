const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_MODELS = [
    {
        modelName: 'gemini-3-pro',
        rpm: 1000, rph: 10000, rpd: 50000, tpm: 4000000, maxTokens: 32768,
        description: 'Flagship model (Dec 2025). Best for complex reasoning and coding.'
    },
    {
        modelName: 'gemini-3-flash',
        rpm: 2000, rph: 20000, rpd: 100000, tpm: 6000000, maxTokens: 32768,
        description: 'Fastest and most cost-effective model (Dec 2025).'
    },
    {
        modelName: 'gemini-3-deep-think',
        rpm: 500, rph: 5000, rpd: 20000, tpm: 2000000, maxTokens: 65536,
        description: 'Specialized reasoning model for deep analysis.'
    },
    {
        modelName: 'gemini-2.0-pro',
        rpm: 500, rph: 5000, rpd: 20000, tpm: 2000000, maxTokens: 16384,
        description: 'Prior generation high-end model.'
    }
];

const DEPRECATED_MODELS = [
    'gemini-1.0-pro',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.0-pro-vision-latest',
    'gemini-1.0-pro-001',
    'gemini-1.0-pro-latest'
];

async function main() {
    console.log('🌱 Seeding New Gemini Models...');

    // 1. Upsert New Models
    for (const model of NEW_MODELS) {
        await prisma.aIModelLimit.upsert({
            where: { modelName: model.modelName },
            update: {
                rpm: model.rpm,
                rph: model.rph,
                rpd: model.rpd,
                tpm: model.tpm,
                maxTokens: model.maxTokens,
                description: model.description,
                isDeprecated: false // Ensure active
            },
            create: {
                modelName: model.modelName,
                rpm: model.rpm,
                rph: model.rph,
                rpd: model.rpd,
                tpm: model.tpm,
                maxTokens: model.maxTokens,
                description: model.description,
                isDeprecated: false
            }
        });
        console.log(`✅ Upserted: ${model.modelName}`);
    }

    // 2. Mark Deprecated Models
    for (const modelName of DEPRECATED_MODELS) {
        try {
            await prisma.aIModelLimit.update({
                where: { modelName: modelName },
                data: { isDeprecated: true }
            });
            console.log(`🚫 Deprecated: ${modelName}`);
        } catch (e) {
            if (e.code === 'P2025') {
                console.log(`⚠️ Model not found (already clean): ${modelName}`);
            } else {
                console.error(`❌ Error deprecating ${modelName}:`, e.message);
            }
        }
    }

    // 3. Clear Cache Prompt
    console.log('\n⚠️ NOTE: Please clear the ModelManager cache or restart the server to apply changes.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
