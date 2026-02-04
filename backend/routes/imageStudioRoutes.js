const express = require('express');
const router = express.Router();
const imageStudioController = require('../controller/imageStudioController');
const { requireAuth } = require('../middleware/auth');

/**
 * Image Studio Routes
 * مسارات استديو توليد الصور
 */

// جميع المسارات تحتاج مصادقة
router.use(requireAuth);

// ===== مسارات السوبر أدمن =====

// الحصول على إعدادات الاستديو
router.get('/admin/settings', imageStudioController.getSettings);

// تحديث إعدادات الاستديو
router.put('/admin/settings', imageStudioController.updateSettings);

// الحصول على إحصائيات عامة
router.get('/admin/stats', imageStudioController.getGlobalStats);

// الحصول على المفاتيح النشطة (السوبر أدمن فقط)
router.get('/admin/keys', imageStudioController.getActiveKeys);

// الحصول على سجلات التوليد (السوبر أدمن فقط)
router.get('/admin/logs', imageStudioController.getGenerationLogs);

// ===== مسارات الشركات =====

// التحقق من صلاحية الوصول
router.get('/access', imageStudioController.checkAccess);

// الحصول على النماذج المتاحة
router.get('/models', imageStudioController.getAvailableModels);

// توليد صورة جديدة
router.post('/generate', imageStudioController.generateImage);

// تعديل صورة (Edit/Try-On)
router.post('/edit', imageStudioController.editImage);

// الحصول على سجل التوليد
router.get('/history', imageStudioController.getHistory);

// الحصول على الإحصائيات
router.get('/stats', imageStudioController.getStats);

// التحقق من حالة التوليد
router.get('/status/:id', imageStudioController.checkJobStatus);

// توليد محتوى إعلاني (AI Ad Writer)
router.post('/generate-ad', imageStudioController.generateAd);

// حفظ الصورة في المعرض
router.post('/save-to-gallery', imageStudioController.saveToGallery);

// تبديل منتج في مشهد (Virtual Try-On)
router.post('/swap-product', imageStudioController.swapProduct);

module.exports = router;
