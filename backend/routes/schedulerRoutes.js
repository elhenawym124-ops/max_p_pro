/**
 * Scheduler Routes
 * مسارات إدارة الموقتات (Schedulers)
 */

const express = require('express');
const router = express.Router();
const schedulerController = require('../controller/schedulerController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

/**
 * GET /api/v1/admin/schedulers
 * الحصول على حالة جميع الموقتات
 */
router.get('/', authenticateToken, requireSuperAdmin, schedulerController.getAllSchedulersStatus);

/**
 * POST /api/v1/admin/schedulers/:schedulerId/start
 * تشغيل موقت معين
 */
router.post('/:schedulerId/start', authenticateToken, requireSuperAdmin, schedulerController.startScheduler);

/**
 * POST /api/v1/admin/schedulers/:schedulerId/stop
 * إيقاف موقت معين
 */
router.post('/:schedulerId/stop', authenticateToken, requireSuperAdmin, schedulerController.stopScheduler);

/**
 * PUT /api/v1/admin/schedulers/woocommerce/interval
 * تحديث فترة مزامنة WooCommerce
 */
router.put('/woocommerce/interval', authenticateToken, requireSuperAdmin, schedulerController.updateWooCommerceInterval);

/**
 * POST /api/v1/admin/schedulers/woocommerce/sync
 * تشغيل مزامنة يدوية لـ WooCommerce
 */
router.post('/woocommerce/sync', authenticateToken, requireSuperAdmin, schedulerController.triggerManualSync);

/**
 * POST /api/v1/admin/schedulers/turbo/update
 * تشغيل تحديث يدوي لـ Turbo Tracking
 */
router.post('/turbo/update', authenticateToken, requireSuperAdmin, schedulerController.triggerTurboUpdate);

module.exports = router;
