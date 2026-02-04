const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');
const { getCompanyFromSubdomain } = require('../middleware/companyMiddleware');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Public Merchant Registration Routes
 * No authentication required - company isolation through subdomain
 */

/**
 * تسجيل تاجر جديد (عام - بدون authentication)
 * يستخرج الشركة من subdomain للعزل
 */
router.post('/register', getCompanyFromSubdomain, async (req, res) => {
  try {
    // استخراج الشركة من subdomain (إذا كان موجوداً)
    let companyId = null;
    if (req.company && req.company.id) {
      companyId = req.company.id;
      console.log('✅ [PUBLIC-MERCHANT] Company extracted from subdomain:', req.company.name, 'ID:', companyId);
    } else {
      // إذا لم يكن هناك subdomain، يمكن استخدام companyId من body
      companyId = req.body.companyId || null;
      if (companyId) {
        // التحقق من وجود الشركة
        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findFirst({
          where: {
            OR: [
              { id: companyId },
              { slug: companyId }
            ],
            isActive: true
          }
        });
        
        if (company) {
          companyId = company.id;
          console.log('✅ [PUBLIC-MERCHANT] Using companyId from request body:', companyId);
        } else {
          return res.status(400).json({
            success: false,
            message: 'الشركة غير موجودة أو غير نشطة. يرجى الوصول من subdomain الشركة (مثل: storename.maxp-ai.pro)'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة (مثل: storename.maxp-ai.pro) أو تحديد companyId'
        });
      }
    }

    // التحقق من البيانات المطلوبة
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والبريد الإلكتروني مطلوبان'
      });
    }

    // التحقق من أن التاجر غير موجود (email فريد عالمياً)
    const prisma = getSharedPrismaClient();
    const existingMerchant = await prisma.merchant.findUnique({
      where: {
        email
      }
    });

    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // إنشاء التاجر
    const merchant = await merchantService.createMerchant(companyId, req.body);

    res.json({
      success: true,
      message: 'تم تسجيل التاجر بنجاح',
      data: merchant
    });
  } catch (error) {
    console.error('❌ [PUBLIC-MERCHANT] Error registering merchant:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل التاجر'
    });
  }
});

module.exports = router;
