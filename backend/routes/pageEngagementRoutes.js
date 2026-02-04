const express = require('express');
const router = express.Router();
const pageEngagementController = require('../controller/pageEngagementController');
const verifyToken = require('../utils/verifyToken');

// Get all pages engagement overview
router.get('/pages/engagement/overview', verifyToken.authenticateToken, pageEngagementController.getAllPagesEngagementOverview);

// Get specific page engagement stats
router.get('/pages/engagement/:pageId', verifyToken.authenticateToken, pageEngagementController.getPageEngagementStats);

module.exports = router;

