const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const imageGalleryController = require('../controller/imageGalleryController');
const verifyToken = require('../utils/verifyToken');

// إنشاء مجلد products إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// إعداد multer للرفع
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `gallery-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// جميع المسارات تحتاج authentication

// 📥 الحصول على جميع الصور المحفوظة
router.get('/', verifyToken.authenticateToken, imageGalleryController.getImageGallery);

// ➕ حفظ صورة جديدة (من URL موجود)
router.post('/', verifyToken.authenticateToken, imageGalleryController.saveImageToGallery);

// 📤 رفع وحفظ صورة في الحافظة مباشرة
router.post('/upload', verifyToken.authenticateToken, upload.single('image'), imageGalleryController.uploadAndSaveImage);

// 🗑️ حذف صورة
router.delete('/:id', verifyToken.authenticateToken, imageGalleryController.deleteImageFromGallery);

module.exports = router;
