const express = require('express');
const router = express.Router();
const couponsController = require('../controller/couponsController');
const { requireAuth } = require('../middleware/auth');

/**
 * 🎟️ Coupons Routes
 * مسارات إدارة الكوبونات والخصومات
 */

// جميع المسارات تتطلب مصادقة
router.use(requireAuth);

// ✅ الحصول على جميع الكوبونات
router.get('/', couponsController.getCoupons);

// ✅ إحصائيات الكوبونات
router.get('/stats', couponsController.getCouponStats);

// ✅ التحقق من صلاحية كوبون
router.post('/validate', couponsController.validateCoupon);

// ✅ تطبيق كوبون على طلب
router.post('/apply', couponsController.applyCoupon);

// ✅ الحصول على كوبون واحد
router.get('/:id', couponsController.getCoupon);

// ✅ إنشاء كوبون جديد
router.post('/', couponsController.createCoupon);

// ✅ تحديث كوبون
router.put('/:id', couponsController.updateCoupon);

// ✅ حذف كوبون
router.delete('/:id', couponsController.deleteCoupon);

module.exports = router;
