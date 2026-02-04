const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const verifyToken = require("../utils/verifyToken")

router.get('/', verifyToken.authenticateToken, customerController.getAllCustomer);
router.get('/search', verifyToken.authenticateToken, customerController.searchCustomers); // ✅ Add search route
router.post('/import', verifyToken.authenticateToken, customerController.importCustomersFromCSV); // 📥 Import customers

// 🔒 Delete routes now secured
router.delete('/cus', verifyToken.authenticateToken, customerController.deleteAllCustomers);
router.delete('/con', verifyToken.authenticateToken, customerController.deleteAllConversations);

// 🚫 Routes for blocking customers on Facebook pages
router.post('/block', verifyToken.authenticateToken, customerController.blockCustomerOnPage);
router.post('/unblock', verifyToken.authenticateToken, customerController.unblockCustomerOnPage);
router.get('/blocked/:pageId', verifyToken.authenticateToken, customerController.getBlockedCustomersOnPage);
router.get('/block-status', verifyToken.authenticateToken, customerController.checkCustomerBlockStatus);

// تفاصيل العميل
router.get('/:customerId', verifyToken.authenticateToken, customerController.getCustomerDetails);

// جلب طلبات العميل
router.get('/:customerId/orders', verifyToken.authenticateToken, customerController.getCustomerOrders);

// سجل نشاطات العميل
router.get('/:customerId/activity', verifyToken.authenticateToken, customerController.getCustomerActivity);

// 📝 ملاحظات العميل
router.get('/:customerId/notes', verifyToken.authenticateToken, customerController.getCustomerNotes);
router.post('/:customerId/notes', verifyToken.authenticateToken, customerController.addCustomerNote);
router.delete('/notes/:noteId', verifyToken.authenticateToken, customerController.deleteCustomerNote);

// 🗑️ حذف عميل محدد
router.delete('/:customerId', verifyToken.authenticateToken, customerController.deleteCustomer);

// 🏷️ تحديث علامات العميل
router.put('/:customerId/tags', verifyToken.authenticateToken, customerController.updateCustomerTags);

// ✏️ تحديث بيانات العميل
router.put('/:customerId', verifyToken.authenticateToken, customerController.updateCustomer);

module.exports = router;
