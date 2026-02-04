const express = require('express');
const router = express.Router();
const productReviewController = require('../controller/productReviewController');
const { requireAuth } = require('../middleware/auth');

/**
 * ⭐ Public Routes للتقييمات والمراجعات
 */

// Get product reviews (Public)
router.get('/products/:productId/reviews', productReviewController.getProductReviews);

// Create review (Public)
router.post('/products/:productId/reviews', productReviewController.createReview);

// Mark review as helpful (Public)
router.put('/reviews/:reviewId/helpful', productReviewController.markHelpful);

/**
 * 🔐 Admin Routes للتقييمات والمراجعات (Protected)
 * Note: These routes are mounted at /api/v1/reviews in server.js
 * They are protected by globalSecurity middleware (includes globalAuthentication)
 */

// Get all reviews (Admin)
// Note: globalSecurity middleware handles authentication, no need for requireAuth here
router.get('/', productReviewController.getAllReviews);

// Bulk Action (Admin) - Must be before dynamic routes
router.post('/bulk-action', productReviewController.bulkAction);

// Approve review (Admin)
router.put('/:reviewId/approve', productReviewController.approveReview);

// Reject review (Admin)
router.put('/:reviewId/reject', productReviewController.rejectReview);

// Delete review (Admin)
router.delete('/:reviewId', productReviewController.deleteReview);

module.exports = router;

