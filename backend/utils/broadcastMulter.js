// إعداد multer لاستقبال الصور في broadcastRoutes
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعداد مكان حفظ الصور واسم الملف
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/broadcast_images');
    
    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 [BROADCAST-MULTER] تم إنشاء مجلد: ${uploadDir}`);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // تنظيف اسم الملف من الأحرف الخاصة
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
