// ==================== MIDDLEWARE ====================
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  console.log('🔐 [VERIFY-TOKEN] authenticateToken called for:', req.method, req.path);
  console.log('🔐 [VERIFY-TOKEN] Headers:', req.headers.authorization ? 'Token present' : 'No token');

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ [VERIFY-TOKEN] No token found in request');
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة مطلوب',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    console.log('🔐 [VERIFY-TOKEN] Token decoded successfully');
    console.log('🔐 [VERIFY-TOKEN] Decoded data:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId
    });

    // Map userId to id for compatibility with code that expects req.user.id
    // ✅ FIX: التأكد من أن id موجود دائماً
    const userId = decoded.userId || decoded.id || decoded.user?.id;
    let companyId = decoded.companyId;

    // Fallback: If companyId is missing from token, try to get it from the user record
    // This handles edge cases where tokens might be missing the claim but the user is associated with a company
    if (!companyId && userId) {
      try {
        const { getSharedPrismaClient } = require('../services/sharedDatabase');
        const user = await getSharedPrismaClient().user.findUnique({
          where: { id: userId },
          select: { companyId: true }
        });
        if (user?.companyId) {
          companyId = user.companyId;
          console.log('💡 [VERIFY-TOKEN] Resolved missing companyId from DB:', companyId);
        }
      } catch (dbError) {
        console.error('⚠️ [VERIFY-TOKEN] Failed to resolve companyId fallback:', dbError.message);
      }
    }

    req.user = {
      ...decoded,
      id: userId,
      // ✅ FIX: التأكد من أن firstName و lastName موجودان
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
      role: decoded.role,
      companyId: companyId
    };
    console.log('✅ [VERIFY-TOKEN] Token verified, user role:', req.user.role, 'email:', req.user.email, 'companyId:', req.user.companyId);
    next();
  } catch (error) {
    console.log('❌ [VERIFY-TOKEN] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح',
      code: 'INVALID_TOKEN',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Company access middleware
const requireCompanyAccess = async (req, res, next) => {
  console.log(`🔐 [COMPANY-ACCESS] ========== MIDDLEWARE CALLED ==========`);
  console.log(`🔐 [COMPANY-ACCESS] URL: ${req.originalUrl}`);
  console.log(`🔐 [COMPANY-ACCESS] Method: ${req.method}`);
  console.log(`🔐 [COMPANY-ACCESS] Params:`, req.params);
  console.log(`🔐 [COMPANY-ACCESS] User:`, req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId, role: req.user.role } : 'No user');

  try {
    const { companyId } = req.params;
    const userCompanyId = req.user.companyId;

    // 🔐 [SUPER-ADMIN] HANDLING
    if (req.user.role === 'SUPER_ADMIN') {
      // If there's a companyId in URL, that's the effective context
      if (companyId) {
        req.user.effectiveCompanyId = companyId;
        console.log(`👑 [COMPANY-ACCESS] Super Admin context set to URL company: ${companyId}`);
      } else {
        // Fallback to user's associated companyId (might be null)
        req.user.effectiveCompanyId = userCompanyId;
        console.log(`👑 [COMPANY-ACCESS] Super Admin context set to account company: ${userCompanyId}`);
      }
      return next();
    }

    // Regular users can only access their own company
    if (companyId && companyId !== userCompanyId) {
      console.log(`❌ [AUTH-ERROR] Access denied. URL Company: ${companyId}, User Company: ${userCompanyId}`);
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذه الشركة',
        debug: {
          required: companyId,
          yours: userCompanyId
        }
      });
    }

    // If no companyId in params, use user's company
    if (!companyId) {
      req.params.companyId = userCompanyId;
    }

    // Set effective company ID for consistent access in controllers
    req.user.effectiveCompanyId = userCompanyId;

    next();
  } catch (error) {
    console.error('❌ [COMPANY-ACCESS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول'
    });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لهذا الإجراء'
      });
    }
    next();
  };
};

// Super Admin access control middleware
const requireSuperAdmin = (req, res, next) => {
  console.log('👑 [VERIFY-TOKEN] requireSuperAdmin called, user role:', req.user?.role);
  if (!req.user) {
    console.log('❌ [VERIFY-TOKEN] No user found in request');
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالوصول'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    console.log('❌ [VERIFY-TOKEN] Access denied: User is not SUPER_ADMIN, role is:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'هذا المورد متاح لمدير النظام فقط'
    });
  }

  console.log('✅ [VERIFY-TOKEN] Super Admin access granted');
  next();
};


module.exports = { requireSuperAdmin, requireRole, requireCompanyAccess, authenticateToken }