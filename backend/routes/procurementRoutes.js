const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supplierController = require('../controller/supplierController');
const purchaseOrderController = require('../controller/purchaseOrderController');
const purchaseInvoiceController = require('../controller/purchaseInvoiceController');
const supplierPaymentController = require('../controller/supplierPaymentController');
const procurementReportsController = require('../controller/procurementReportsController');

router.use(requireAuth);

router.post('/suppliers', supplierController.createSupplier);
router.get('/suppliers', supplierController.getAllSuppliers);
router.get('/suppliers/:id', supplierController.getSupplierById);
router.put('/suppliers/:id', supplierController.updateSupplier);
router.delete('/suppliers/:id', supplierController.deleteSupplier);
router.get('/suppliers/:id/stats', supplierController.getSupplierStats);

router.post('/purchase-orders', purchaseOrderController.createPurchaseOrder);
router.get('/purchase-orders', purchaseOrderController.getAllPurchaseOrders);
router.get('/purchase-orders/stats', purchaseOrderController.getPurchaseOrderStats);
router.get('/purchase-orders/:id', purchaseOrderController.getPurchaseOrderById);
router.put('/purchase-orders/:id', purchaseOrderController.updatePurchaseOrder);
router.post('/purchase-orders/:id/approve', purchaseOrderController.approvePurchaseOrder);
router.post('/purchase-orders/:id/receive', purchaseOrderController.receiveItems);
router.post('/purchase-orders/:id/cancel', purchaseOrderController.cancelPurchaseOrder);
router.delete('/purchase-orders/:id', purchaseOrderController.deletePurchaseOrder);

router.post('/purchase-invoices', purchaseInvoiceController.createPurchaseInvoice);
router.get('/purchase-invoices', purchaseInvoiceController.getAllPurchaseInvoices);
router.get('/purchase-invoices/stats', purchaseInvoiceController.getPurchaseInvoiceStats);
router.get('/purchase-invoices/:id', purchaseInvoiceController.getPurchaseInvoiceById);
router.put('/purchase-invoices/:id', purchaseInvoiceController.updatePurchaseInvoice);
router.delete('/purchase-invoices/:id', purchaseInvoiceController.deletePurchaseInvoice);
router.post('/purchase-invoices/check-overdue', purchaseInvoiceController.checkOverdueInvoices);

router.post('/supplier-payments', supplierPaymentController.createSupplierPayment);
router.get('/supplier-payments', supplierPaymentController.getAllSupplierPayments);
router.get('/supplier-payments/stats', supplierPaymentController.getSupplierPaymentStats);
router.get('/supplier-payments/:id', supplierPaymentController.getSupplierPaymentById);
router.put('/supplier-payments/:id', supplierPaymentController.updateSupplierPayment);
router.delete('/supplier-payments/:id', supplierPaymentController.deleteSupplierPayment);

router.get('/reports/dashboard', procurementReportsController.getProcurementDashboard);
router.get('/reports/suppliers', procurementReportsController.getSupplierReport);
router.get('/reports/purchase-orders', procurementReportsController.getPurchaseOrderReport);
router.get('/reports/invoices', procurementReportsController.getInvoiceReport);
router.get('/reports/payments', procurementReportsController.getPaymentReport);
router.get('/reports/products', procurementReportsController.getProductPurchaseReport);
router.get('/reports/aging', procurementReportsController.getAgingReport);

module.exports = router;
