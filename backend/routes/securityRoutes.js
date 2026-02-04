const express = require('express');
const router = express.Router();
const securityController = require('../controller/securityController');

router.get('/stats', securityController.getSecurityStats);
router.get('/daily-report', securityController.getSecurityReports);

module.exports = router;