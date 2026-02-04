const express = require('express');
const router = express.Router();
const superAdminPlatformController = require('../controller/superAdminPlatformController');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication and super admin role
router.use(requireAuth);

// Platform Subscriptions Management
router.get('/subscriptions', superAdminPlatformController.getAllSubscriptions);
router.put('/subscription/:id', superAdminPlatformController.updateSubscription);

// Billing & Revenue
router.get('/billing-overview', superAdminPlatformController.getBillingOverview);
router.post('/retry-failed-payment/:id', superAdminPlatformController.retryFailedPayment);

// Marketplace Management
router.get('/marketplace-stats', superAdminPlatformController.getMarketplaceStats);

// Plan Limits Management
router.put('/plan-limit/:plan', superAdminPlatformController.updatePlanLimit);

module.exports = router;
