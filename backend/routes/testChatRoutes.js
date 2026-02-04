const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const testChatController = require('../controller/testChatController');
const multer = require('multer'); // ✅ NEW
const path = require('path');
const strictFlowMiddleware = require('../middleware/strictFlowMiddleware'); // ✅ Strict Flow


/**
 * Test Chat Routes
 * For testing AI conversations in a sandbox environment
 */

// ✅ إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // مجلد حفظ الصور
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Get all test conversations
router.get('/conversations', verifyToken.authenticateToken, testChatController.getConversations);

// Create new test conversation
router.post('/conversations', verifyToken.authenticateToken, strictFlowMiddleware, testChatController.createConversation);

// Create BULK test conversations
router.post('/conversations/bulk', verifyToken.authenticateToken, testChatController.createBulkConversations);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', verifyToken.authenticateToken, testChatController.getMessages);

// Send message in a conversation (✅ مع دعم الصور)
// Send message in a conversation (✅ مع دعم الصور)
router.post('/conversations/:conversationId/messages',
  verifyToken.authenticateToken,
  upload.array('images', 5), // ✅ حد أقصى 5 صور
  strictFlowMiddleware, // ✅ Check content AFTER upload handling (req.body is populated)
  testChatController.sendMessage
);

// Delete a test conversation
router.delete('/conversations/:conversationId', verifyToken.authenticateToken, testChatController.deleteConversation);

// Run quick test - اختبار سريع
router.post('/run-quick-test', verifyToken.authenticateToken, testChatController.runQuickTest);

// Analyze and fix - تحليل شامل
router.post('/analyze-and-fix', verifyToken.authenticateToken, testChatController.analyzeAndFix);

module.exports = router;
