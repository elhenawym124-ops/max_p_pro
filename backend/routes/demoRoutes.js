const express = require('express');
const router = express.Router();
const demoController = require('../controller/demoController');

router.post('/create-demo-users', demoController.createDemoUsers);

module.exports = router;