const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const scheduledOrderSettingsController = require('../controller/scheduledOrderSettingsController');

router.get('/settings', requireAuth, scheduledOrderSettingsController.getSettings);
router.put('/settings', requireAuth, scheduledOrderSettingsController.updateSettings);
router.get('/stats', requireAuth, scheduledOrderSettingsController.getStats);
router.get('/upcoming', requireAuth, scheduledOrderSettingsController.getUpcomingOrders);
router.post('/transition', requireAuth, scheduledOrderSettingsController.manualTransition);

module.exports = router;
