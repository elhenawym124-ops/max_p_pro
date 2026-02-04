/**
 * Turbo Shipping Routes
 * مسارات Turbo للشحن
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const turboController = require('../controller/turboController');

// إعداد multer للتعامل مع رفع الملفات (في الذاكرة)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // السماح بصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Public Routes (No Authentication Required)
 * المسارات العامة (لا تتطلب مصادقة)
 */

/**
 * GET /api/turbo/orders/:orderId/waybill
 * طباعة بوليصة الشحنة - عام بدون مصادقة
 */
router.get('/orders/:orderId/waybill', turboController.printWaybill);

// جميع المسارات التالية تتطلب المصادقة


/**
 * POST /api/turbo/orders/:orderId/shipment
 * إنشاء شحنة جديدة للطلب
 */
router.post('/orders/:orderId/shipment', requireAuth, turboController.createShipment);

/**
 * POST /api/turbo/bulk/create-shipments
 * إنشاء شحنات لعدة طلبات دفعة واحدة
 */
router.post('/bulk/create-shipments',requireAuth, turboController.bulkCreateShipments);

/**
 * GET /api/turbo/orders/:orderId/track
 * تتبع الشحنة
 */
router.get('/orders/:orderId/track', requireAuth,turboController.trackShipment);

/**
 * POST /api/turbo/calculate
 * حساب تكلفة الشحن
 */
router.post('/calculate',requireAuth, turboController.calculateShippingCost);

/**
 * GET /api/turbo/orders/:orderId/shipping-comparison
 * جلب مقارنة أسعار الشحن
 */
router.get('/orders/:orderId/shipping-comparison', requireAuth,turboController.getShippingComparison);

/**
 * POST /api/turbo/orders/:orderId/cancel
 * إلغاء الشحنة
 */
router.post('/orders/:orderId/cancel', requireAuth, turboController.cancelShipment);

/**
 * GET /api/turbo/orders/:orderId/label
 * طباعة ملصق الشحنة
 */
router.get('/orders/:orderId/label', turboController.printLabel);

/**
 * GET /api/turbo/governments
 * جلب قائمة المحافظات من Turbo API
 */
router.get('/governments', turboController.getGovernments);

/**
 * GET /api/turbo/areas/:governmentId
 * جلب قائمة المناطق بناءً على المحافظة
 */
router.get('/areas/:governmentId',requireAuth, turboController.getAreas);

/**
 * POST /api/turbo/parse-address
 * تحليل العنوان باستخدام AI
 */
router.post('/parse-address', turboController.parseAddress);

/**
 * GET /api/turbo/ai/models
 * جلب قائمة النماذج المتاحة من Gemini
 */
router.get('/ai/models',requireAuth, turboController.getAIModels);

/**
 * GET /api/turbo/reports/shipping
 * جلب تقرير الشحن
 */
const turboReportController = require('../controller/turboReportController');
router.get('/reports/shipping',requireAuth, turboReportController.getShippingReport);

/**
 * GET /api/turbo/branches
 * جلب فروع Turbo
 */
router.get('/branches',requireAuth, turboController.getBranches);

/**
 * PUT /api/turbo/orders/:orderId/shipment
 * تحديث بيانات الشحنة
 */
router.put('/orders/:orderId/shipment',requireAuth, turboController.updateShipment);

/**
 * POST /api/turbo/tickets
 * إضافة تذكرة دعم إلى Turbo
 */
router.post('/tickets',requireAuth, turboController.addTicket);

/**
 * GET /api/turbo/inquiries-types
 * جلب أنواع الاستفسارات من Turbo
 * يدعم POST و GET
 */
router.get('/inquiries-types',requireAuth, turboController.getInquiriesTypes);
router.post('/inquiries-types',requireAuth, turboController.getInquiriesTypes);

/**
 * GET /api/turbo/tickets/unread-count
 * جلب عدد التذاكر غير المقروءة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/unread-count', requireAuth, turboController.getUnreadTicketsCount);

/**
 * GET /api/turbo/tickets/:id/log
 * جلب سجل التذكرة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/:id/log',requireAuth, turboController.getTicketLog);

/**
 * POST /api/turbo/tickets/:id/reply
 * الرد على تذكرة في Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.post('/tickets/:id/reply',requireAuth, upload.single('image'), turboController.replyToTicket);

/**
 * GET /api/turbo/tickets/:id
 * جلب تفاصيل تذكرة معينة من Turbo
 */
router.get('/tickets/:id', requireAuth,turboController.getTicket);

/**
 * GET /api/turbo/tickets
 * جلب قائمة التذاكر من Turbo
 */
router.get('/tickets', requireAuth,turboController.getTickets);

module.exports = router;

