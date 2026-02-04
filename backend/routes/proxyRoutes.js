const express = require('express');
const router = express.Router();
const proxyImageController = require('../controller/proxyImageController');

router.get('/', proxyImageController.proxyImage);

module.exports = router;