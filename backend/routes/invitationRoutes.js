const express = require('express');
const router = express.Router();
const invitationController = require('../controller/invitationController');


router.get('/verify/:token', invitationController.verifyInvitationToken);
router.post('/accept/:token', invitationController.acceptInvitation);



module.exports = router;