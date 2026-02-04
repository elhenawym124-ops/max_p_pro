const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetUsage() {
    console.log('🔄 Resetting all Gemini Key Model usage...');

    try {
        const models = await prisma.geminiKeyModel.findMany();
        for (const model of models) {
            const defaultUsage = JSON.stringify({
                used: 0,
                limit: 125000, // Safe default
                rpm: { used: 0, limit: 15, windowStart: null },
                rph: { used: 0, limit: 1000, windowStart: null },
                rpd: { used: 0, limit: 5000, windowStart: null },
                tpm: { used: 0, limit: 125000, windowStart: null }
            });

            await prisma.geminiKeyModel.update({
                where: { id: model.id },
                data: { usage: defaultUsage }
            });
            process.stdout.write('.');
        }
        console.log('\n✅ Usage usage reset complete!');

        console.log('🔄 Clearing ExcludedModel table...');
        try {
            await prisma.excludedModel.deleteMany({});
            console.log('✅ ExcludedModel table cleared!');
        } catch (e) {
            console.log('⚠️ Could not clear ExcludedModel (table might not exist or other error):', e.message);
        }

        console.log('\n✅ ALL AI LIMITS FULLY RESET!');
    } catch (error) {
        console.error('❌ Error resetting usage:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetUsage();
