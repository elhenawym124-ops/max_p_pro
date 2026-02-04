const express = require('express');
const router = express.Router();
const orderInvoiceSettingsController = require('../controller/orderInvoiceSettingsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, orderInvoiceSettingsController.getSettings);

router.put('/', requireAuth, orderInvoiceSettingsController.updateSettings);

router.post('/reset', requireAuth, orderInvoiceSettingsController.resetSettings);

module.exports = router;
