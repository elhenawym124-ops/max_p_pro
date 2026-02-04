const express = require('express');
const router = express.Router();
const smartDelayController = require('../controller/smartDelayController');

router.get('/stats', smartDelayController.getSmartDelayStats);
router.post('/config', smartDelayController.getSmartDelayConfig);
router.post('/flush', smartDelayController.getSmartDelayflush);
router.post('/retry-rag', smartDelayController.getSmartDelayRetryRag);

module.exports = router;