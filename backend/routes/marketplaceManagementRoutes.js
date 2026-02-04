const express = require('express');
const router = express.Router();
const marketplaceManagementController = require('../controller/marketplaceManagementController');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication and super admin role
router.use(requireAuth);

// Marketplace Apps Management
router.get('/apps', marketplaceManagementController.getAllApps);
router.post('/apps', marketplaceManagementController.createApp);
router.put('/apps/:id', marketplaceManagementController.updateApp);
router.delete('/apps/:id', marketplaceManagementController.deleteApp);

// Pricing Rules Management
router.get('/pricing-rules', marketplaceManagementController.getAllPricingRules);
router.post('/pricing-rules', marketplaceManagementController.createPricingRule);
router.put('/pricing-rules/:id', marketplaceManagementController.updatePricingRule);
router.delete('/pricing-rules/:id', marketplaceManagementController.deletePricingRule);

// Bundles Management
router.get('/bundles', marketplaceManagementController.getAllBundles);
router.post('/bundles', marketplaceManagementController.createBundle);
router.put('/bundles/:id', marketplaceManagementController.updateBundle);
router.delete('/bundles/:id', marketplaceManagementController.deleteBundle);

// Enterprise Plans Management
router.get('/enterprise-plans', marketplaceManagementController.getAllEnterprisePlans);
router.post('/enterprise-plans', marketplaceManagementController.createEnterprisePlan);
router.put('/enterprise-plans/:id', marketplaceManagementController.updateEnterprisePlan);
router.delete('/enterprise-plans/:id', marketplaceManagementController.deleteEnterprisePlan);

module.exports = router;
