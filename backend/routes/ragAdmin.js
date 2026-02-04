const express = require('express');
const router = express.Router();
const ragAdminController = require('../controller/ragAdminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/cache/stats', ragAdminController.getCacheStats);

router.post('/cache/invalidate', ragAdminController.invalidateCache);

router.get('/analytics/search', ragAdminController.getSearchAnalytics);

router.get('/analytics/performance', ragAdminController.getPerformanceAnalytics);

router.get('/rate-limit/stats', ragAdminController.getRateLimitStats);

router.get('/settings', requireRole(['SUPER_ADMIN', 'ADMIN']), ragAdminController.getSettings);
router.post('/settings/update', requireRole(['SUPER_ADMIN', 'ADMIN']), ragAdminController.updateSettings);

router.post('/rate-limit/update', requireRole(['SUPER_ADMIN', 'ADMIN']), ragAdminController.updateRateLimits);

router.post('/reload/faqs', ragAdminController.reloadFAQs);

router.post('/reload/policies', ragAdminController.reloadPolicies);

router.get('/health', ragAdminController.getSystemHealth);

module.exports = router;
