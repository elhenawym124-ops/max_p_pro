const express = require('express');
const router = express.Router();
const storeSettingsController = require('../controller/storeSettingsController');
const verifyToken = require("../utils/verifyToken")

/**
 * Store Settings Routes
 * All routes require authentication
 */

// Get all store settings (branches and shipping zones)
router.get('/', verifyToken.authenticateToken, storeSettingsController.getStoreSettings);

// Get branches only
router.get('/branches', verifyToken.authenticateToken, storeSettingsController.getBranches);

// Get shipping zones only
router.get('/shipping-zones', verifyToken.authenticateToken, storeSettingsController.getShippingZones);

// Get active branches only
router.get('/branches/active', verifyToken.authenticateToken, storeSettingsController.getActiveBranches);

// Get active shipping zones only
router.get('/shipping-zones/active', verifyToken.authenticateToken, storeSettingsController.getActiveShippingZones);

// Find shipping price by governorate (for checkout)
router.get('/shipping-zones/find-price', verifyToken.authenticateToken, storeSettingsController.findShippingPrice);

// Branch routes
router.post('/branches', verifyToken.authenticateToken, storeSettingsController.createBranch);
router.put('/branches/:id', verifyToken.authenticateToken, storeSettingsController.updateBranch);
router.patch('/branches/:id/toggle-status', verifyToken.authenticateToken, storeSettingsController.toggleBranchStatus);
router.delete('/branches/:id', verifyToken.authenticateToken, storeSettingsController.deleteBranch);

// Shipping zone routes
router.post('/shipping-zones', verifyToken.authenticateToken, storeSettingsController.createShippingZone);
router.put('/shipping-zones/:id', verifyToken.authenticateToken, storeSettingsController.updateShippingZone);
router.patch('/shipping-zones/:id/toggle-status', verifyToken.authenticateToken, storeSettingsController.toggleZoneStatus);
router.delete('/shipping-zones/:id', verifyToken.authenticateToken, storeSettingsController.deleteShippingZone);

// Turbo shipping settings routes
router.get('/turbo', verifyToken.authenticateToken, storeSettingsController.getTurboSettings);
router.put('/turbo', verifyToken.authenticateToken, storeSettingsController.updateTurboSettings);

// Shipping Methods Routes (New Architecture)
router.get('/shipping-zones/:zoneId/methods', verifyToken.authenticateToken, storeSettingsController.getShippingMethods);
router.post('/shipping-zones/:zoneId/methods', verifyToken.authenticateToken, storeSettingsController.createShippingMethod);
router.put('/shipping-methods/:methodId', verifyToken.authenticateToken, storeSettingsController.updateShippingMethod);
router.delete('/shipping-methods/:methodId', verifyToken.authenticateToken, storeSettingsController.deleteShippingMethod);

module.exports = router;
