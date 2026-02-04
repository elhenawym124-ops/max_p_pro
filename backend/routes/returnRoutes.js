const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const { requireAuth } = require('../middleware/auth');

// Return Reason Categories
router.get('/categories', requireAuth, returnController.getCategories);
router.post('/categories', requireAuth, returnController.createCategory);
router.put('/categories/:id', requireAuth, returnController.updateCategory);

// Return Reasons
router.get('/reasons', requireAuth, returnController.getReturnReasons);
router.post('/reasons', requireAuth, returnController.createReturnReason);
router.put('/reasons/:id', requireAuth, returnController.updateReturnReason);
router.delete('/reasons/:id', requireAuth, returnController.deleteReturnReason);

// Return Requests
router.get('/requests', requireAuth, returnController.getReturnRequests);
router.post('/requests', requireAuth, returnController.createReturnRequest);
router.put('/requests/:id', requireAuth, returnController.updateReturnRequest);
router.post('/requests/:id/analyze', requireAuth, returnController.analyzeReturn);

// Return Settings
router.get('/settings', requireAuth, returnController.getReturnSettings);
router.put('/settings', requireAuth, returnController.updateReturnSettings);

// Return Operations (Contact & History)
router.post('/requests/:id/contact', requireAuth, returnController.addContactAttempt);
router.get('/requests/:id/contacts', requireAuth, returnController.getContactHistory);
router.get('/requests/:id/activity', requireAuth, returnController.getActivityLog);

// Public Routes (Self-Service)
router.post('/public/request', returnController.createPublicReturnRequest);
router.get('/public/reasons', async (req, res) => {
    // Need a way to filter by company, pass companyId in query? 
    // For now allow getting all active reasons if simplified, or require companyId
    // Security consideration: listing reasons might expose company data? Unlikely critical.
    // Let's defer implementation or keep it simple.
    res.status(501).json({ error: 'Not implemented' });
});

module.exports = router;
