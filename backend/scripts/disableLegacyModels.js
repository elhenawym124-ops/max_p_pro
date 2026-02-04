const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function disableLegacyModels() {
    try {
        console.log('\n🚫 Disabling Legacy Gemini Models (1.5, 1.0, etc.)...\n');

        const legacyModels = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.0-pro',
            'gemini-pro',
            'gemini-flash',
            'gemini-1.0-pro-001',
            'gemini-1.0-pro-latest',
            'gemini-1.0-pro-vision-latest',
            'gemini-pro-vision'
        ];

        console.log('📋 Target models to disable:', legacyModels);

        const result = await prisma.geminiKeyModel.updateMany({
            where: {
                model: {
                    in: legacyModels
                },
                isEnabled: true
            },
            data: {
                isEnabled: false
            }
        });

        console.log(`\n✅ Successfully disabled ${result.count} model entries.`);

        // Log remaining active models
        const activeModels = await prisma.geminiKeyModel.groupBy({
            by: ['model'],
            where: {
                isEnabled: true
            },
            _count: {
                _all: true
            }
        });

        console.log('\n📊 Remaining Active Models Summary:');
        activeModels.forEach(m => {
            console.log(`   - ${m.model}: ${m._count._all} active instances`);
        });

    } catch (error) {
        console.error('❌ Error disabling legacy models:', error);
    } finally {
        await prisma.$disconnect();
    }
}

disableLegacyModels();
