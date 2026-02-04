const express = require('express');
const router = express.Router();
const easyOrdersController = require('../controller/easyOrdersController');
const verifyToken = require('../utils/verifyToken');

// جلب المنتجات من Easy Orders (للعرض في الواجهة)
router.post('/fetch-products', verifyToken.authenticateToken, easyOrdersController.fetchProductsFromEasyOrders);

// استيراد المنتجات المحددة
router.post('/import-selected', verifyToken.authenticateToken, easyOrdersController.importSelectedProducts);

// استيراد منتج واحد من Easy Orders
router.post('/import-product', verifyToken.authenticateToken, easyOrdersController.importProductFromEasyOrders);

// استيراد عدة منتجات دفعة واحدة
router.post('/import-products-bulk', verifyToken.authenticateToken, easyOrdersController.importProductsBulk);

// مزامنة منتج موجود مع Easy Orders
router.put('/sync-product/:id', verifyToken.authenticateToken, easyOrdersController.syncProductWithEasyOrders);

// Get order statistics
router.get('/simple/stats', verifyToken.authenticateToken, easyOrdersController.getOrderStats);

module.exports = router;
