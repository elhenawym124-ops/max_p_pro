const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectUsage() {
    try {
        const configs = await prisma.aIModelConfig.findMany({
            take: 20,
            select: { id: true, modelName: true, usage: true }
        });

        console.log("Inspection Results:");
        configs.forEach(c => {
            console.log(`ID: ${c.id}, Model: ${c.modelName}`);
            console.log(`Usage Raw Value:`, c.usage);
            console.log(`Type:`, typeof c.usage);
            try {
                JSON.parse(c.usage);
                console.log("Parse: OK");
            } catch (e) {
                console.log("Parse: ERROR -", e.message);
            }
            console.log("-------------------");
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspectUsage();
