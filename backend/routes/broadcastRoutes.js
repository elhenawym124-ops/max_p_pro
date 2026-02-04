const express = require('express');
const router = express.Router();
const broadcastController = require('../controller/broadcastController');
const verifyToken = require('../utils/verifyToken');
const upload = require('../utils/broadcastMulter');

// ==================== CAMPAIGN ROUTES ====================

/**
 * @route   POST /api/v1/broadcast/campaigns
 * @desc    إنشاء حملة برودكاست جديدة
 * @access  Private (Company Access)
 */
// استقبال صورة مع بيانات الحملة
router.post(
  '/campaigns',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  upload.array('images', 10), // استقبال حتى 10 صور باسم images
  broadcastController.createCampaign
);

/**
 * @route   GET /api/v1/broadcast/campaigns
 * @desc    الحصول على جميع الحملات
 * @access  Private (Company Access)
 */
router.get(
  '/campaigns',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getCampaigns
);

/**
 * @route   GET /api/v1/broadcast/campaigns/:campaignId
 * @desc    الحصول على حملة واحدة
 * @access  Private (Company Access)
 */
router.get(
  '/campaigns/:campaignId',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getCampaign
);

/**
 * @route   PUT /api/v1/broadcast/campaigns/:campaignId
 * @desc    تحديث حملة
 * @access  Private (Company Access)
 */
router.put(
  '/campaigns/:campaignId',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.updateCampaign
);

/**
 * @route   DELETE /api/v1/broadcast/campaigns/:campaignId
 * @desc    حذف/إلغاء حملة
 * @access  Private (Company Access)
 */
router.delete(
  '/campaigns/:campaignId',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.cancelCampaign
);

/**
 * @route   POST /api/v1/broadcast/campaigns/:campaignId/pause
 * @desc    إيقاف حملة مؤقتاً
 * @access  Private (Company Access)
 */
router.post(
  '/campaigns/:campaignId/pause',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.pauseCampaign
);

/**
 * @route   POST /api/v1/broadcast/campaigns/:campaignId/resume
 * @desc    استئناف حملة متوقفة
 * @access  Private (Company Access)
 */
router.post(
  '/campaigns/:campaignId/resume',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.resumeCampaign
);

/**
 * @route   POST /api/v1/broadcast/campaigns/:campaignId/send
 * @desc    إرسال حملة
 * @access  Private (Company Access)
 */
router.post(
  '/campaigns/:campaignId/send',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.sendCampaign
);

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/v1/broadcast/analytics
 * @desc    الحصول على إحصائيات البرودكاست
 * @access  Private (Company Access)
 */
router.get(
  '/analytics',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getAnalytics
);

/**
 * @route   GET /api/v1/broadcast/analytics/:campaignId
 * @desc    الحصول على إحصائيات حملة محددة
 * @access  Private (Company Access)
 */
router.get(
  '/analytics/:campaignId',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getCampaignAnalytics
);

// ==================== CUSTOMER LISTS ROUTES ====================

/**
 * @route   POST /api/v1/broadcast/customer-lists
 * @desc    إنشاء قائمة عملاء جديدة
 * @access  Private (Company Access)
 */
router.post(
  '/customer-lists',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.createCustomerList
);

/**
 * @route   GET /api/v1/broadcast/customer-lists
 * @desc    الحصول على قوائم العملاء
 * @access  Private (Company Access)
 */
router.get(
  '/customer-lists',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getCustomerLists
);

/**
 * @route   GET /api/v1/broadcast/customer-lists/:listId/customers
 * @desc    الحصول على العملاء في قائمة محددة
 * @access  Private (Company Access)
 */
router.get(
  '/customer-lists/:listId/customers',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getCustomersInList
);

// ==================== SETTINGS ROUTES ====================

/**
 * @route   GET /api/v1/broadcast/settings
 * @desc    الحصول على إعدادات البرودكاست
 * @access  Private (Company Access)
 */
router.get(
  '/settings',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.getSettings
);

/**
 * @route   PUT /api/v1/broadcast/settings
 * @desc    تحديث إعدادات البرودكاست
 * @access  Private (Company Access)
 */
router.put(
  '/settings',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  broadcastController.updateSettings
);

module.exports = router;

