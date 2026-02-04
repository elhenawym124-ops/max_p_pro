const express = require('express');
const router = express.Router();
const shippingZoneController = require('../controller/shippingZoneController');
const verifyToken = require("../utils/verifyToken")

/**
 * Shipping Zone Routes
 * All routes require authentication
 */

// Get all shipping zones
router.get('/',  verifyToken.authenticateToken, shippingZoneController.getShippingZones);

// Get active shipping zones only
router.get('/active',  verifyToken.authenticateToken, shippingZoneController.getActiveShippingZones);

// Find shipping price by governorate (for AI)
router.get('/find-price', verifyToken.authenticateToken, shippingZoneController.findShippingPrice);

// Get single shipping zone by ID
router.get('/:id',  verifyToken.authenticateToken, shippingZoneController.getShippingZoneById);

// Create new shipping zone
router.post('/',  verifyToken.authenticateToken, shippingZoneController.createShippingZone);

// Update shipping zone
router.put('/:id',  verifyToken.authenticateToken, shippingZoneController.updateShippingZone);

// Toggle shipping zone active status
router.patch('/:id/toggle-status',  verifyToken.authenticateToken, shippingZoneController.toggleZoneStatus);

// Delete shipping zone
router.delete('/:id',  verifyToken.authenticateToken, shippingZoneController.deleteShippingZone);

// Public endpoint to calculate shipping cost (no authentication required)
router.get('/public/:companyId/calculate', shippingZoneController.calculatePublicShippingCost);

module.exports = router;
