const express = require('express');
const router = express.Router();
const orderInvoiceController = require('../controller/orderInvoiceController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, orderInvoiceController.getAllInvoices);

router.get('/stats', requireAuth, orderInvoiceController.getInvoiceStats);

// Generate invoice for an order
router.post('/generate/:orderId', requireAuth, orderInvoiceController.generateInvoice);

// Bulk generate invoices for multiple orders
router.post('/bulk-generate', requireAuth, orderInvoiceController.bulkGenerateInvoices);

// Get invoice by order ID
router.get('/order/:orderId', requireAuth, orderInvoiceController.getInvoiceByOrderId);

router.get('/number/:invoiceNumber', requireAuth, orderInvoiceController.getInvoiceByNumber);

router.get('/:invoiceId', requireAuth, orderInvoiceController.getInvoiceById);

router.put('/:invoiceId', requireAuth, orderInvoiceController.updateInvoice);

router.put('/:invoiceId/payment-status', requireAuth, orderInvoiceController.updatePaymentStatus);

router.post('/:invoiceId/print', requireAuth, orderInvoiceController.markAsPrinted);

router.post('/:invoiceId/email', requireAuth, orderInvoiceController.markAsEmailed);

router.delete('/:invoiceId', requireAuth, orderInvoiceController.deleteInvoice);

module.exports = router;
