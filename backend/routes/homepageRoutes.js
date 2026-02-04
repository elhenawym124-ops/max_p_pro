const express = require('express');
const router = express.Router();
const homepageController = require('../controller/homepageController');
const { requireAuth } = require('../middleware/auth');

/**
 * Homepage Templates Routes
 * Base path: /api/v1/homepage
 */

// ============ Protected Routes (require authentication) ============

// Get all homepage templates for company
router.get('/templates', requireAuth, homepageController.getHomepageTemplates);

// Get active homepage template
router.get('/active', requireAuth, homepageController.getActiveHomepage);

// Create new homepage template
router.post('/templates', requireAuth, homepageController.createHomepageTemplate);

// Create demo template
router.post('/templates/demo', requireAuth, homepageController.createDemoTemplate);

// Update homepage template
router.put('/templates/:id', requireAuth, homepageController.updateHomepageTemplate);

// Set active homepage template
router.put('/templates/:id/activate', requireAuth, homepageController.setActiveHomepage);

// Duplicate homepage template
router.post('/templates/:id/duplicate', requireAuth, homepageController.duplicateHomepageTemplate);

// Delete homepage template
router.delete('/templates/:id', requireAuth, homepageController.deleteHomepageTemplate);

// ============ Public Routes (for storefront) ============

// Get public active homepage by company ID
router.get('/public/:companyId', (req, res, next) => {
  console.log('🔍 [HOMEPAGE-ROUTE] Route matched: /public/:companyId');
  console.log('🔍 [HOMEPAGE-ROUTE] Params:', req.params);
  console.log('🔍 [HOMEPAGE-ROUTE] CompanyId:', req.params.companyId);
  next();
}, homepageController.getPublicActiveHomepage);

module.exports = router;
