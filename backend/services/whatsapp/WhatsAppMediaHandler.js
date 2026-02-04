/**
 * 🖼️ WhatsApp Media Handler Service
 * معالجة الوسائط (صور، فيديو، صوت، ملفات)
 * 
 * المميزات:
 * - تحميل الوسائط من WhatsApp
 * - رفع الوسائط للإرسال
 * - ضغط الصور والفيديو
 * - التحقق من حجم الملفات
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');
// Optional sharp for image processing
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('⚠️ Sharp not available - image compression disabled');
    sharp = null;
}
const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const WhatsAppManager = require('./WhatsAppManager');

// مسار حفظ الوسائط
const MEDIA_DIR = path.join(__dirname, '../../public/uploads/whatsapp');

// حدود حجم الملفات (بالبايت)
const SIZE_LIMITS = {
    image: 16 * 1024 * 1024,      // 16MB
    video: 64 * 1024 * 1024,      // 64MB
    audio: 16 * 1024 * 1024,      // 16MB
    document: 100 * 1024 * 1024   // 100MB
};

// أنواع الملفات المدعومة
const SUPPORTED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
    audio: ['audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/amr'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ]
};

/**
 * تهيئة مجلد الوسائط
 */
async function initMediaDirectory() {
    try {
        await fs.mkdir(MEDIA_DIR, { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'images'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'videos'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'audio'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'documents'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'temp'), { recursive: true });
        console.log('📁 WhatsApp media directory initialized');
    } catch (error) {
        console.error('❌ Error creating media directory:', error);
    }
}

/**
 * تحميل وسائط من رسالة WhatsApp
 * @param {object} message - رسالة WhatsApp
 * @param {string} sessionId - معرف الجلسة
 */
async function downloadMedia(message, sessionId) {
    try {
        // Lazy load to avoid circular dependency
        const WhatsAppManager = require('./WhatsAppManager');
        const session = WhatsAppManager.getSession(sessionId);
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }

        // تحديد نوع الوسائط
        const mediaType = getMediaType(message);
        if (!mediaType) {
            throw new Error('نوع الوسائط غير مدعوم');
        }

        // تحميل الوسائط
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: session.sock.updateMediaMessage
            }
        );

        // إنشاء اسم الملف
        const extension = getExtension(mediaType.mimetype);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const subDir = getSubDirectory(mediaType.type);
        const filePath = path.join(MEDIA_DIR, subDir, fileName);

        // حفظ الملف
        await fs.writeFile(filePath, buffer);

        // الحصول على معلومات الملف
        const stats = await fs.stat(filePath);

        return {
            filePath,
            fileName,
            url: `/uploads/whatsapp/${subDir}/${fileName}`,
            size: stats.size,
            mimetype: mediaType.mimetype,
            type: mediaType.type
        };
    } catch (error) {
        console.error('❌ Error downloading media:', error);
        throw error;
    }
}

/**
 * رفع ملف للإرسال
 * @param {Buffer|string} source - مصدر الملف (buffer أو مسار)
 * @param {string} mimetype - نوع الملف
 * @param {string} originalName - الاسم الأصلي
 */
async function uploadMedia(source, mimetype, originalName = '') {
    try {
        let buffer;

        if (Buffer.isBuffer(source)) {
            buffer = source;
        } else if (typeof source === 'string') {
            // قراءة من مسار
            buffer = await fs.readFile(source);
        } else {
            throw new Error('مصدر الملف غير صالح');
        }

        // التحقق من النوع
        const mediaType = getMediaTypeFromMimetype(mimetype);
        if (!mediaType) {
            throw new Error('نوع الملف غير مدعوم');
        }

        // التحقق من الحجم
        const sizeLimit = SIZE_LIMITS[mediaType];
        if (buffer.length > sizeLimit) {
            // محاولة الضغط للصور
            if (mediaType === 'image') {
                buffer = await compressImage(buffer, sizeLimit);
            } else {
                throw new Error(`حجم الملف يتجاوز الحد المسموح (${formatSize(sizeLimit)})`);
            }
        }

        // إنشاء اسم الملف
        const extension = getExtension(mimetype);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const subDir = getSubDirectory(mediaType);
        const filePath = path.join(MEDIA_DIR, subDir, fileName);

        // حفظ الملف
        await fs.writeFile(filePath, buffer);

        return {
            buffer,
            filePath,
            fileName,
            url: `/uploads/whatsapp/${subDir}/${fileName}`,
            size: buffer.length,
            mimetype,
            type: mediaType
        };
    } catch (error) {
        console.error('❌ Error uploading media:', error);
        throw error;
    }
}

/**
 * ضغط صورة
 */
