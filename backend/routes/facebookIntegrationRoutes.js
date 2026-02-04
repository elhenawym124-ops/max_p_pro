const express = require('express');
const router = express.Router();
const facebookIntegration = require('../controller/facebookIntegration');
const facebookPublishController = require('../controller/facebookPublishController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Place specific routes before parameterized routes
router.post('/facebook/publish', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookPublishController.createPost);

router.get('/facebook/connected', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.getConnectedFacebookPages);
router.get('/facebook/page/:pageId', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.getSpecificFacebookPageDetails);
router.get('/facebook/config', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.getFacebookAppConfig);
router.post('/facebook/test', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.testFacebookPageToken);
router.post('/facebook/connect', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.connectFacebookPage);
router.get('/facebook/diagnostics', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.facebookDiagnostics);
router.delete('/facebook/:pageId', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.disconnectFacebookPage);
router.put('/facebook/:pageId', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.updateFacebookPageSettings);
router.get('/facebook/:pageId', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookIntegration.getFacebookPageDetails);
router.post('/facebook/publish', verifyToken.authenticateToken, checkAppAccess('crm-basic'), facebookPublishController.createPost);

module.exports = router;