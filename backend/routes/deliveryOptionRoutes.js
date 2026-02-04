const express = require('express');
const router = express.Router();
const deliveryOptionController = require('../controller/deliveryOptionController');
const { authenticateToken } = require('../utils/verifyToken');

/**
 * 🚚 Routes لإدارة خيارات التوصيل
 */

// Protected routes (تحتاج مصادقة)
router.get('/', authenticateToken, deliveryOptionController.getDeliveryOptions);
router.get('/active', authenticateToken, deliveryOptionController.getActiveDeliveryOptions);
router.get('/default', authenticateToken, deliveryOptionController.getDefaultDeliveryOption);
router.post('/', authenticateToken, deliveryOptionController.createDeliveryOption);
router.put('/:id', authenticateToken, deliveryOptionController.updateDeliveryOption);
router.patch('/:id/toggle', authenticateToken, deliveryOptionController.toggleDeliveryOption);
router.delete('/:id', authenticateToken, deliveryOptionController.deleteDeliveryOption);

module.exports = router;
