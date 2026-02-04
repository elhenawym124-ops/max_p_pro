const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentInteractions() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`📊 Checking recent AI interactions for company: ${companyId}`);

    const interactions = await prisma.aiInteraction.findMany({
        where: { companyId: companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            createdAt: true,
            userMessage: true,
            aiResponse: true,
            modelUsed: true
        }
    });

    if (interactions.length === 0) {
        console.log('❌ No recent interactions found for this company ID.');
    } else {
        console.log(`✅ Found ${interactions.length} recent interactions:`);
        interactions.forEach(i => {
            console.log(`\n--- [${i.createdAt.toISOString()}] ---`);
            console.log(`USER: ${i.userMessage}`);
            console.log(`AI: ${i.aiResponse}`);
        });
    }

    await prisma.$disconnect();
}

checkRecentInteractions().catch(console.error);
