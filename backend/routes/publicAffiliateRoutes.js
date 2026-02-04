const express = require('express');
const router = express.Router();
const affiliateService = require('../services/affiliateService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Public Affiliate Registration Routes
 * No authentication required - registration without company assignment
 * الشركة/الإدارة ستقوم بربط المسوق بالشركة لاحقاً
 */

/**
 * الحصول على بيانات الشركة العامة (لصفحة التسجيل)
 */
router.get('/companies/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const prisma = getSharedPrismaClient();

    // التحقق من أن Prisma client موجود
    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    const company = await prisma.company.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('❌ [PUBLIC-AFFILIATE] Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات الشركة'
    });
  }
});

/**
 * تسجيل مسوق جديد (عام - بدون authentication)
 * يمكن التسجيل برابط مباشر لشركة معينة
 */
router.post('/register', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();

    // التحقق من أن Prisma client موجود
    if (!prisma) {
      console.error('❌ [PUBLIC-AFFILIATE] Prisma client is undefined');
      throw new Error('Prisma client not initialized');
    }

    // التحقق من أن affiliate model موجود
    if (!prisma.affiliate) {
      console.error('❌ [PUBLIC-AFFILIATE] Affiliate model not found in Prisma client');
      console.error('❌ [PUBLIC-AFFILIATE] Available models:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));
      throw new Error('Affiliate model not found. Please run: npx prisma generate');
    }

    console.log('✅ [PUBLIC-AFFILIATE] Prisma client initialized, affiliate model found');

    const data = req.body;
    let companyId = null;

    // إذا تم إرسال companySlug، نبحث عن الشركة
    if (data.companySlug) {
      const company = await prisma.company.findUnique({
        where: { slug: data.companySlug }
      });

      if (company) {
        companyId = company.id;
        console.log(`✅ [PUBLIC-AFFILIATE] Linking new affiliate to company: ${company.name} (${company.id})`);
      } else {
        console.warn(`⚠️ [PUBLIC-AFFILIATE] Company slug provided but not found: ${data.companySlug}`);
      }
    } else {
      console.log('✅ [PUBLIC-AFFILIATE] Registering affiliate without company - company will be assigned later by admin');
    }

    // التحقق من البيانات المطلوبة
    const { email, password, firstName, lastName, phone } = data;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبون'
      });
    }

    // التحقق من أن المستخدم غير موجود
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // التحقق من وجود affiliate مرتبط
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId: existingUser.id }
      });

      if (existingAffiliate) {
        return res.status(400).json({
          success: false,
          message: 'المستخدم مسجل بالفعل كمسوق'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // إنشاء مستخدم جديد بدون ربط بشركة
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        companyId: companyId, // ربط بالشركة إذا وجدت
        role: 'AFFILIATE', // دور خاص بالمسوق
        isActive: true
      }
    });

    console.log('✅ [PUBLIC-AFFILIATE] User created without company - admin will assign company later');

    // تسجيل المسوق
    const affiliateData = {
      companyId: companyId, // ربط بالشركة إذا وجدت
      commissionType: data.commissionType || 'PERCENTAGE',
      commissionRate: data.commissionRate || 5.0,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      minPayout: data.minPayout || 100.0
    };

    const affiliate = await affiliateService.registerAffiliate(user.id, affiliateData);

    // إنشاء token للمستخدم
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, companyId: companyId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل المسوق بنجاح',
      data: {
        affiliate,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-AFFILIATE] Error registering affiliate:', error);
    console.error('❌ [PUBLIC-AFFILIATE] Error stack:', error.stack);

    // إرجاع رسالة خطأ أكثر تفصيلاً في بيئة التطوير
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `${error.message} (${error.stack})`
      : error.message || 'حدث خطأ أثناء تسجيل المسوق';

    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
});

module.exports = router;
