const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBrokenUsage() {
    console.log('🔍 Checking for broken JSON usage...');
    try {
        const configs = await prisma.aIModelConfig.findMany({
            where: { isEnabled: true },
            select: { id: true, modelName: true, usage: true }
        });

        let brokenCount = 0;
        let exhaustedCount = 0;

        for (const c of configs) {
            let parsed;
            try {
                parsed = JSON.parse(c.usage || '{}');
            } catch (e) {
                console.log(`❌ BROKEN JSON for ${c.modelName} (ID: ${c.id})`);
                brokenCount++;
                continue;
            }

            if (parsed.exhaustedAt) {
                console.log(`⚠️ EXHAUSTED: ${c.modelName} at ${parsed.exhaustedAt}`);
                exhaustedCount++;
            }
        }

        console.log(`\nSummary:`);
        console.log(`- Total Enabled Models: ${configs.length}`);
        console.log(`- Broken JSON: ${brokenCount}`);
        console.log(`- Exhausted Models: ${exhaustedCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkBrokenUsage();
