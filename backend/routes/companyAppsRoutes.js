const express = require('express');
const router = express.Router();
const companyAppsController = require('../controller/companyAppsController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.get('/', companyAppsController.getMyApps);
router.get('/:id', companyAppsController.getAppDetails);
router.get('/:id/usage', companyAppsController.getAppUsage);
router.put('/:id/settings', companyAppsController.updateSettings);
router.post('/:id/upgrade', companyAppsController.upgradeApp);
router.delete('/:id', companyAppsController.cancelApp);

module.exports = router;
