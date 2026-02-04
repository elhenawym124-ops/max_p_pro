/**
 * Routes for Quota Aggregation and Round-Robin Monitoring
 */

const express = require('express');
const router = express.Router();
const adminQuotaMonitoringController = require('../controller/adminQuotaMonitoringController');
const verifyToken = require('../utils/verifyToken');

// Get comprehensive quota system status
router.get('/status', 
  verifyToken.authenticateToken, 
  verifyToken.requireSuperAdmin,
  adminQuotaMonitoringController.getQuotaSystemStatus
);

// Get detailed quota for a specific company
router.get('/company/:companyId', 
  verifyToken.authenticateToken, 
  verifyToken.requireSuperAdmin,
  adminQuotaMonitoringController.getCompanyQuotaDetails
);

// Get Round-Robin status
router.get('/round-robin', 
  verifyToken.authenticateToken, 
  verifyToken.requireSuperAdmin,
  adminQuotaMonitoringController.getRoundRobinStatus
);

// Get system errors and warnings
router.get('/errors', 
  verifyToken.authenticateToken, 
  verifyToken.requireSuperAdmin,
  adminQuotaMonitoringController.getSystemErrors
);

module.exports = router;
