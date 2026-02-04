const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MODEL_LIMITS_CONFIG = {
    // Flagship Models
    'gemini-3-pro': { limit: 2000000, rpm: 150, rph: 9000, rpd: 10000, tpm: 4000000 },
    'gemini-3-pro-preview': { limit: 2000000, rpm: 50, rph: 3000, rpd: 1000, tpm: 2000000 },

    // Gemini 2.5
    'gemini-2.5-pro': { limit: 2000000, rpm: 150, rph: 9000, rpd: 10000, tpm: 4000000 },
    'gemini-2.5-flash': { limit: 2000000, rpm: 1000, rph: 60000, rpd: 10000, tpm: 4000000 },
    'gemini-2.5-flash-lite': { limit: 2000000, rpm: 1500, rph: 90000, rpd: 10000, tpm: 4000000 },
    'gemini-2.5-flash-tts': { limit: 10000, rpm: 3, rph: 180, rpd: 10, tpm: 10000 },
    'gemini-2.5-flash-native-audio-dialog': { limit: 2000000, rpm: 999999, rph: 999999, rpd: 999999, tpm: 1000000 },

    // Gemini 2.0
    'gemini-2.0-flash': { limit: 2000000, rpm: 1000, rph: 60000, rpd: 10000, tpm: 4000000 },
    'gemini-2.0-flash-lite': { limit: 2000000, rpm: 1500, rph: 90000, rpd: 10000, tpm: 4000000 },
    'gemini-2.0-flash-lite-preview-02-05': { limit: 2000000, rpm: 1500, rph: 90000, rpd: 10000, tpm: 4000000 },
    'gemini-2.0-flash-exp': { limit: 2000000, rpm: 1000, rph: 60000, rpd: 10000, tpm: 4000000 },
    'gemini-2.0-flash-live': { limit: 1000000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 },
    'gemini-2.0-pro-exp-02-05': { limit: 2000000, rpm: 150, rph: 9000, rpd: 10000, tpm: 4000000 },

    // Gemini 1.5
    'gemini-1.5-pro': { limit: 2000000, rpm: 150, rph: 9000, rpd: 10000, tpm: 4000000 },
    'gemini-1.5-flash': { limit: 2000000, rpm: 1000, rph: 60000, rpd: 10000, tpm: 4000000 },

    // Gemma Models (High RPD - Great for fallback!)
    'gemma-3-27b': { limit: 1000000, rpm: 30, rph: 1800, rpd: 14400, tpm: 15000 },
    'gemma-3-12b': { limit: 1000000, rpm: 30, rph: 1800, rpd: 14400, tpm: 15000 },
    'gemma-3-4b': { limit: 1000000, rpm: 30, rph: 1800, rpd: 14400, tpm: 15000 },
    'gemma-3-2b': { limit: 1000000, rpm: 30, rph: 1800, rpd: 14400, tpm: 15000 },
    'gemma-3-1b': { limit: 1000000, rpm: 30, rph: 1800, rpd: 14400, tpm: 15000 },

    // Other Models
    'gemini-robotics-er-1.5-preview': { limit: 1000000, rpm: 10, rph: 600, rpd: 20, tpm: 250000 },
    'learnlm-1.5-pro-experimental': { limit: 1000000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 },
    'learnlm-2.0-flash-experimental': { limit: 1000000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 },

    // Legacy
    'gemini-pro': { limit: 32000, rpm: 60, rph: 3600, rpd: 10000, tpm: 125000 },
    'gemini-flash': { limit: 32000, rpm: 60, rph: 3600, rpd: 10000, tpm: 125000 },

    // Default for unknown models
    'defaults': { limit: 250000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 }
};

async function main() {
    console.log('🌱 Seeding AI Model Limits...');

    for (const [modelName, limits] of Object.entries(MODEL_LIMITS_CONFIG)) {
        if (modelName === 'defaults') continue;

        try {
            await prisma.aIModelLimit.upsert({
                where: { modelName: modelName },
                update: {
                    rpm: limits.rpm,
                    rph: limits.rph,
                    rpd: limits.rpd,
                    tpm: limits.tpm,
                    maxTokens: 8192, // Default max tokens
                    isDeprecated: false
                },
                create: {
                    modelName: modelName,
                    rpm: limits.rpm,
                    rph: limits.rph,
                    rpd: limits.rpd,
                    tpm: limits.tpm,
                    maxTokens: 8192,
                    isDeprecated: false,
                    description: `Auto-seeded from legacy config`
                }
            });
            console.log(`✅ Seeded ${modelName}`);
        } catch (e) {
            console.error(`❌ Failed to seed ${modelName}:`, e.message);
        }
    }

    // Seed Helper Key
    try {
        const limits = MODEL_LIMITS_CONFIG['defaults'];
        await prisma.aIModelLimit.upsert({
            where: { modelName: 'default_fallback' },
            update: {
                rpm: limits.rpm,
                rph: limits.rph,
                rpd: limits.rpd,
                tpm: limits.tpm
            },
            create: {
                modelName: 'default_fallback',
                rpm: limits.rpm,
                rph: limits.rph,
                rpd: limits.rpd,
                tpm: limits.tpm,
                description: 'Default limits for unknown models'
            }
        });
        console.log(`✅ Seeded default_fallback`);
    } catch (e) {
        console.error(`❌ Failed to seed default_fallback:`, e.message);
    }

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
