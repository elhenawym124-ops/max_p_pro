const express = require('express');
const router = express.Router();
const walletController = require('../controller/walletController');
const { requireAuth } = require('../middleware/auth');

// Middleware for all routes
router.use(requireAuth);

// --- Company Wallet & Billing Routes ---
router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/recharge', walletController.rechargeWallet);

// --- Billing Routes ---
router.get('/billing/summary', walletController.getBillingSummary);
router.get('/billing/usage', walletController.getUsageReport);
router.get('/billing/invoices', walletController.getInvoices);
router.get('/billing/invoices/:id', walletController.getInvoiceDetails);

// --- Customer Wallet & Loyalty Routes ---
router.get('/my-wallet', walletController.getMyWallet);
router.get('/my-transactions', walletController.getMyTransactions);
router.post('/use-balance', walletController.useWalletBalance);

// --- Wallet Admin Routes ---
router.post('/add-balance', walletController.addToWallet);
router.get('/stats', walletController.getWalletStats);

module.exports = router;
