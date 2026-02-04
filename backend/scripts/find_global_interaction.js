const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findInteractionByContent() {
    console.log('🔍 Scanning ALL interactions for "UGG", "257", or "96/11"...');

    const interactions = await prisma.aiInteraction.findMany({
        where: {
            OR: [
                { aiResponse: { contains: 'UGG' } },
                { aiResponse: { contains: '257' } },
                { aiResponse: { contains: '96/11' } }
            ]
        },
        include: {
            company: {
                select: { id: true, name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    if (interactions.length === 0) {
        console.log('❌ No interactions found with that content across the entire database.');
    } else {
        console.log(`✅ Found ${interactions.length} matching interactions:`);
        interactions.forEach(i => {
            console.log(`\n--- [${i.createdAt.toISOString()}] ---`);
            console.log(`Company: ${i.company?.name || 'UNKNOWN'} (${i.companyId}) | Email: ${i.company?.email}`);
            console.log(`USER: ${i.userMessage?.substring(0, 100)}...`);
            console.log(`AI: ${i.aiResponse?.substring(0, 150)}...`);
        });
    }

    await prisma.$disconnect();
}

findInteractionByContent().catch(console.error);
