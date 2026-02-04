const express = require('express');
const router = express.Router();
const inventoryController = require('../controller/inventoryController');
const { authenticateToken } = require('../utils/verifyToken');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all inventory with filters
router.get('/', inventoryController.getInventory);

// Get inventory alerts (low stock / out of stock)
router.get('/alerts', inventoryController.getAlerts);

// Get stock movements
router.get('/movements', inventoryController.getStockMovements);

// Get inventory for specific product
router.get('/product/:productId', inventoryController.getProductInventory);

// Update stock quantity
router.post('/update-stock', inventoryController.updateStock);

// Approve a pending stock movement
router.post('/approve-movement', inventoryController.approveMovement);

// Transfer stock between warehouses
router.post('/transfer', inventoryController.transferStock);

module.exports = router;