async function compressImage(buffer, maxSize) {
    if (!sharp) return buffer; // Skip compression if sharp is not available

    try {
        let quality = 80;
        let compressed = buffer;

        while (compressed.length > maxSize && quality > 10) {
            compressed = await sharp(buffer)
                .jpeg({ quality })
                .toBuffer();
            quality -= 10;
        }

        if (compressed.length > maxSize) {
            // تصغير الأبعاد
            const metadata = await sharp(buffer).metadata();
            const scale = Math.sqrt(maxSize / compressed.length);

            compressed = await sharp(buffer)
                .resize(Math.floor(metadata.width * scale), Math.floor(metadata.height * scale))
                .jpeg({ quality: 70 })
                .toBuffer();
        }

        return compressed;
    } catch (error) {
        console.error('❌ Error compressing image:', error);
        return buffer;
    }
}

/**
 * إنشاء صورة مصغرة
 */
async function createThumbnail(buffer, width = 200, height = 200) {
    try {
        return await sharp(buffer)
            .resize(width, height, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toBuffer();
    } catch (error) {
        console.error('❌ Error creating thumbnail:', error);
        return null;
    }
}

/**
 * الحصول على معلومات الصورة
 */
async function getImageInfo(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: buffer.length
        };
    } catch (error) {
        console.error('❌ Error getting image info:', error);
        return null;
    }
}

/**
 * حذف ملف وسائط
 */
async function deleteMedia(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error('❌ Error deleting media:', error);
        return false;
    }
}

/**
 * تنظيف الملفات المؤقتة القديمة
 */
async function cleanupTempFiles(maxAgeHours = 24) {
    try {
        const tempDir = path.join(MEDIA_DIR, 'temp');
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > maxAge) {
                await fs.unlink(filePath);
            }
        }

        console.log('🧹 Cleaned up temp files');
    } catch (error) {
        console.error('❌ Error cleaning up temp files:', error);
    }
}

/**
 * الحصول على نوع الوسائط من الرسالة
 */
function getMediaType(message) {
    const msg = message.message;
    if (!msg) return null;

    if (msg.imageMessage) {
        return { type: 'image', mimetype: msg.imageMessage.mimetype };
    }
    if (msg.videoMessage) {
        return { type: 'video', mimetype: msg.videoMessage.mimetype };
    }
    if (msg.audioMessage) {
        return { type: 'audio', mimetype: msg.audioMessage.mimetype };
    }
    if (msg.documentMessage) {
        return { type: 'document', mimetype: msg.documentMessage.mimetype };
    }
    if (msg.stickerMessage) {
        return { type: 'image', mimetype: msg.stickerMessage.mimetype };
    }

    return null;
}

/**
 * الحصول على نوع الوسائط من mimetype
 */
function getMediaTypeFromMimetype(mimetype) {
    for (const [type, mimes] of Object.entries(SUPPORTED_TYPES)) {
        if (mimes.includes(mimetype)) {
            return type;
        }
    }
    // تخمين من البداية
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
}

/**
 * الحصول على امتداد الملف
 */
function getExtension(mimetype) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/3gpp': '3gp',
        'video/quicktime': 'mov',
        'audio/ogg': 'ogg',
        'audio/mp4': 'm4a',
        'audio/mpeg': 'mp3',
        'audio/amr': 'amr',
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/plain': 'txt'
    };

    return extensions[mimetype] || 'bin';
}

/**
 * الحصول على المجلد الفرعي
 */
function getSubDirectory(type) {
    const dirs = {
        image: 'images',
        video: 'videos',
        audio: 'audio',
        document: 'documents'
    };
    return dirs[type] || 'documents';
}

/**
 * تنسيق حجم الملف
 */
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * التحقق من صلاحية الملف
 */
function validateFile(buffer, mimetype, type) {
    // التحقق من الحجم
    const sizeLimit = SIZE_LIMITS[type];
    if (buffer.length > sizeLimit) {
        return {
            valid: false,
            error: `حجم الملف (${formatSize(buffer.length)}) يتجاوز الحد المسموح (${formatSize(sizeLimit)})`
        };
    }

    // التحقق من النوع
    const supportedTypes = SUPPORTED_TYPES[type];
    if (supportedTypes && !supportedTypes.includes(mimetype)) {
        return {
            valid: false,
            error: `نوع الملف (${mimetype}) غير مدعوم`
        };
    }

    return { valid: true };
}

module.exports = {
    initMediaDirectory,
    downloadMedia,
    uploadMedia,
    compressImage,
    createThumbnail,
    getImageInfo,
    deleteMedia,
    cleanupTempFiles,
    getMediaType,
    getMediaTypeFromMimetype,
    validateFile,
    formatSize,
    SIZE_LIMITS,
    SUPPORTED_TYPES,
    MEDIA_DIR
};

