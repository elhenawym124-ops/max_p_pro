const express = require('express');
const router = express.Router();
const footerSettingsController = require('../controller/footerSettingsController');
const verifyToken = require("../utils/verifyToken");

/**
 * Footer Settings Routes
 */

// Get footer settings (authenticated)
router.get('/', verifyToken.authenticateToken, footerSettingsController.getFooterSettings);

// Update footer settings
router.put('/', verifyToken.authenticateToken, footerSettingsController.updateFooterSettings);

// Reset footer settings to defaults
router.post('/reset', verifyToken.authenticateToken, footerSettingsController.resetFooterSettings);

// Get public footer settings (for storefront - no auth required)
// Note: This route is mounted at /api/v1/public/footer-settings in server.js
// So the full path is /api/v1/public/footer-settings/:companyId
router.get('/:companyId', footerSettingsController.getPublicFooterSettings);

module.exports = router;
