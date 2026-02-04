const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');


router.post('/health-check', messageController.messageCheckHealth);
router.post('/:id/fix', messageController.messageFix);




module.exports = router;