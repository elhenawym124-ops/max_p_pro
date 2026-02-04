const express = require('express');
const router = express.Router();
const marketplaceController = require('../controller/marketplaceController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.get('/apps', marketplaceController.getAllApps);
router.get('/apps/:slug', marketplaceController.getAppDetails);
router.get('/categories', marketplaceController.getCategories);
router.get('/featured', marketplaceController.getFeaturedApps);
router.get('/bundles', marketplaceController.getBundles);

// Protected routes
router.post('/apps/:slug/install', requireAuth, marketplaceController.installApp);
router.post('/apps/:slug/uninstall', requireAuth, marketplaceController.uninstallApp);
router.post('/apps/:appId/review', requireAuth, marketplaceController.addReview);
router.post('/bundles/:slug/subscribe', requireAuth, marketplaceController.subscribeToBundle);

module.exports = router;
