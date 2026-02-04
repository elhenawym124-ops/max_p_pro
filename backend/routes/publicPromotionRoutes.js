const express = require('express');
const router = express.Router();
const promotionSettingsController = require('../controller/promotionSettingsController');
const storefrontSettingsController = require('../controller/storefrontSettingsController');
const deliveryOptionController = require('../controller/deliveryOptionController');

/**
 * 🌐 Public Routes للترويج وخيارات التوصيل (بدون مصادقة)
 * يتم استخدامها من الواجهة العامة للمتجر
 */

// Storefront Settings (Storefront Features) - must be first
router.get('/storefront-settings', storefrontSettingsController.getPublicStorefrontSettings); // Without parameter
router.get('/storefront-settings/:companyId?', storefrontSettingsController.getPublicStorefrontSettings);

// Promotion Settings (Free Shipping) - specific route first
router.get('/promotion-settings/:companyId?', promotionSettingsController.getPublicPromotionSettings);

// Delivery Options - specific route first
router.get('/delivery-options/:companyId?', deliveryOptionController.getPublicDeliveryOptions);

// Generic routes (must be last to avoid conflicts)
// When mounted on /api/v1/public/delivery-options: /:companyId maps to delivery options
// When mounted on /api/v1/public/promotion: /:companyId maps to promotion settings
router.get('/:companyId', (req, res, next) => {
  // Check if mounted on /delivery-options
  if (req.baseUrl.includes('/delivery-options')) {
    return deliveryOptionController.getPublicDeliveryOptions(req, res, next);
  }
  // Otherwise, treat as promotion settings
  return promotionSettingsController.getPublicPromotionSettings(req, res, next);
});

module.exports = router;
