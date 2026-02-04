const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reEnableKeys() {
    await prisma.aIKey.updateMany({
        where: { name: { in: ['DeepSeek', 'Groq Default Key'] } },
        data: { isActive: true }
    });
    console.log('✅ Re-enabled DeepSeek and Groq keys');

    const count = await prisma.aIKey.count({ where: { isActive: true } });
    console.log('Active keys:', count);

    await prisma.$disconnect();
}

reEnableKeys();
