const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');

// Products Controller
const {
  fetchProductsFromWooCommerce,
  importSelectedProducts,
  fetchProductById,
  syncProductStock
} = require('../controller/wooCommerceController');

// Import & Fetch
const {
  fetchOrdersFromWooCommerce,
  importOrdersFromWooCommerce,
  getOrdersCount
} = require('../controller/wooCommerceImportController');

// Export
const {
  getLocalOrdersForExport,
  exportOrdersToWooCommerce
} = require('../controller/wooCommerceExportController');

// Settings & Statuses
const {
  getWooCommerceStatuses,
  saveWooCommerceSettings,
  getWooCommerceSettings,
  getSyncLogs,
  triggerAutoSync
} = require('../controller/wooCommerceSettingsController');

// Webhook Controller
const {
  handleWooCommerceWebhook,
  setupWooCommerceWebhooks,
  testWebhook
} = require('../controller/wooCommerceWebhookController');

// ═══════════════════════════════════════════════════════════════
// 📦 Products Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/woocommerce/fetch-products
 * @desc    جلب المنتجات من WooCommerce
 * @access  Private
 */
router.post('/fetch-products', verifyToken.authenticateToken, fetchProductsFromWooCommerce);

/**
 * @route   POST /api/v1/woocommerce/import-selected
 * @desc    استيراد المنتجات المحددة من WooCommerce
 * @access  Private
 */
router.post('/import-selected', verifyToken.authenticateToken, importSelectedProducts);

/**
 * @route   GET /api/v1/woocommerce/product/:productId
 * @desc    جلب منتج واحد من WooCommerce بـ ID
 * @access  Private
 */
router.get('/product/:productId', verifyToken.authenticateToken, fetchProductById);

/**
 * @route   POST /api/v1/woocommerce/sync-stock
 * @desc    مزامنة المخزون بين النظام والووكومرس
 * @access  Private
 */
router.post('/sync-stock', verifyToken.authenticateToken, syncProductStock);

// ═══════════════════════════════════════════════════════════════
// 📋 Orders Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/woocommerce/orders/fetch
 * @desc    جلب الطلبات من WooCommerce (معاينة)
 * @access  Private
 */
router.post('/orders/fetch', verifyToken.authenticateToken, fetchOrdersFromWooCommerce);

/**
 * @route   POST /api/v1/woocommerce/orders/count
 * @desc    جلب عدد الطلبات الكلي من WooCommerce
 * @access  Private
 */
router.post('/orders/count', verifyToken.authenticateToken, getOrdersCount);

/**
 * @route   GET /api/v1/woocommerce/orders/statuses
 * @desc    جلب حالات الطلبات من WooCommerce
 * @access  Private
 */
router.get('/orders/statuses', verifyToken.authenticateToken, getWooCommerceStatuses);

/**
 * @route   POST /api/v1/woocommerce/orders/import
 * @desc    استيراد الطلبات المحددة من WooCommerce
 * @access  Private
 */
router.post('/orders/import', verifyToken.authenticateToken, importOrdersFromWooCommerce);

/**
 * @route   GET /api/v1/woocommerce/orders/local
 * @desc    جلب الطلبات المحلية للتصدير
 * @access  Private
 */
router.get('/orders/local', verifyToken.authenticateToken, getLocalOrdersForExport);

/**
 * @route   POST /api/v1/woocommerce/orders/export
 * @desc    تصدير الطلبات إلى WooCommerce
 * @access  Private
 */
router.post('/orders/export', verifyToken.authenticateToken, exportOrdersToWooCommerce);

// ═══════════════════════════════════════════════════════════════
// ⚙️ Settings Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/woocommerce/settings
 * @desc    جلب إعدادات WooCommerce
 * @access  Private
 */
router.get('/settings', verifyToken.authenticateToken, getWooCommerceSettings);

/**
 * @route   POST /api/v1/woocommerce/settings
 * @desc    حفظ إعدادات WooCommerce
 * @access  Private
 */
router.post('/settings', verifyToken.authenticateToken, saveWooCommerceSettings);

/**
 * @route   GET /api/v1/woocommerce/sync-logs
 * @desc    جلب سجل المزامنة
 * @access  Private
 */
router.get('/sync-logs', verifyToken.authenticateToken, getSyncLogs);

// ═══════════════════════════════════════════════════════════════
// 🔔 Webhook Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/woocommerce/webhook/:companyId
 * @desc    استقبال Webhook من WooCommerce
 * @access  Public (verified by signature)
 */
router.post('/webhook/:companyId', handleWooCommerceWebhook);

/**
 * @route   POST /api/v1/woocommerce/webhooks/setup
 * @desc    إنشاء Webhooks في WooCommerce
 * @access  Private
 */
router.post('/webhooks/setup', verifyToken.authenticateToken, setupWooCommerceWebhooks);

/**
 * @route   POST /api/v1/woocommerce/webhooks/test
 * @desc    اختبار Webhook
 * @access  Private
 */
router.post('/webhooks/test', verifyToken.authenticateToken, testWebhook);

// ═══════════════════════════════════════════════════════════════
// 🔄 Auto Sync Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/woocommerce/auto-sync
 * @desc    تشغيل المزامنة التلقائية يدوياً
 * @access  Private
 */
router.post('/auto-sync', verifyToken.authenticateToken, triggerAutoSync);

// ═══════════════════════════════════════════════════════════════
// 🔄 Polling Scheduler Routes (Works on localhost)
// ═══════════════════════════════════════════════════════════════

const { getWooCommerceAutoSyncScheduler } = require('../services/wooCommerceAutoSyncScheduler');

/**
 * @route   GET /api/v1/woocommerce/scheduler/status
 * @desc    الحصول على حالة المزامنة التلقائية
 * @access  Private
 */
router.get('/scheduler/status', verifyToken.authenticateToken, (req, res) => {
  try {
    const scheduler = getWooCommerceAutoSyncScheduler();
    res.json({
      success: true,
      data: scheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/v1/woocommerce/scheduler/sync-now
 * @desc    تشغيل المزامنة الآن (للشركة الحالية)
 * @access  Private
 */
router.post('/scheduler/sync-now', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const scheduler = getWooCommerceAutoSyncScheduler();
    const result = await scheduler.syncCompany(companyId);

    res.json({
      success: result.success,
      message: result.success ? 'تمت المزامنة بنجاح' : 'فشلت المزامنة',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/v1/woocommerce/scheduler/set-interval
 * @desc    تغيير فترة المزامنة التلقائية
 * @access  Private
 */
router.post('/scheduler/set-interval', verifyToken.authenticateToken, (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes < 1) {
      return res.status(400).json({ success: false, message: 'يجب أن تكون الفترة دقيقة واحدة على الأقل' });
    }

    const scheduler = getWooCommerceAutoSyncScheduler();
    scheduler.setInterval(minutes);

    res.json({
      success: true,
      message: `تم تغيير فترة المزامنة إلى ${minutes} دقيقة`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
