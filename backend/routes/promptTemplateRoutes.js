const express = require('express');
const router = express.Router();
const promptTemplateController = require('../controller/promptTemplateController');
const { requireAuth } = require('../middleware/auth');

// Base route: /api/ai/templates

// Get all templates
router.get('/', requireAuth, promptTemplateController.getTemplates);

// Get specific template
router.get('/:key', requireAuth, promptTemplateController.getTemplateByKey);

// Create or Update template
router.post('/', requireAuth, promptTemplateController.upsertTemplate);

// Preview template with variables
router.post('/preview', requireAuth, promptTemplateController.previewTemplate);

// Delete/Reset template
router.delete('/:key', requireAuth, promptTemplateController.deleteTemplate);

module.exports = router;
