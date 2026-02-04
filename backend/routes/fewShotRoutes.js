const express = require('express');
const router = express.Router();
const fewShotController = require('../controller/fewShotController');
const { requireAuth } = require('../middleware/auth');

// جميع الـ routes تحتاج authentication
router.use(requireAuth);

// ==================== Settings Routes ====================
router.get('/settings', fewShotController.getSettings);
router.put('/settings', fewShotController.updateSettings);

// ==================== Examples Routes ====================
router.get('/examples', fewShotController.getExamples);
router.get('/examples/:id', fewShotController.getExample);
router.post('/examples', fewShotController.createExample);
router.put('/examples/:id', fewShotController.updateExample);
router.delete('/examples/:id', fewShotController.deleteExample);
router.post('/examples/bulk', fewShotController.bulkCreateExamples);

// ==================== Stats & Analytics Routes ====================
router.get('/stats', fewShotController.getStats);

// ==================== Testing Routes ====================
router.post('/test', fewShotController.testPrompt);

// ==================== Categories Routes ====================
router.get('/categories', fewShotController.getCategories);

module.exports = router;
