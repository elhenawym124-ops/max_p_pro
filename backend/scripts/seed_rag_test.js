const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');
const EmbeddingHelper = require('../services/embeddingHelper');

async function seedTestData() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('No company found');
        return;
    }

    console.log(`Seed company: ${company.id}`);

    const products = [
        { name: 'ساعة آبل الذكية الإصدار 9', description: 'ساعة رياضية متطورة مع تتبع الصحة ونبض القلب', price: 15000, category: 'إلكترونيات' },
        { name: 'ساعة سامسونج جالاكسي واتش 6', description: 'ساعة اندرويد ذكية ممتازة للجري والسباحة', price: 12000, category: 'إلكترونيات' },
        { name: 'كوتشي نايك رياضي', description: 'حذاء مريح جدا للجري والمشي لمسافات طويلة', price: 3000, category: 'أحذية' },
        { name: 'تيشيرت قطن فاخر', description: 'تيشيرت مريح جدا للصيف والرياضة', price: 500, category: 'ملابس' }
    ];

    for (const p of products) {
        // Check if category exists
        let category = await prisma.category.findFirst({ where: { name: p.category, companyId: company.id } });
        if (!category) {
            category = await prisma.category.create({ data: { name: p.category, companyId: company.id } });
        }

        const created = await prisma.product.create({
            data: {
                name: p.name,
                description: p.description,
                price: p.price,
                stock: 10,
                companyId: company.id,
                categoryId: category.id,
                isActive: true
            }
        });

        console.log(`Created product: ${p.name}`);

        // Generate embedding
        console.log(`Generating embedding for ${p.name}...`);
        await EmbeddingHelper.generateAndSaveProductEmbedding(
            created.id,
            p.name,
            p.description,
            category.name,
            company.id
        );
    }

    process.exit(0);
}

seedTestData().catch(console.error);
