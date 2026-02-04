const express = require('express');
const router = express.Router();
const opportunitiesController = require('../controller/opportunitiesController');

// Get all opportunities (with optional filtering)
router.get('/', opportunitiesController.getAllOpportunities);

// Get pipeline statistics
router.get('/stats/pipeline', opportunitiesController.getPipelineStats);

// Get single opportunity by ID
router.get('/:id', opportunitiesController.getOpportunityById);

// Update opportunity stage
router.put('/:id', opportunitiesController.updateOpportunityStage);

module.exports = router;