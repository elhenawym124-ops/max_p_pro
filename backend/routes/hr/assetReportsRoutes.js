const express = require('express');
const router = express.Router();
const assetReportsController = require('../../controller/hr/assetReportsController');
const { authenticateToken } = require('../../utils/verifyToken');

// Asset Reports
router.get('/all-assets', authenticateToken, assetReportsController.getAllAssetsReport);
router.get('/employee-custody', authenticateToken, assetReportsController.getEmployeeCustodyReport);
router.get('/available', authenticateToken, assetReportsController.getAvailableAssetsReport);
router.get('/maintenance', authenticateToken, assetReportsController.getMaintenanceAssetsReport);
router.get('/lost-damaged', authenticateToken, assetReportsController.getLostDamagedAssetsReport);
router.get('/total-value', authenticateToken, assetReportsController.getTotalValueReport);

module.exports = router;
