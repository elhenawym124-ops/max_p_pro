const express = require('express');
const router = express.Router();
const textGalleryController = require('../controller/textGalleryController');
const verifyToken = require('../utils/verifyToken');

// جميع المسارات تحتاج authentication

// 📥 الحصول على جميع النصوص المحفوظة
router.get('/', verifyToken.authenticateToken, textGalleryController.getTextGallery);

// ➕ حفظ نص جديد
router.post('/', verifyToken.authenticateToken, textGalleryController.saveTextToGallery);

// ✏️ تعديل نص
router.put('/:id', verifyToken.authenticateToken, textGalleryController.updateTextInGallery);

// 🗑️ حذف نص
router.delete('/:id', verifyToken.authenticateToken, textGalleryController.deleteTextFromGallery);

// 📌 تثبيت/إلغاء تثبيت نص
router.patch('/:id/pin', verifyToken.authenticateToken, textGalleryController.togglePinText);

module.exports = router;

