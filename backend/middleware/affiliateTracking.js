const { getSharedPrismaClient } = require('../services/sharedDatabase');
const affiliateService = require('../services/affiliateService');

/**
 * Middleware لتتبع روابط المسوقين
 * يحفظ كود المسوق في الكوكيز والجلسة
 */
const trackAffiliateReferral = async (req, res, next) => {
  try {
    const prisma = getSharedPrismaClient();

    // التحقق من وجود كود المسوق في query parameters أو cookies
    const affiliateCode = req.query.ref || req.query.affiliate || req.cookies.affiliateCode;

    if (affiliateCode) {
      // جلب إعدادات الشركة للحصول على مدة الكوكيز
      let cookieDuration = 30; // الافتراضي 30 يوم

      const company = req.company; // مفترض وجوده من middleware أسبق
      if (company) {
        const settings = await prisma.affiliateSetting.findUnique({
          where: { companyId: company.id }
        });
        if (settings && settings.cookieDuration) {
          cookieDuration = settings.cookieDuration;
        }
      }

      // حفظ في الكوكيز
      res.cookie('affiliateCode', affiliateCode, {
        maxAge: cookieDuration * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax'
      });

      // حفظ في الجلسة
      if (!req.session) {
        req.session = {};
      }
      req.session.affiliateCode = affiliateCode;

      // تتبع الإحالة (حتى لو لم يكن هناك مستخدم مسجل)
      // نستخدم IP و UserAgent كمعرف مؤقت إذا لم يوجد مستخدم
      try {
        let customerId = null;

        if (req.user && req.user.id) {
          const customer = await prisma.customer.findFirst({
            where: {
              companyId: req.user.companyId || (company ? company.id : undefined),
              OR: [
                { phone: req.user.phone },
                { email: req.user.email }
              ]
            }
          });
          if (customer) customerId = customer.id;
        }

        // تتبع النقرة (trackReferral سيقوم بالتحقق من عدم التكرار)
        await affiliateService.trackReferral(affiliateCode, customerId, {
          url: req.originalUrl,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: req.query.source || 'direct'
        });
      } catch (error) {
        console.error('⚠️ [AFFILIATE-TRACKING] Error tracking referral:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('⚠️ [AFFILIATE-TRACKING] Error in middleware:', error.message);
    next();
  }
};

/**
 * Middleware لربط الطلب بالإحالة عند إنشاء الطلب
 */
const linkOrderToAffiliate = async (req, res, next) => {
  try {
    // الحصول على كود المسوق من الكوكيز أو الجلسة
    const affiliateCode = req.cookies.affiliateCode || req.session?.affiliateCode;

    if (affiliateCode) {
      req.affiliateCode = affiliateCode;
    }

    next();
  } catch (error) {
    console.error('⚠️ [AFFILIATE-TRACKING] Error linking order:', error.message);
    next();
  }
};

module.exports = {
  trackAffiliateReferral,
  linkOrderToAffiliate
};
