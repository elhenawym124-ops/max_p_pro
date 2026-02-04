const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
    try {
        const models = await prisma.aIModelConfig.findMany({
            include: {
                key: true
            },
            orderBy: {
                priority: 'asc'
            }
        });

        console.log('--- Provider Statistics ---');
        const stats = {};
        models.forEach(m => {
            const p = m.key.provider;
            if (!stats[p]) stats[p] = { total: 0, active_key: 0, enabled_model: 0, min_priority: 999 };
            stats[p].total++;
            if (m.key.isActive) stats[p].active_key++;
            if (m.isEnabled) stats[p].enabled_model++;
            if (m.priority < stats[p].min_priority) stats[p].min_priority = m.priority;
        });
        console.table(stats);

        console.log('--- Non-Google Models ---');
        models.filter(m => m.key.provider !== 'GOOGLE').forEach(m => {
            console.log(`[Priority ${m.priority}] ${m.modelName} | Provider: ${m.key.provider} | Key: ${m.key.name} | Active: ${m.key.isActive} | Enabled: ${m.isEnabled}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkModels();
