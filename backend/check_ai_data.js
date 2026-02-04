const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('--- Data in ai_model_configs ---');
        const data = await prisma.aiModelConfig.findMany({
            take: 10
        });
        console.log(JSON.stringify(data, null, 2));

        console.log('\n--- Data in ai_keys ---');
        const keys = await prisma.aiKey.findMany({
            take: 5,
            include: { ai_model_configs: true }
        });
        console.log(JSON.stringify(keys, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
