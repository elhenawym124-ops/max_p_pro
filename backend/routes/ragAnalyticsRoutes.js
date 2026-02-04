const express = require('express');
const router = express.Router();
const ragAnalyticsController = require('../controller/ragAnalyticsController');
const { requireAuth: protect } = require('../middleware/auth');

/**
 * RAG Analytics Routes
 * Base Path: /api/v1/rag-analytics
 */

// Get overall search statistics (success rate, avg latency, top intents)
router.get('/stats', protect, ragAnalyticsController.getSearchStats);

// Get failed searches (queries with no results)
router.get('/failed-searches', protect, ragAnalyticsController.getFailedSearches);

// Get top search terms
router.get('/top-terms', protect, ragAnalyticsController.getTopSearchTerms);

// Get RAG Traces
router.get('/traces', protect, ragAnalyticsController.getTraces);
router.get('/traces/:id', protect, ragAnalyticsController.getTraceDetails);

module.exports = router;
