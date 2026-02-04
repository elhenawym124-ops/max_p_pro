const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Gemini 3 Model Links...');

    const modelsToCheck = ['gemini-3-pro', 'gemini-3-flash', 'gemini-3-deep-think', 'gemini-2.0-pro'];

    for (const model of modelsToCheck) {
        const count = await prisma.aIModelConfig.count({
            where: {
                modelName: model,
                isEnabled: true
            }
        });
        console.log(`Model: ${model} -> Found ${count} active links.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
