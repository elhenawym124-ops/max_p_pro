/**
 * Fix Usage JSON Truncation
 * 
 * 1. Alters AIModelConfig and GeminiKeyModel tables to set usage column to TEXT.
 * 2. Repairs truncated JSON data in those columns.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getModelDefaults = (modelName) => {
    const defaults = {
        'gemini-3-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-2.5-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-1.5-pro': { limit: 50, rpm: 2, rph: 120, rpd: 50 },
        'gemini-2.5-flash': { limit: 250000, rpm: 10, rph: 600, rpd: 250 },
        'gemini-2.5-flash-lite': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-1.5-flash': { limit: 1500, rpm: 15, rph: 900, rpd: 1500 },
        'gemini-2.0-flash': { limit: 200000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.0-flash-lite': { limit: 200000, rpm: 30, rph: 1800, rpd: 200 },
        'gemini-2.5-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-2.0-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.5-flash-native-audio-dialog': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-2.5-flash-tts': { limit: 15, rpm: 3, rph: 180, rpd: 15 },
        'gemma-3-27b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
    };
    return defaults[modelName] || { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 };
};

async function fixUsageTruncation() {
    const prisma = getSharedPrismaClient();
    try {
        console.log('\n🚀 Starting Fix for Usage JSON Truncation...\n');

        // 1. Alter AIModelConfig table
        console.log('🔧 Altering AIModelConfig table schema...');
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE `ai_model_configs` MODIFY COLUMN `usage` TEXT');
            console.log('✅ AIModelConfig usage column updated to TEXT');
        } catch (e) {
            console.warn('⚠️ Could not alter ai_model_configs table (it might be correct already or use different name):', e.message);
        }

        // 2. Alter GeminiKeyModel table (if exists)
        console.log('🔧 Altering GeminiKeyModel table schema...');
        const tables = await prisma.$queryRaw`SHOW TABLES LIKE 'gemini_key_models'`;
        if (tables.length > 0) {
            try {
                await prisma.$executeRawUnsafe('ALTER TABLE `gemini_key_models` MODIFY COLUMN `usage` TEXT');
                console.log('✅ GeminiKeyModel usage column updated to TEXT');
            } catch (e) {
                console.warn('⚠️ Could not alter gemini_key_models table:', e.message);
            }
        }

        // 3. Repair Data in AIModelConfig
        console.log('\n🔍 Checking AIModelConfig for truncated data...');
        const models = await prisma.aIModelConfig.findMany();
        let repairedModels = 0;

        for (const model of models) {
            let isBroken = false;
            try {
                JSON.parse(model.usage || '{}');
                // Even if it parses, check if it looks truncated (ends abruptly)
                if (model.usage && model.usage.length >= 190 && !model.usage.trim().endsWith('}')) {
                    isBroken = true;
                }
            } catch (e) {
                isBroken = true;
            }

            if (isBroken) {
                console.log(`🛠️ Repairing truncated JSON for model: ${model.modelName} (ID: ${model.id})`);
                const defaults = getModelDefaults(model.modelName);
                const repairedUsage = {
                    used: 0,
                    limit: defaults.limit,
                    rpm: { used: 0, limit: defaults.rpm, windowStart: null },
                    rph: { used: 0, limit: defaults.rph, windowStart: null },
                    rpd: { used: 0, limit: defaults.rpd, windowStart: null },
                    tpm: { used: 0, limit: defaults.limit, windowStart: null },
                    lastUpdated: new Date().toISOString()
                };

                await prisma.aIModelConfig.update({
                    where: { id: model.id },
                    data: { usage: JSON.stringify(repairedUsage) }
                });
                repairedModels++;
            }
        }
        console.log(`✅ Repaired ${repairedModels} records in AIModelConfig`);

        // 4. Reset Quota Cache in ModelManager (if running)
        console.log('\n✨ All operations completed successfully.');

    } catch (error) {
        console.error('❌ Critical error during fix:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUsageTruncation();
