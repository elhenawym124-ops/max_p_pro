const express = require('express');
const router = express.Router();
const landingPageController = require('../controller/landingPageController');
const { requireAuth } = require('../middleware/auth');

// Protected routes (تحتاج authentication)
router.post('/', requireAuth, landingPageController.createLandingPage);
router.get('/', requireAuth, landingPageController.getAllLandingPages);
router.get('/stats', requireAuth, landingPageController.getLandingPageStats);
router.get('/:id', requireAuth, landingPageController.getLandingPage);
router.put('/:id', requireAuth, landingPageController.updateLandingPage);
router.delete('/:id', requireAuth, landingPageController.deleteLandingPage);
router.post('/:id/toggle-publish', requireAuth, landingPageController.togglePublish);
router.post('/:id/duplicate', requireAuth, landingPageController.duplicateLandingPage);

// Public routes (لا تحتاج authentication)
router.get('/public/:slug', landingPageController.getPublicLandingPage);
router.post('/public/:slug/conversion', landingPageController.recordConversion);

module.exports = router;
