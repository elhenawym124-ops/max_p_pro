const prisma = require('../config/prisma');

/**
 * 🔗 Subdomain Middleware - استخراج الشركة من subdomain
 * 
 * يستخدم لتحديد الشركة من الـ subdomain في الـ URL
 * مثال: https://storename.maxp-ai.pro
 * 
 * يقوم بـ:
 * 1. استخراج الـ subdomain من header X-Subdomain
 * 2. البحث عن الشركة في قاعدة البيانات باستخدام slug
 * 3. إضافة معلومات الشركة إلى req.company
 * 4. دعم query parameter كبديل (companyId)
 */

const extractSubdomainMiddleware = async (req, res, next) => {
  try {
    let company = null;

    // 1️⃣ محاولة استخراج الـ subdomain من header
    const hostHeader = req.headers['x-subdomain'] || req.headers['host'];

    if (hostHeader) {
      // استخراج الـ subdomain
      const hostname = hostHeader.split(':')[0]; // إزالة port إن وجد
      const parts = hostname.split('.');

      // التحقق من وجود subdomain
      // مثال: storename.maxp-ai.pro -> storename
      if (parts.length >= 3 && parts[0] !== 'www') {
        const subdomain = parts[0];

        // 🔍 البحث عن الشركة بالـ slug
        company = await prisma.company.findUnique({
          where: { slug: subdomain },
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            logo: true,
            currency: true,
            settings: true,
            isActive: true,
          }
        });
      } else {
        // If main domain or WWW, use the domain name part as slug
        const domainSlug = parts[parts.length - 2];

        company = await prisma.company.findUnique({
          where: { slug: domainSlug },
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            logo: true,
            currency: true,
            settings: true,
            isActive: true,
          }
        });
      }

      if (company && !company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'هذا المتجر غير نشط حالياً'
        });
      }
    }

    // 2️⃣ إذا لم يتم العثور على الشركة من subdomain، جرب query parameter
    if (!company && req.query.companyId) {
      company = await prisma.company.findUnique({
        where: { id: req.query.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          logo: true,
          currency: true,
          settings: true,
          isActive: true,
        }
      });

      if (company && !company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'هذا المتجر غير نشط حالياً'
        });
      }
    }

    // 3️⃣ إضافة معلومات الشركة إلى request
    if (company) {
      req.company = company;
      req.companyId = company.id;
    }

    next();
  } catch (error) {
    console.error('❌ خطأ في subdomain middleware:', error);
    next(error);
  }
};

/**
 * 🔐 Middleware للتأكد من وجود شركة (مطلوب)
 */
const requireCompany = (req, res, next) => {
  if (!req.company) {
    return res.status(400).json({
      success: false,
      message: 'يجب تحديد المتجر في الـ subdomain أو باستخدام companyId',
      hint: 'استخدم https://storename.maxp-ai.pro أو أضف ?companyId=xxx'
    });
  }
  next();
};

module.exports = {
  extractSubdomainMiddleware,
  requireCompany
};
