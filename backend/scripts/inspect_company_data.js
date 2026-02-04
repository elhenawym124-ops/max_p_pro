const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectCompanyRAG() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`🔍 Inspecting RAG and Product data for company: ${companyId}`);

    // 1. Check AI Model Settings
    const modelConfigs = await prisma.aIModelConfig.findMany({
        where: {
            isEnabled: true,
            key: {
                OR: [
                    { companyId: companyId },
                    { keyType: 'CENTRAL' }
                ]
            }
        },
        include: { key: true }
    });

    console.log(`\n🤖 Active Models for this company (${modelConfigs.length}):`);
    modelConfigs.slice(0, 5).forEach(m => {
        console.log(`- ${m.modelName} | Key: ${m.key.name} (${m.key.keyType})`);
    });

    // 2. Check AI Settings (New Schema: AiSettings)
    const aiSettings = await prisma.aiSettings.findUnique({
        where: { companyId: companyId }
    });
    console.log(`\n⚙️ AI Settings:`, aiSettings);

    // 3. (Skipped) Company Config check removed as model might differ

    // 4. List ALL products for this specific ID with creation date and company name
    const products = await prisma.product.findMany({
        where: { companyId: companyId },
        select: {
            id: true,
            name: true,
            price: true,
            createdAt: true,
            updatedAt: true,
            company: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📦 All Database Products for this Company (${products.length}):`);
    products.forEach(p => {
        console.log(`- [${p.id}] ${p.name} | Price: ${p.price} | Created: ${p.createdAt.toISOString()} | Company: ${p.company.name}`);
    });

    await prisma.$disconnect();
}

inspectCompanyRAG().catch(console.error);
