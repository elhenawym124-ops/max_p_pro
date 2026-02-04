const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { processImage } = require('../utils/imageProcessor');

const prisma = new PrismaClient();

const UPLOADS_ROOT = path.join(__dirname, '../uploads');

async function main() {
    console.log('🚀 Starting image compression migration...');

    await compressImageGallery();
    await compressSupportAttachments();
    await compressDevTaskAttachments();
    await compressProducts();
    await compressMessages();

    console.log('✅ Migration completed!');
    await prisma.$disconnect();
}

async function compressFile(relativePath, outputDir) {
    const fullPath = path.join(__dirname, '..', relativePath);

    if (!fs.existsSync(fullPath)) {
        // console.warn(`⚠️ File not found: ${fullPath}`);
        return null;
    }

    // Skip if already WebP
    if (path.extname(fullPath).toLowerCase() === '.webp') {
        return null;
    }

    try {
        // Process image, keep original for now until DB success
        const result = await processImage(fullPath, outputDir, { keepOriginal: true });
        return result;
    } catch (error) {
        console.error(`❌ Failed to process ${relativePath}:`, error.message);
        return null;
    }
}

async function compressImageGallery() {
    console.log('\n📸 Processing Image Gallery...');
    const images = await prisma.imageGallery.findMany({
        where: {
            NOT: { fileType: 'image/webp' }
        }
    });

    console.log(`Found ${images.length} images to process.`);
    let count = 0;

    for (const img of images) {
        if (!img.fileUrl) continue;

        // Extract relative path from URL (assuming /uploads/...)
        const urlParts = img.fileUrl.split('/uploads/');
        if (urlParts.length < 2) continue;

        const relativePath = '/uploads/' + urlParts[1];
        const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

        const processed = await compressFile(relativePath, outputDir);
        if (processed) {
            const newUrl = img.fileUrl.replace(path.extname(img.fileUrl), '.webp');

            await prisma.imageGallery.update({
                where: { id: img.id },
                data: {
                    fileUrl: newUrl,
                    filename: processed.filename,
                    fileType: 'image/webp',
                    fileSize: processed.size
                }
            });

            // Delete old file
            try {
                const oldPath = path.join(__dirname, '..', relativePath);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) { }

            count++;
            process.stdout.write(`\rProgress: ${count}/${images.length}`);
        }
    }
}

async function compressSupportAttachments() {
    console.log('\n🎫 Processing Support Attachments...');
    const attachments = await prisma.supportAttachment.findMany({
        where: {
            NOT: { mimeType: 'image/webp' }
        }
    });

    console.log(`Found ${attachments.length} attachments.`);
    let count = 0;

    for (const att of attachments) {
        if (!att.url) continue;
        const urlParts = att.url.split('/uploads/');
        if (urlParts.length < 2) continue;

        const relativePath = '/uploads/' + urlParts[1];
        const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

        const processed = await compressFile(relativePath, outputDir);
        if (processed) {
            const newUrl = att.url.replace(path.extname(att.url), '.webp');

            await prisma.supportAttachment.update({
                where: { id: att.id },
                data: {
                    url: newUrl,
                    filename: processed.filename,
                    mimeType: 'image/webp',
                    size: processed.size
                }
            });

            try {
                const oldPath = path.join(__dirname, '..', relativePath);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) { }

            count++;
            process.stdout.write(`\rProgress: ${count}/${attachments.length}`);
        }
    }
}

async function compressDevTaskAttachments() {
    console.log('\n🛠️ Processing Dev Task Attachments...');
    const attachments = await prisma.devTaskAttachment.findMany({
        where: {
            NOT: { fileType: 'image/webp' }
        }
    });

    console.log(`Found ${attachments.length} attachments.`);
    let count = 0;

    for (const att of attachments) {
        // If filePath is absolute, use it. If relative/URL-like, adjust.
        let fullPath = att.filePath;
        if (!path.isAbsolute(fullPath)) {
            // Fallback logic if needed, but devTasks usually store absolute path
            fullPath = path.join(UPLOADS_ROOT, 'dev-tasks', att.fileName);
        }

        const outputDir = path.dirname(fullPath);

        if (path.extname(fullPath) === '.webp' || !fs.existsSync(fullPath)) continue;

        try {
            const processed = await processImage(fullPath, outputDir, { keepOriginal: true });

            await prisma.devTaskAttachment.update({
                where: { id: att.id },
                data: {
                    fileName: processed.filename,
                    fileType: 'image/webp',
                    fileSize: processed.size,
                    filePath: processed.path
                }
            });

            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            count++;
            process.stdout.write(`\rProgress: ${count}/${attachments.length}`);
        } catch (e) {
            // console.error(e);
        }
    }
}

