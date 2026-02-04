const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('./sharedDatabase');
const { processImage } = require('../utils/imageProcessor');

const getPrisma = () => getSharedPrismaClient();
const UPLOADS_ROOT = path.join(__dirname, '../uploads');

class ImageCompressionService {
    constructor() {
        this.isRunning = false;
        this.progress = {
            total: 0,
            processed: 0,
            stage: 'idle'
        };
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            progress: this.progress
        };
    }

    async runCompression() {
        if (this.isRunning) {
            throw new Error('Compression is already running');
        }

        this.isRunning = true;
        this.progress = { total: 0, processed: 0, stage: 'starting' };

        try {
            console.log('🚀 Starting image compression service...');

            this.progress.stage = 'image_gallery';
            await this.compressImageGallery();

            this.progress.stage = 'support_attachments';
            await this.compressSupportAttachments();

            this.progress.stage = 'dev_tasks';
            await this.compressDevTaskAttachments();

            this.progress.stage = 'products';
            await this.compressProducts();

            this.progress.stage = 'messages';
            await this.compressMessages();

            console.log('✅ Compression service completed!');
            this.progress.stage = 'completed';
        } catch (error) {
            console.error('❌ Compression service failed:', error);
            this.progress.stage = 'error';
            this.progress.error = error.message;
        } finally {
            this.isRunning = false;
        }
    }

    async compressFile(relativePath, outputDir) {
        const fullPath = path.join(__dirname, '..', relativePath);

        if (!fs.existsSync(fullPath)) {
            return null;
        }

        if (path.extname(fullPath).toLowerCase() === '.webp') {
            return null;
        }

        try {
            const result = await processImage(fullPath, outputDir, { keepOriginal: true });
            return result;
        } catch (error) {
            console.error(`❌ Failed to process ${relativePath}:`, error.message);
            return null;
        }
    }

    async compressImageGallery() {
        const images = await getPrisma().imageGallery.findMany({
            where: { NOT: { fileType: 'image/webp' } }
        });

        console.log(`[Gallery] Found ${images.length} images.`);
        let count = 0;
        this.progress.totalGallery = images.length;

        for (const img of images) {
            if (!img.fileUrl) continue;

            const urlParts = img.fileUrl.split('/uploads/');
            if (urlParts.length < 2) continue;

            const relativePath = '/uploads/' + urlParts[1];
            const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

            const processed = await this.compressFile(relativePath, outputDir);
            if (processed) {
                const newUrl = img.fileUrl.replace(path.extname(img.fileUrl), '.webp');

                await getPrisma().imageGallery.update({
                    where: { id: img.id },
                    data: {
                        fileUrl: newUrl,
                        filename: processed.filename,
                        fileType: 'image/webp',
                        fileSize: processed.size
                    }
                });

                try {
                    const oldPath = path.join(__dirname, '..', relativePath);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                } catch (e) { }

                count++;
                this.progress.processed++;
            }
        }
    }

    async compressSupportAttachments() {
        const attachments = await getPrisma().supportAttachment.findMany({
            where: { NOT: { mimeType: 'image/webp' } }
        });
        this.progress.totalSupport = attachments.length;

        for (const att of attachments) {
            if (!att.url) continue;
            const urlParts = att.url.split('/uploads/');
            if (urlParts.length < 2) continue;

            const relativePath = '/uploads/' + urlParts[1];
            const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

            const processed = await this.compressFile(relativePath, outputDir);
            if (processed) {
                const newUrl = att.url.replace(path.extname(att.url), '.webp');

                await getPrisma().supportAttachment.update({
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
                this.progress.processed++;
            }
        }
    }

    async compressDevTaskAttachments() {
        const attachments = await getPrisma().devTaskAttachment.findMany({
            where: { NOT: { fileType: 'image/webp' } }
        });
        this.progress.totalDevTasks = attachments.length;

        for (const att of attachments) {
            let fullPath = att.filePath;
            if (!path.isAbsolute(fullPath)) {
                fullPath = path.join(UPLOADS_ROOT, 'dev-tasks', att.fileName);
            }

            const outputDir = path.dirname(fullPath);

            if (path.extname(fullPath) === '.webp' || !fs.existsSync(fullPath)) continue;

            try {
                const processed = await processImage(fullPath, outputDir, { keepOriginal: true });

                await getPrisma().devTaskAttachment.update({
                    where: { id: att.id },
                    data: {
                        fileName: processed.filename,
                        fileType: 'image/webp',
                        fileSize: processed.size,
                        filePath: processed.path
                    }
                });

                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                this.progress.processed++;
            } catch (e) { }
        }
    }

    async compressProducts() {
        const products = await getPrisma().product.findMany();
        this.progress.totalProducts = products.length; // Approximate

        for (const product of products) {
            if (!product.images) continue;

            let images;
            try { images = JSON.parse(product.images); } catch (e) { continue; }
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

                const processed = await this.compressFile(relativePath, outputDir);
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
                await getPrisma().product.update({
                    where: { id: product.id },
                    data: { images: JSON.stringify(newImages) }
                });
                this.progress.processed++;
            }
        }
    }

    async compressMessages() {
        const messages = await getPrisma().message.findMany({
            where: { OR: [{ type: 'IMAGE' }, { type: 'FILE' }] }
        });

        for (const msg of messages) {
            if (!msg.attachments) continue;
            let attachments;
            try { attachments = JSON.parse(msg.attachments); } catch (e) { continue; }
            if (!Array.isArray(attachments)) continue;

            let changed = false;
            const newAttachments = [];

            for (const att of attachments) {
                if (!att.url || !att.url.includes('/uploads/')) {
                    newAttachments.push(att);
                    continue;
                }
                if (att.mimeType === 'image/webp' || att.url.endsWith('.webp')) {
                    newAttachments.push(att);
                    continue;
                }
                const isImage = att.mimeType?.startsWith('image/') || ['.jpg', '.jpeg', '.png'].includes(path.extname(att.url));
                if (!isImage) {
                    newAttachments.push(att);
                    continue;
                }

                const urlParts = att.url.split('/uploads/');
                const relativePath = '/uploads/' + urlParts[1];
                const outputDir = path.dirname(path.join(__dirname, '..', relativePath));

                const processed = await this.compressFile(relativePath, outputDir);
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
                await getPrisma().message.update({
                    where: { id: msg.id },
                    data: { attachments: JSON.stringify(newAttachments) }
                });
                this.progress.processed++;
            }
        }
    }
}

// Singleton instance
const service = new ImageCompressionService();
module.exports = service;
