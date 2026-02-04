const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function analyze() {
    console.log('📊 Comprehensive Image Analysis...');

    // 1. Database Counts
    const chatCount = await prisma.message.count({ where: { type: 'IMAGE' } });
    const whatsappCount = await prisma.whatsAppMessage.count({ where: { messageType: 'IMAGE' } });
    const galleryCount = await prisma.imageGallery.count();

    // 2. Product Images (JSON parsing)
    const products = await prisma.product.findMany({ select: { images: true } });
    let productImagesCount = 0;
    products.forEach(p => {
        if (p.images) {
            try {
                const arr = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                if (Array.isArray(arr)) productImagesCount += arr.length;
            } catch (e) { }
        }
    });

    console.log('\n--- Database Totals ---');
    console.log(`Chat Messages (IMAGE): ${chatCount}`);
    console.log(`WhatsApp Messages (IMAGE): ${whatsappCount}`);
    console.log(`Gallery Images: ${galleryCount}`);
    console.log(`Product Images (in JSON): ${productImagesCount}`);
    console.log(`Total DB Records: ${chatCount + whatsappCount + galleryCount + productImagesCount}`);

    // 3. Size Estimates (similar to controller)
    const DEFAULT_SIZE = 500 * 1024;
    const PRODUCT_SIZE = 200 * 1024;

    const estimatedSize = (chatCount * DEFAULT_SIZE) + (whatsappCount * DEFAULT_SIZE) + (productImagesCount * PRODUCT_SIZE);
    console.log(`\nEstimated Size (using controller logic): ${(estimatedSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);

    // 4. Check for orphaned images or massive counts in Message
    // Let's see if there are messages with massive metadata or something
    const topCompanies = await prisma.company.findMany({ select: { id: true, name: true }, take: 5 });
    for (const c of topCompanies) {
        const count = await prisma.message.count({ where: { type: 'IMAGE', conversations: { companyId: c.id } } });
        console.log(`Company "${c.name}": ${count} chat images`);
    }

    process.exit(0);
}

analyze().catch(err => {
    console.error(err);
    process.exit(1);
});
