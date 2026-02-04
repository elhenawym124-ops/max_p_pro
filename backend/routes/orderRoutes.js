const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const bulkSearchController = require('../controller/bulkSearchController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, orderController.getAllOrders);
router.put('/:id/status', verifyToken.authenticateToken, orderController.updateOrder);
router.put('/:id', verifyToken.authenticateToken, orderController.getOneOrder);
router.delete('/delete-all', verifyToken.authenticateToken, orderController.deleteAllOrders);

// Bulk Search Route
router.post('/bulk-search', verifyToken.authenticateToken, bulkSearchController.bulkSearchOrders);

module.exports = router;