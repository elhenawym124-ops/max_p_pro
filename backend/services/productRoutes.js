const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const verifyToken = require("../utils/verifyToken")
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `variant-${uniqueSuffix}${extension}`);
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

router.get('/', verifyToken.authenticateToken, productController.getAllProducts);
router.get('/categories', verifyToken.authenticateToken, productController.getCategory);
router.post('/categories', verifyToken.authenticateToken, productController.createNewCategory);
router.put('/categories/:id', verifyToken.authenticateToken, productController.updateCategory);
router.delete('/categories/:id', verifyToken.authenticateToken, productController.deleteCategory);


router.get('/:id', verifyToken.authenticateToken, productController.getSingleProduct);
router.patch('/:id', verifyToken.authenticateToken, productController.updateSingleProduct);
router.delete('/:id', verifyToken.authenticateToken, productController.deleteSingleProduct);
router.post('/', verifyToken.authenticateToken, productController.createProduct);
router.delete('/:id/images', verifyToken.authenticateToken, productController.deleteImageFromOneProduct);

router.post('/:id/images/url', verifyToken.authenticateToken, productController.addImageToProduct);

// Product variants routes
router.post('/:id/variants', verifyToken.authenticateToken, productController.createProductVariant);
router.get('/:id/variants', verifyToken.authenticateToken, productController.getProductVariants);
router.delete('/:id/variants/:variantId', verifyToken.authenticateToken, productController.deleteProductVariant);

// Variant images routes (variantId in URL)
router.post('/:id/variants/:variantId/images', verifyToken.authenticateToken, productController.addImageToVariant);
router.delete('/:id/variants/:variantId/images', verifyToken.authenticateToken, productController.deleteImageFromVariant);

// Variant images routes (variantId in body) - receives imageUrl in JSON
router.post('/:id/variant-images', verifyToken.authenticateToken, productController.addImageToVariantFromBody);

module.exports = router;