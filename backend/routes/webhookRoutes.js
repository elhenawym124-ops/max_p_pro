const express = require('express');
const router = express.Router();
const webhookController = require('../controller/webhookController');

router.get('/', webhookController.getWebhook);
router.post('/', webhookController.postWebhook);

module.exports = router;