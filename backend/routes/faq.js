const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.get('/', faqController.getFAQs);
router.get('/categories', faqController.getFAQCategories);
router.post('/:faqId/rate', faqController.rateFAQ);

// Admin routes (require authentication)
router.post('/', requireAuth, faqController.createFAQ);
router.put('/:faqId', requireAuth, faqController.updateFAQ);
router.delete('/:faqId', requireAuth, faqController.deleteFAQ);
router.get('/admin/all', requireAuth, faqController.getAllFAQsForAdmin);

module.exports = router;
