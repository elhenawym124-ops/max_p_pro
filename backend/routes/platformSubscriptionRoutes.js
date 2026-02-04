const express = require('express');
const router = express.Router();
const platformSubscriptionController = require('../controller/platformSubscriptionController');
const { requireAuth } = require('../middleware/auth');

// جميع الـ routes محمية بـ authentication
router.use(requireAuth);

// Get current subscription
router.get('/', platformSubscriptionController.getSubscription);

// Get all available plans (public info)
router.get('/plans', platformSubscriptionController.getPlans);

// Upgrade plan
router.post('/upgrade', platformSubscriptionController.upgradePlan);

// Cancel subscription
router.post('/cancel', platformSubscriptionController.cancelSubscription);

// Get billing history
router.get('/billing-history', platformSubscriptionController.getBillingHistory);

// Get usage statistics
router.get('/usage-stats', platformSubscriptionController.getUsageStats);

module.exports = router;
