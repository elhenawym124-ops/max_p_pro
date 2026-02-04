const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('--- Data in global_ai_configs ---');
        const data = await prisma.globalAiConfig.findMany();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
