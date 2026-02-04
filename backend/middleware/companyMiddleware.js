/**
 * Company Identification Middleware
 * Extracts company information from subdomain for public storefront routes
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Middleware to identify company from subdomain
 * This should be applied to all public routes
 */
const getCompanyFromSubdomain = async (req, res, next) => {
  try {
    console.log('🔍 [Company Middleware] ===== Company Resolution =====');
    console.log('🔍 [Company Middleware] Request URL:', req.originalUrl);
    console.log('🔍 [Company Middleware] Query params:', req.query);
    console.log('🔍 [Company Middleware] Body:', req.body);
    console.log('🔍 [Company Middleware] Headers host:', req.headers.host);
    console.log('🔍 [Company Middleware] Headers x-subdomain:', req.headers['x-subdomain']);

    const prisma = getPrisma();
    let company = null;
    let slug = null;
    // الأولوية: header مخصص، ثم host header
    let hostHeader = req.headers['x-company-subdomain'] || req.headers['x-subdomain'] || req.headers['host'];

    // Method 1: Try to get slug from body (PRIMARY METHOD for storefront)
    if (req.body && req.body.slug) {
      slug = req.body.slug;
      console.log('🔍 [Company Middleware] Found slug in body:', slug);
    }

    // Method 1.1: Fallback to companyId from body (for public routes on localhost)
    if (!company && req.body && req.body.companyId) {
      const companyId = req.body.companyId;
      console.log('🔍 [Company Middleware] Fallback to companyId from body:', companyId);

      // Try to find by ID first
      company = await prisma.company.findFirst({
        where: {
          id: companyId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          settings: true,
          isActive: true,
          email: true,
          phone: true,
          website: true,
          currency: true
        }
      });

      // If not found by ID, try by slug
      if (!company) {
        console.log('🔍 [Company Middleware] Not found by ID in body, trying slug...');
        company = await prisma.company.findFirst({
          where: {
            slug: companyId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            email: true,
            phone: true,
            website: true,
            currency: true
          }
        });
      }

      if (company) {
        console.log('✅ [Company Middleware] Company found via companyId body:', company.name);
      } else {
        console.log('❌ [Company Middleware] Company not found by ID or slug from body:', companyId);
      }
    }

    // Method 2: Try to get from subdomain (FALLBACK)
    if (!slug && hostHeader) {
      // استخراج الـ subdomain من hostname
      const hostname = hostHeader.split(':')[0]; // إزالة port إن وجد
      const parts = hostname.split('.');

      // التحقق من وجود subdomain
      // مثال: storename.maxp-ai.pro -> storename
      if (parts.length >= 3 && parts[0] !== 'www') {
        slug = parts[0];
        console.log('🔍 [Company Middleware] Extracted subdomain:', slug);
      } else {
        // If main domain or WWW, use the domain name part as slug
        // Examples: maxp-ai.pro -> mokhtarelhenawy
        //           www.maxp-ai.pro -> mokhtarelhenawy
        slug = parts[parts.length - 2];
        console.log('🔍 [Company Middleware] Main domain or WWW detected, using slug:', slug);
      }
    }

    // Method 3: Fallback to subdomain from header
    if (!slug && req.headers['x-company-subdomain']) {
      slug = req.headers['x-company-subdomain'];
      console.log('🔍 [Company Middleware] Fallback to subdomain from header:', slug);
    }

    // Method 5: Fallback to subdomain from query parameter
    if (!slug && req.query.subdomain) {
      slug = req.query.subdomain;
      console.log('🔍 [Company Middleware] Fallback to subdomain from query:', slug);
    }

    // Now search for company using the slug (if we have one)
    if (slug && !company) {
      company = await prisma.company.findFirst({
        where: {
          slug: slug,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          settings: true,
          isActive: true,
          email: true,
          phone: true,
          website: true,
          currency: true
        }
      });

      if (company) {
        console.log('✅ [Company Middleware] Company found via slug:', company.name, 'slug:', slug);
      } else {
        console.log('⚠️ [Company Middleware] Company not found for slug:', slug);
      }
    }

    // Method 6: Fallback to companyId from header (for development)
    if (!company && req.headers['x-company-id']) {
      const companyId = req.headers['x-company-id'];
      console.log('🔍 [Company Middleware] Fallback to companyId from header:', companyId);

      // Try to find by ID first
      company = await prisma.company.findFirst({
        where: {
          id: companyId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          settings: true,
          isActive: true,
          email: true,
          phone: true,
          website: true,
          currency: true
        }
      });

      // If not found by ID, try by slug
      if (!company) {
        console.log('🔍 [Company Middleware] Not found by ID in header, trying slug...');
        company = await prisma.company.findFirst({
          where: {
            slug: companyId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            email: true,
            phone: true,
            website: true,
            currency: true
          }
        });
      }

      if (company) {
        console.log('✅ [Company Middleware] Company found via companyId header:', company.name);
      }
    }

    // Method 4: Fallback to companyId from query parameter (for backward compatibility)
    // Try both ID and slug since companyId might be either
    if (!company && req.query.companyId) {
      const companyId = req.query.companyId;
      console.log('🔍 [Company Middleware] Fallback to companyId from query:', companyId);

      // Try to find by ID first
      company = await prisma.company.findFirst({
        where: {
          id: companyId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          settings: true,
          isActive: true,
          email: true,
          phone: true,
          website: true,
          currency: true
        }
      });

      // If not found by ID, try by slug
      if (!company) {
        console.log('🔍 [Company Middleware] Not found by ID, trying slug...');
        company = await prisma.company.findFirst({
          where: {
            slug: companyId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            email: true,
            phone: true,
            website: true,
            currency: true
          }
        });
      }

      if (company) {
        console.log('✅ [Company Middleware] Company found via companyId query:', company.name);
      } else {
        console.log('❌ [Company Middleware] Company not found by ID or slug:', companyId);
      }
    }

    // إذا لم يتم العثور على الشركة
    if (!company) {
      console.log('❌ [Company Middleware] Company not found!');
      console.log('❌ [Company Middleware] Tried subdomain from host:', req.headers['host']);
      console.log('❌ [Company Middleware] Tried subdomain from header x-company-subdomain:', req.headers['x-company-subdomain']);
      console.log('❌ [Company Middleware] Tried subdomain from header x-subdomain:', req.headers['x-subdomain']);
      console.log('❌ [Company Middleware] Tried subdomain from query:', req.query.subdomain);
      console.log('❌ [Company Middleware] Tried companyId from header:', req.headers['x-company-id']);
      console.log('❌ [Company Middleware] Tried companyId from query:', req.query.companyId);

      // للـ public routes (مثل التسجيل العام)، نسمح بالاستمرار بدون شركة
      // الشركة ستكون null وسيتم التعامل معها في الـ route
      const isPublicRoute = req.originalUrl.includes('/public/') || req.path.includes('/public/') || req.path.includes('/register');

      if (isPublicRoute) {
        console.log('⚠️ [Company Middleware] Public route - allowing request without company');
        req.company = null;
        req.companyId = null;
        return next();
      }

      // In development mode, allow requests to continue even if company not found
      // This allows testing without requiring a company in the database
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

      if (isDevelopment && (req.query.companyId || req.headers['x-company-id'])) {
        const companyId = req.query.companyId || req.headers['x-company-id'];
        console.log('⚠️ [Company Middleware] Development mode: Allowing request with companyId:', companyId);
        console.log('⚠️ [Company Middleware] Note: Company not found in database, but allowing request to proceed');

        // Create a mock company object for development
        req.company = {
          id: companyId,
          name: 'Development Company',
          slug: companyId,
          isActive: true
        };
        req.companyId = companyId;

        return next();
      }

      return res.status(404).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم https://storename.maxp-ai.pro أو أضف ?companyId=xxx'
      });
    }

    // Add company to request object
    req.company = company;
    req.companyId = company.id;

    next();
  } catch (error) {
    console.error('❌ [Company Middleware] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to validate company ownership for authenticated routes
 * Ensures the user belongs to the same company as the subdomain
 */
const validateCompanyOwnership = async (req, res, next) => {
  try {
    // If no company identified yet, skip validation
    if (!req.company) {
      return next();
    }

    // If no user authenticated, skip validation
    if (!req.user) {
      return next();
    }

    // Check if user belongs to the identified company
    // Check User record first, then UserCompany
    const isDirectMember = req.user.companyId === req.company.id;

    if (!isDirectMember) {
      // Check UserCompany association
      const userCompany = await getPrisma().userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: req.user.id,
            companyId: req.company.id
          }
        }
      });

      if (!userCompany || !userCompany.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not belong to this company (validated via membership)'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in company ownership validation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to add CORS headers for public routes
 * Allows cross-origin requests from the company's frontend
 */
const addPublicCORS = (req, res, next) => {
  try {
    const origin = req.get('origin');

    // Always set CORS headers for public routes
    if (origin) {
      // Check if origin is allowed
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isMokhtarDomain = origin.includes('maxp-ai.pro');

      if (isLocalhost || isMokhtarDomain) {
        // ✅ التأكد من عدم وجود header مسبقاً لتجنب التكرار
        if (!res.getHeader('Access-Control-Allow-Origin')) {
          res.header('Access-Control-Allow-Origin', origin);
          res.header('Access-Control-Allow-Credentials', 'true');
        }
      }
    }

    // ✅ التأكد من عدم وجود headers مسبقاً
    if (!res.getHeader('Access-Control-Allow-Methods')) {
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    }
    if (!res.getHeader('Access-Control-Allow-Headers')) {
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-cart-id, x-session-id, X-Company-Subdomain, X-Company-Id');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  } catch (error) {
    console.error('Error in public CORS middleware:', error);
    next();
  }
};

module.exports = {
  getCompanyFromSubdomain,
  validateCompanyOwnership,
  addPublicCORS
};