async function compressProducts() {
    console.log('\n📦 Processing Products...');
    const products = await prisma.product.findMany(); // Fetch all, filtering in memory for JSON

    let count = 0;
    for (const product of products) {
        if (!product.images) continue;

        let images;
        try {
            images = JSON.parse(product.images);
        } catch (e) { continue; }

        if (!Array.isArray(images)) continue;

        let changed = false;
        const newImages = [];

        for (const imgUrl of images) {
            if (typeof imgUrl !== 'string' || !imgUrl.includes('/uploads/')) {
                newImages.push(imgUrl);
                continue;
            }

            if (imgUrl.endsWith('.webp')) {
                newImages.push(imgUrl);
                continue;
            }

            const urlParts = imgUrl.split('/uploads/');
            const relativePath = '/uploads/' + urlParts[1];
            const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

            const processed = await compressFile(relativePath, outputDir);
            if (processed) {
                const newUrl = imgUrl.replace(path.extname(imgUrl), '.webp');
                newImages.push(newUrl);
                changed = true;

                try {
                    const oldPath = path.join(__dirname, '..', relativePath);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                } catch (e) { }
            } else {
                newImages.push(imgUrl);
            }
        }

        if (changed) {
            await prisma.product.update({
                where: { id: product.id },
                data: { images: JSON.stringify(newImages) }
            });
            count++;
            process.stdout.write(`\rUpdated ${count} products`);
        }
    }
}

async function compressMessages() {
    console.log('\n💬 Processing Messages...');
    // Only process 'FILE' or 'IMAGE' types or those with attachments
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { type: 'IMAGE' },
                { type: 'FILE' }
            ]
        }
    });

    console.log(`Found ${messages.length} potential messages.`);
    let count = 0;

    for (const msg of messages) {
        if (!msg.attachments) continue;

        let attachments;
        try { attachments = JSON.parse(msg.attachments); } catch (e) { continue; }

        if (!Array.isArray(attachments)) continue;

        let changed = false;
        const newAttachments = [];

        for (const att of attachments) {
            // Check if attachment is a generic file/image and local
            if (!att.url || !att.url.includes('/uploads/')) {
                newAttachments.push(att);
                continue;
            }

            if (att.mimeType === 'image/webp' || att.url.endsWith('.webp')) {
                newAttachments.push(att);
                continue;
            }

            // Verify it's an image
            const isImage = att.mimeType?.startsWith('image/') || ['.jpg', '.jpeg', '.png'].includes(path.extname(att.url));
            if (!isImage) {
                newAttachments.push(att);
                continue;
            }

            const urlParts = att.url.split('/uploads/');
            const relativePath = '/uploads/' + urlParts[1];
            const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

            const processed = await compressFile(relativePath, outputDir);
            if (processed) {
                newAttachments.push({
                    ...att,
                    url: att.url.replace(path.extname(att.url), '.webp'),
                    name: processed.filename,
                    size: processed.size,
                    mimeType: 'image/webp',
                    type: 'image'
                });
                changed = true;
                try {
                    const oldPath = path.join(__dirname, '..', relativePath);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                } catch (e) { }
            } else {
                newAttachments.push(att);
            }
        }

        if (changed) {
            await prisma.message.update({
                where: { id: msg.id },
                data: {
                    attachments: JSON.stringify(newAttachments)
                    // Note: Updating metadata is harder as it varies structurally. 
                    // For now, we update the primary source of truth (attachments).
                }
            });
            count++;
            process.stdout.write(`\rUpdated ${count} messages`);
        }
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
