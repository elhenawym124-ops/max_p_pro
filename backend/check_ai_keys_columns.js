const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function listColumns() {
    try {
        console.log('--- Listing Columns of ai_keys ---');
        const aiKeysColumns = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM ai_keys');
        console.table(aiKeysColumns);

        console.log('\n--- Listing Columns of ai_model_configs ---');
        const aiModelConfigsColumns = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM ai_model_configs');
        console.table(aiModelConfigsColumns);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listColumns();
