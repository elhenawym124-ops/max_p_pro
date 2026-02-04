const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

/**
 * 🎟️ Public Coupons Routes
 * مسارات عامة للكوبونات (بدون مصادقة) للعملاء
 */

// ✅ التحقق من صلاحية كوبون (عام - للعملاء)
router.post('/:companyId/validate', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { code, orderAmount, customerId } = req.body;

    console.log('🎟️ [PUBLIC-COUPON] Validating coupon:', { companyId, code, orderAmount });

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كود الكوبون وقيمة الطلب'
      });
    }

    // البحث عن الكوبون
    const coupon = await getSharedPrismaClient().coupon.findFirst({
      where: {
        companyId,
        code: code.toUpperCase(),
        isActive: true
      },
      include: {
        usages: customerId ? {
          where: { customerId }
        } : false
      }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير صحيح أو غير نشط'
      });
    }

    // التحقق من صلاحية التاريخ
    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
      return res.status(400).json({
        success: false,
        error: 'الكوبون منتهي الصلاحية'
      });
    }

    // التحقق من حد الاستخدام الكلي
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'تم استنفاد عدد مرات استخدام الكوبون'
      });
    }

    // التحقق من حد الاستخدام للعميل
    if (customerId && coupon.userUsageLimit && coupon.usages) {
      if (coupon.usages.length >= coupon.userUsageLimit) {
        return res.status(400).json({
          success: false,
          error: 'لقد استخدمت هذا الكوبون الحد الأقصى من المرات'
        });
      }
    }

    // التحقق من الحد الأدنى لقيمة الطلب
    if (coupon.minOrderAmount && parseFloat(orderAmount) < parseFloat(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        error: `الحد الأدنى لقيمة الطلب هو ${coupon.minOrderAmount} جنيه`
      });
    }

    // حساب قيمة الخصم
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parseFloat(orderAmount) * parseFloat(coupon.value)) / 100;
      // تطبيق الحد الأقصى للخصم إذا كان موجوداً
      if (coupon.maxDiscountAmount && discountAmount > parseFloat(coupon.maxDiscountAmount)) {
        discountAmount = parseFloat(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === 'FIXED') {
      discountAmount = parseFloat(coupon.value);
      // التأكد من أن الخصم لا يتجاوز قيمة الطلب
      if (discountAmount > parseFloat(orderAmount)) {
        discountAmount = parseFloat(orderAmount);
      }
    } else if (coupon.type === 'FREE_SHIPPING') {
      // سيتم التعامل معه في الـ frontend
      discountAmount = 0;
    }

    console.log('✅ [PUBLIC-COUPON] Coupon valid:', { code, discountAmount });

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round((parseFloat(orderAmount) - discountAmount) * 100) / 100
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-COUPON] Error validating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في التحقق من الكوبون'
    });
  }
});

// ✅ تسجيل استخدام كوبون (سيتم استدعاؤه عند إتمام الطلب)
router.post('/:companyId/record-usage', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { couponCode, orderId, customerId, orderAmount, discountAmount } = req.body;

    console.log('🎟️ [PUBLIC-COUPON] Recording coupon usage:', { companyId, couponCode, orderId });

    // البحث عن الكوبون
    const coupon = await getSharedPrismaClient().coupon.findFirst({
      where: {
        companyId,
        code: couponCode.toUpperCase()
      }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير موجود'
      });
    }

    // تسجيل استخدام الكوبون
    await getSharedPrismaClient().$transaction([
      // إضافة سجل الاستخدام
      // إضافة سجل الاستخدام
      getSharedPrismaClient().couponUsage.create({
        data: {
          couponId: coupon.id,
          companyId,
          customerId: customerId || null,
          orderId: orderId || null,
          orderAmount: parseFloat(orderAmount),
          discountAmount: parseFloat(discountAmount)
        }
      }),
      // تحديث عداد الاستخدام
      // تحديث عداد الاستخدام
      getSharedPrismaClient().coupon.update({
        where: { id: coupon.id },
        data: {
          usageCount: {
            increment: 1
          }
        }
      })
    ]);

    console.log('✅ [PUBLIC-COUPON] Coupon usage recorded successfully');

    res.json({
      success: true,
      message: 'تم تسجيل استخدام الكوبون بنجاح'
    });
  } catch (error) {
    console.error('❌ [PUBLIC-COUPON] Error recording coupon usage:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تسجيل استخدام الكوبون'
    });
  }
});

module.exports = router;
