const express = require('express');
const router = express.Router();
const assetController = require('../../controller/hr/assetController');
const assetRequestController = require('../../controller/hr/assetRequestController');
const { authenticateToken } = require('../../utils/verifyToken');
// Assuming performChecks or role checks are handled via middleware or inside controller if needed.
// For now using authenticateToken.

// Categories
router.get('/categories', authenticateToken, assetController.getAssetCategories);
router.post('/categories', authenticateToken, assetController.createAssetCategory);
router.delete('/categories/:id', authenticateToken, assetController.deleteAssetCategory);

// Documents - MUST be before /:id routes
// router.get('/documents/types', authenticateToken, assetController.getDocumentTypes);
router.get('/documents/all', authenticateToken, assetController.getAllDocuments);
router.delete('/documents/:docId', authenticateToken, assetController.deleteAssetDocument);

// Custody
router.get('/custody/active', authenticateToken, assetController.getActiveCustody);

// Assignments
router.post('/assign', authenticateToken, assetController.assignAsset);
router.post('/return', authenticateToken, assetController.returnAsset);

// Maintenance
router.get('/maintenance', authenticateToken, assetController.getMaintenanceHistory);

// Asset Requests
router.get('/requests/all', authenticateToken, assetController.getAssetRequests);
router.get('/requests/my', authenticateToken, assetController.getMyAssetRequests);
router.post('/requests', authenticateToken, assetController.createAssetRequest);
router.put('/requests/:requestId/status', authenticateToken, assetController.updateAssetRequestStatus);
router.post('/requests/:requestId/fulfill', authenticateToken, assetController.fulfillAssetRequest);

// Assets
router.get('/alerts', authenticateToken, assetController.getAssetAlerts);
router.get('/', authenticateToken, assetController.getAssets);
router.post('/', authenticateToken, assetController.createAsset);
router.get('/:id', authenticateToken, assetController.getAsset);
router.put('/:id', authenticateToken, assetController.updateAsset);
router.delete('/:id', authenticateToken, assetController.deleteAsset);

// Asset-specific maintenance and documents
router.get('/:id/maintenance', authenticateToken, assetController.getAssetMaintenanceHistory);
router.post('/:id/maintenance', authenticateToken, assetController.addMaintenanceRecord);
router.get('/:id/documents', authenticateToken, assetController.getAssetDocuments);
router.post('/:id/documents', authenticateToken, assetController.uploadAssetDocument);

// Asset Requests
router.get('/requests/all', authenticateToken, assetRequestController.getAllRequests);
router.get('/requests/my', authenticateToken, assetRequestController.getMyRequests);
router.get('/requests/stats', authenticateToken, assetRequestController.getRequestStats);
router.post('/requests', authenticateToken, assetRequestController.createRequest);
router.post('/requests/:id/approve', authenticateToken, assetRequestController.approveRequest);
router.post('/requests/:id/reject', authenticateToken, assetRequestController.rejectRequest);
router.post('/requests/:id/fulfill', authenticateToken, assetRequestController.fulfillRequest);

module.exports = router;
