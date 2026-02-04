const express = require('express');
const router = express.Router();
const storefrontSettingsController = require('../controller/storefrontSettingsController');
const { requireAuth } = require('../middleware/auth');

/**
 * 🛍️ Routes لإدارة إعدادات واجهة المتجر (Storefront Features)
 */

// Protected routes (تحتاج مصادقة)
router.get('/', requireAuth, storefrontSettingsController.getStorefrontSettings);
router.put('/', requireAuth, storefrontSettingsController.updateStorefrontSettings);
router.post('/reset', requireAuth, storefrontSettingsController.resetStorefrontSettings);

// Facebook Pixel & Conversions API routes
router.post('/test-facebook-pixel', requireAuth, storefrontSettingsController.testFacebookPixel);
router.post('/test-facebook-capi', requireAuth, storefrontSettingsController.testFacebookCapi);
router.post('/validate-pixel-id', requireAuth, storefrontSettingsController.validatePixelId);

// 🔧 Diagnostics & Troubleshooting routes
router.get('/pixel-diagnostics', requireAuth, storefrontSettingsController.getPixelDiagnostics);
router.post('/check-token-permissions', requireAuth, storefrontSettingsController.checkTokenPermissions);
router.post('/validate-event-data', requireAuth, storefrontSettingsController.validateEventData);

// 🎯 Multiple Pixels Support routes
router.get('/pixels', requireAuth, storefrontSettingsController.getPixels);
router.post('/pixels', requireAuth, storefrontSettingsController.addPixel);
router.put('/pixels/:id', requireAuth, storefrontSettingsController.updatePixel);
router.delete('/pixels/:id', requireAuth, storefrontSettingsController.deletePixel);
router.post('/pixels/:id/test', requireAuth, storefrontSettingsController.testPixel);

// 🆕 Create Pixel & Business Accounts routes
router.post('/create-pixel', requireAuth, storefrontSettingsController.createFacebookPixel);
router.get('/business-accounts', requireAuth, storefrontSettingsController.getBusinessAccounts);

// Public route (لا تحتاج مصادقة - للواجهة العامة)
// Support both :companyId parameter and req.company from middleware
router.get('/:companyId?', storefrontSettingsController.getPublicStorefrontSettings);
router.get('/', storefrontSettingsController.getPublicStorefrontSettings); // Without parameter

module.exports = router;

