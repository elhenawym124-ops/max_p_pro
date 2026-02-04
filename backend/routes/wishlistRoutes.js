const express = require('express');
const router = express.Router();
const wishlistController = require('../controller/wishlistController');

/**
 * ❤️ Public Routes لقائمة الرغبات (Wishlist)
 * No authentication required - uses session ID
 */

// Get wishlist
router.get('/', wishlistController.getWishlist);

// Get wishlist count
router.get('/count', wishlistController.getWishlistCount);

// Add to wishlist
router.post('/', wishlistController.addToWishlist);

// Remove from wishlist
router.delete('/:productId', wishlistController.removeFromWishlist);

// Clear wishlist
router.delete('/clear', wishlistController.clearWishlist);

module.exports = router;

