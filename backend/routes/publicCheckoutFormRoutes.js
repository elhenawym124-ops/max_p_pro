const express = require('express');
const router = express.Router();
const checkoutFormSettingsController = require('../controller/checkoutFormSettingsController');

/**
 * 🌐 Public Routes لإعدادات فورم الشيك أوت (بدون مصادقة)
 * تستخدم في الواجهة العامة للمتجر
 */

/**
 * GET /api/public/checkout-form-settings/:companyId
 * جلب إعدادات فورم الشيك أوت للواجهة العامة
 */
// Support both /:companyId and /checkout-form-settings/:companyId
router.get('/:companyId', checkoutFormSettingsController.getPublicCheckoutFormSettings);
router.get('/checkout-form-settings/:companyId', checkoutFormSettingsController.getPublicCheckoutFormSettings);

module.exports = router;
