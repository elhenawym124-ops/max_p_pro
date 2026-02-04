const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function diagnose() {
    console.log('🛸 Fast Diagnostics Running...');

    try {
        // 1. Gallery
        const galleryCount = await prisma.imageGallery.count();
        console.log(`Gallery Images: ${galleryCount}`);

        // 2. Chat
        const chatCount = await prisma.message.count({ where: { type: 'IMAGE' } });
        console.log(`Chat Images: ${chatCount}`);

        // 3. WhatsApp
        const whatsappCount = await prisma.whatsAppMessage.count({ where: { messageType: 'IMAGE' } });
        console.log(`WhatsApp Images: ${whatsappCount}`);

        // 4. Products (Count rows first)
        const productCount = await prisma.product.count();
        console.log(`Total Products: ${productCount}`);

        // Check one sample product to see images structure
        const sample = await prisma.product.findFirst({ where: { NOT: { images: null } } });
        if (sample) {
            console.log(`Sample product images type: ${typeof sample.images}`);
            try {
                const arr = typeof sample.images === 'string' ? JSON.parse(sample.images) : sample.images;
                console.log(`Sample images count: ${Array.isArray(arr) ? arr.length : 'not an array'}`);
            } catch (e) {
                console.log(`JSON parse failed for sample`);
            }
        }

    } catch (err) {
        console.error('❌ Diagnostics failed:', err);
    }
    process.exit(0);
}

diagnose();
