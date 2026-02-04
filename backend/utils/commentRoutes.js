const express = require('express');
const router = express.Router();
const commentController = require('../controller/commentController');
const verifyToken = require('../utils/verifyToken');

// Get all comments with filtering and pagination
router.get('/facebook-comments', verifyToken.authenticateToken, commentController.getFacebookComments);

// Get a specific comment by ID
router.get('/facebook-comments/:id', verifyToken.authenticateToken, commentController.getFacebookCommentById);

// Update comment response
router.put('/facebook-comments/:id', verifyToken.authenticateToken, commentController.updateFacebookComment);

// NEW: Dedicated endpoint for sending manual responses to Facebook
router.post('/facebook-comments/:id/send-response', verifyToken.authenticateToken, commentController.sendManualResponseToFacebook);

// Delete a comment
router.delete('/facebook-comments/:id', verifyToken.authenticateToken, commentController.deleteFacebookComment);

// Bulk delete comments
router.delete('/facebook-comments', verifyToken.authenticateToken, commentController.bulkDeleteFacebookComments);

// Get comment statistics
router.get('/facebook-comments/stats', verifyToken.authenticateToken, commentController.getCommentStats);

// NEW: Get all Facebook posts (comments grouped by postId)
router.get('/facebook-posts', verifyToken.authenticateToken, commentController.getFacebookPosts);

// NEW: Get comments for a specific post
router.get('/facebook-posts/:postId/comments', verifyToken.authenticateToken, commentController.getCommentsByPostId);

// NEW: Set response method for a post
router.post('/facebook-posts/:postId/response-method', verifyToken.authenticateToken, commentController.setPostResponseMethod);

// NEW: Get response method for a post
router.get('/facebook-posts/:postId/response-method', verifyToken.authenticateToken, commentController.getPostResponseMethod);

// NEW: Apply response method to all pending comments of a post
router.post('/facebook-posts/:postId/apply-response-method', verifyToken.authenticateToken, commentController.applyPostResponseMethod);

module.exports = router;