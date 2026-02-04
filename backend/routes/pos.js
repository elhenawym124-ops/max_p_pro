const express = require('express');
const router = express.Router();
const posController = require('../controller/posController');
const { requireAuth } = require('../middleware/auth');

// Protect all POS routes
if (typeof requireAuth !== 'function') {
  throw new Error('requireAuth middleware is not a function. Check middleware/auth.js');
}

router.use(requireAuth);

// POST /api/pos/orders - Create new POS order
router.post('/orders', posController.createPOSOrder);

module.exports = router;
