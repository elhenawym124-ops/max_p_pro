const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');

const {
  getAllStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  syncWooCommerceStatuses,
  updateStatusMapping,
  reorderStatuses,
  initializeStatuses,
  getStatusStats
} = require('../controller/orderStatusController');

// ═══════════════════════════════════════════════════════════════
// 📋 Status CRUD Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/order-status
 * @desc    جلب جميع الحالات
 * @access  Private
 */
router.get('/', verifyToken.authenticateToken, getAllStatuses);

/**
 * @route   GET /api/v1/order-status/stats
 * @desc    إحصائيات الحالات
 * @access  Private
 */
router.get('/stats', verifyToken.authenticateToken, getStatusStats);

/**
 * @route   GET /api/v1/order-status/:id
 * @desc    جلب حالة محددة
 * @access  Private
 */
router.get('/:id', verifyToken.authenticateToken, getStatusById);

/**
 * @route   POST /api/v1/order-status
 * @desc    إنشاء حالة جديدة
 * @access  Private
 */
router.post('/', verifyToken.authenticateToken, createStatus);

/**
 * @route   PUT /api/v1/order-status/reorder
 * @desc    إعادة ترتيب الحالات
 * @access  Private
 */
router.put('/reorder', verifyToken.authenticateToken, reorderStatuses);

/**
 * @route   PUT /api/v1/order-status/:id
 * @desc    تحديث حالة
 * @access  Private
 */
router.put('/:id', verifyToken.authenticateToken, updateStatus);

/**
 * @route   PUT /api/v1/order-status/:id/mapping
 * @desc    تحديث ربط الحالة
 * @access  Private
 */
router.put('/:id/mapping', verifyToken.authenticateToken, updateStatusMapping);

/**
 * @route   DELETE /api/v1/order-status/:id
 * @desc    حذف حالة
 * @access  Private
 */
router.delete('/:id', verifyToken.authenticateToken, deleteStatus);

// ═══════════════════════════════════════════════════════════════
// 🔄 Sync & Initialize Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/order-status/sync-woocommerce
 * @desc    مزامنة واكتشاف الحالات من WooCommerce
 * @access  Private
 */
router.post('/sync-woocommerce', verifyToken.authenticateToken, syncWooCommerceStatuses);

/**
 * @route   POST /api/v1/order-status/initialize
 * @desc    تهيئة الحالات الافتراضية
 * @access  Private
 */
router.post('/initialize', verifyToken.authenticateToken, initializeStatuses);

module.exports = router;
