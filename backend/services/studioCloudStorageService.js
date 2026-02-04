const fs = require('fs').promises;
const path = require('path');

/**
 * Studio Cloud Storage Service
 * خدمة تجريد التخزين لتسهيل الانتقال للسحابة (S3/Cloudinary) لاحقاً
 */
class StudioCloudStorageService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads/studio_images');
        this.ensureUploadDir();
    }

    async ensureUploadDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (error) {
            console.error('❌ [STORAGE-SERVICE] Error creating directory:', error);
        }
    }

    /**
     * رفع الصورة واسترجاع الرابط
     * @param {Buffer} buffer - بيانات الصورة
     * @param {string} fileName - اسم الملف المقترح
     * @returns {Promise<string>} - رابط الصورة العام
     */
    async uploadImage(buffer, fileName) {
        try {
            // حالياً يتم الحفظ محلياً
            // يمكن إضافة منطق AWS S3 أو Cloudinary هنا في كود مستقل
            const filePath = path.join(this.uploadDir, fileName);
            await fs.writeFile(filePath, buffer);

            console.log(`✅ [STORAGE-SERVICE] Image stored locally: ${fileName}`);

            // نرجع المسار النسبي الذي يمكن للمتصفح الوصول إليه
            return `/uploads/studio_images/${fileName}`;
        } catch (error) {
            console.error('❌ [STORAGE-SERVICE] Upload failed:', error);
            throw new Error('فشل رفع الصورة للتخزين');
        }
    }

    /**
     * رفع صورة من Base64
     */
    async uploadFromBase64(base64Data, fileName, contentType = 'image/png') {
        try {
            // تنظيف بيانات base64 إذا كان فيها prefix
            const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Image, 'base64');
            return await this.uploadImage(buffer, fileName);
        } catch (error) {
            console.error('❌ [STORAGE-SERVICE] Base64 upload failed:', error);
            throw error;
        }
    }

    /**
     * حذف صورة
     */
    async deleteImage(fileName) {
        try {
            const filePath = path.join(this.uploadDir, fileName);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new StudioCloudStorageService();
