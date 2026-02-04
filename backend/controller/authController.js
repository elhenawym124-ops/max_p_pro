const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { isPermissionError, getPermissionErrorMessage } = require('../utils/dbPermissionHelper');

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName, phone, timezone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // تحديد المنطقة الزمنية (من الطلب أو الافتراضي)
    const userTimezone = timezone || 'Asia/Riyadh';
    console.log('🌍 [REGISTER] Using timezone:', userTimezone);

    // Check if user already exists
    const existingUser = await getSharedPrismaClient().user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company first
    const company = await getSharedPrismaClient().company.create({
      data: {
        name: companyName,
        email: email,
        phone: phone || null,
        plan: 'BASIC',
        isActive: true,
        useCentralKeys: true, // ✅ تفعيل المفاتيح المركزية افتراضياً
        sidebarLayout: 'three-tier', // ✅ الوضع الحديث كافتراضي
        timezone: userTimezone // ✅ المنطقة الزمنية المكتشفة تلقائياً
      }
    });

    // Initialize default store pages for the new company
    try {
      const { initializeDefaultStorePages } = require('../utils/initializeCompanyDefaults');
      await initializeDefaultStorePages(company.id);
      console.log('✅ [REGISTER] Default store pages initialized for company:', company.id);
    } catch (error) {
      console.error('⚠️ [REGISTER] Failed to initialize default store pages:', error);
      // Don't fail registration if pages initialization fails
    }

    // Create user
    const user = await getSharedPrismaClient().user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'OWNER',
        companyId: company.id,
        isActive: true,
        timezone: userTimezone // ✅ المنطقة الزمنية المكتشفة تلقائياً
      }
    });

    // Create UserCompany record for multi-company support
    try {
      await getSharedPrismaClient().userCompany.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
          isActive: true,
          isDefault: true
        }
      });
      console.log('✅ [REGISTER] UserCompany record created for user:', user.email);
    } catch (error) {
      console.error('⚠️ [REGISTER] Failed to create UserCompany record:', error);
      // Don't fail registration if UserCompany creation fails
    }

    // Auto-create employee record for the new user
    try {
      const employeeCount = await getSharedPrismaClient().employee.count({
        where: { companyId: company.id }
      });
      const employeeNumber = `EMP${String(employeeCount + 1).padStart(5, '0')}`;

      await getSharedPrismaClient().employee.create({
        data: {
          companyId: company.id,
          userId: user.id,
          employeeNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: phone || null,
          hireDate: new Date(),
          status: 'ACTIVE',
          contractType: 'FULL_TIME'
        }
      });

      console.log('✅ [REGISTER] Employee record created for user:', user.email);
    } catch (error) {
      console.error('⚠️ [REGISTER] Failed to create employee record:', error);
      // Don't fail registration if employee creation fails
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: company.id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            logo: company.logo,
            plan: company.plan,
            currency: company.currency,
            isActive: company.isActive,
            sidebarLayout: company.sidebarLayout
          },
          companies: [{
            id: company.id,
            name: company.name,
            slug: company.slug,
            logo: company.logo,
            plan: company.plan,
            currency: company.currency,
            isActive: company.isActive,
            sidebarLayout: company.sidebarLayout,
            role: user.role,
            isDefault: true,
            isCurrent: true
          }],
          hasMultipleCompanies: false
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الحساب',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [AUTH] Login attempt for:', email);

    if (!email || !password) {
      console.log('❌ [AUTH] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // Ensure database is initialized
    try {
      await initializeSharedDatabase();
    } catch (initError) {
      console.error('❌ [AUTH] Database initialization error:', initError);
      // If it's a health check error, wait a bit and retry once
      if (initError.message.includes('Health check failed')) {
        console.log('🔄 [AUTH] Health check failed, waiting 2s and retrying initialization...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await initializeSharedDatabase();
          console.log('✅ [AUTH] Database initialization succeeded on retry');
        } catch (retryError) {
          console.error('❌ [AUTH] Database initialization failed on retry:', retryError);
          return res.status(503).json({
            success: false,
            message: 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.',
            error: 'Database connection error'
          });
        }
      }
      // For other errors, continue anyway - might already be initialized
    }

    // Find user with company - wrap in retry logic for connection issues
    const user = await executeWithRetry(async () => {
      return await getSharedPrismaClient().user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,  // ✅ Critical: must be explicitly selected
          isActive: true,
          timezone: true,
          lastLoginAt: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              plan: true,
              currency: true,
              isActive: true,
              sidebarLayout: true,
              installedApps: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                select: { app: { select: { slug: true } } }
              }
            }
          },
          userCompanies: {
            where: { isActive: true },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  plan: true,
                  currency: true,
                  isActive: true,
                  sidebarLayout: true,
                  installedApps: {
                    where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                    select: { app: { select: { slug: true } } }
                  }
                }
              }
            },
            orderBy: [
              { isDefault: 'desc' },
              { joinedAt: 'asc' }
            ]
          }
        }
      });
    }, 3);

    if (!user) {
      console.log('❌ [AUTH] User not found:', email.toLowerCase());
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    console.log('✅ [AUTH] User found:', {
      email: user.email,
      isActive: user.isActive,
      hasCompany: !!user.company,
      companyActive: user.company?.isActive,
      companyId: user.companyId,  // ✅ Debug: check if companyId is present
      role: user.role
    });

    // Check for company association (except for system roles)
    const isSystemRole = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'].includes(user.role);
    console.log('🔍 [AUTH-DEBUG] Checking company association:', {
      companyId: user.companyId,
      isSystemRole,
      willFail: !user.companyId && !isSystemRole
    });

    if (!user.companyId && !isSystemRole) {
      console.log('⚠️ [LOGIN] User found but not associated with a company:', email);
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مرتبط بشركة'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ [AUTH] User account is inactive');
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // Check if user has a company (required for non-super-admin users)
    if (!user.company) {
      console.log('❌ [AUTH] User has no company associated');
      // Only allow login without company if user is SUPER_ADMIN
      if (user.role !== 'SUPER_ADMIN') {
        return res.status(401).json({
          success: false,
          message: 'الحساب غير مرتبط بشركة'
        });
      }
    } else {
      // Check if company is active (only if company exists)
      if (!user.company.isActive) {
        console.log('❌ [AUTH] Company account is inactive');
        return res.status(401).json({
          success: false,
          message: 'حساب الشركة غير مفعل'
        });
      }
    }

    // Verify password
    console.log('🔑 [AUTH] Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ [AUTH] Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    console.log('✅ [AUTH] Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login
    try {
      await getSharedPrismaClient().user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    } catch (updateError) {
      if (isPermissionError(updateError)) {
        // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [DB-PERMISSION] Cannot update last login: ${getPermissionErrorMessage(updateError)}`);
        }
      } else {
        // Re-throw non-permission errors
        throw updateError;
      }
    }

    // Build companies list for the response (same as /auth/me)
    const companiesMap = new Map();
    let currentActiveRole = user.role;

    // Helper to find role in a specific company
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies?.find(uc => uc.companyId === cid);
      return assoc ? assoc.role : user.role;
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = user.company.installedApps?.map(ca => ca.app.slug) || [];
      companiesMap.set(user.companyId, {
        ...user.company,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: true // Current company on login
      });
      delete companiesMap.get(user.companyId).installedApps;
      currentActiveRole = roleInPrimary;
    }

    // Add companies from userCompanies
    if (user.userCompanies) {
      for (const uc of user.userCompanies) {
        if (uc.company && uc.company.isActive) {
          if (!companiesMap.has(uc.companyId)) {
            const activeApps = uc.company.installedApps?.map(ca => ca.app.slug) || [];
            companiesMap.set(uc.companyId, {
              ...uc.company,
              activeApps,
              role: uc.role,
              isDefault: uc.isDefault,
              isCurrent: uc.companyId === user.companyId
            });
            delete companiesMap.get(uc.companyId).installedApps;
          }
        }
      }
    }

    // Return user data without password
    const { password: _, userCompanies: __, ...userWithoutSensitive } = user;

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          ...userWithoutSensitive,
          role: currentActiveRole,
          companies: Array.from(companiesMap.values()),
          hasMultipleCompanies: companiesMap.size > 1
        },
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('❌ [AUTH-LOGIN-FATAL] Complete Error:', error);
    if (error.stack) {
      console.error('❌ [AUTH-LOGIN-STACK]:', error.stack);
    }

    // Provide more user-friendly error messages
    let errorMessage = 'فشل في تسجيل الدخول';
    let statusCode = 500;

    if (error.message.includes('Health check failed')) {
      errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى بعد لحظات.';
      statusCode = 503;
    } else if (error.message.includes('Connection') || error.message.includes('timeout')) {
      errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
      statusCode = 503;
    } else if (error.message.includes('max_connections_per_hour')) {
      errorMessage = 'تم تجاوز حد الاتصالات. يرجى المحاولة مرة أخرى لاحقاً.';
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user with company and userCompanies
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            currency: true,
            isActive: true,
            sidebarLayout: true,
            installedApps: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              select: { app: { select: { slug: true } } }
            }
          }
        },
        userCompanies: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                plan: true,
                currency: true,
                isActive: true,
                sidebarLayout: true
              }
            }
          },
          orderBy: [
            { isDefault: 'desc' },
            { joinedAt: 'asc' }
          ]
        },
        devTeamMember: {
          select: {
            xp: true,
            level: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير مفعل'
      });
    }

    // Check company status only if company exists (SUPER_ADMIN might not have company)
    if (user.company && !user.company.isActive) {
      return res.status(401).json({
        success: false,
        message: 'حساب الشركة غير مفعل'
      });
    }

    // Build companies list for the response
    const companiesMap = new Map();
    let currentActiveRole = decoded.role || user.role;

    // Helper to find role in a specific company
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies.find(uc => uc.companyId === cid);
      return assoc ? assoc.role : user.role;
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = user.company.installedApps?.map(ca => ca.app.slug) || [];

      // DEBUG: Log the found role
      if (user.email === 'mokhtar@mokhtar.com') {
        console.log(`🔍 [ME-DEBUG] User: ${user.email}, Primary: ${user.company.name}, Found Role: ${roleInPrimary}, Global Role: ${user.role}`);
      }

      companiesMap.set(user.companyId, {
        ...user.company,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: user.companyId === decoded.companyId
      });
      delete companiesMap.get(user.companyId).installedApps;

      // If this is the currently active company, ensure we use its role
      if (user.companyId === decoded.companyId) {
        currentActiveRole = roleInPrimary;
      }
    }

    // Add companies from userCompanies
    for (const uc of user.userCompanies) {
      if (uc.company && uc.company.isActive) {
        if (!companiesMap.has(uc.companyId)) {
          const activeApps = uc.company.installedApps?.map(ca => ca.app.slug) || [];
          companiesMap.set(uc.companyId, {
            ...uc.company,
            activeApps,
            role: uc.role,
            isDefault: uc.isDefault,
            isCurrent: uc.companyId === decoded.companyId
          });
          delete companiesMap.get(uc.companyId).installedApps;
        }

        // If this secondary company is the current one, update active role
        if (uc.companyId === decoded.companyId) {
          currentActiveRole = uc.role;
        }
      }
    }

    // Return user without password
    const { password: _, userCompanies: __, role: ___, ...userWithoutSensitive } = user;

    // Get the current active company (from token's companyId)
    const currentCompany = companiesMap.get(decoded.companyId) || user.company;

    res.json({
      success: true,
      data: {
        ...userWithoutSensitive,
        role: currentActiveRole, // ✅ Override with context-aware role
        company: currentCompany, // ✅ Return the currently selected company
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
        devStats: user.devTeamMember ? {
          xp: user.devTeamMember.xp,
          level: user.devTeamMember.level
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية رمز المصادقة',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح',
      error: error.message,
      code: 'AUTH_ERROR'
    });
  }
};

const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
}

// Forgot Password - Send reset token via email
const forgotPassword = async (req, res) => {
  try {
    console.log('🔐 [FORGOT-PASSWORD] Request received');
    const { email } = req.body;
    console.log('📧 [FORGOT-PASSWORD] Email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب'
      });
    }

    // Find user
    console.log('🔍 [FORGOT-PASSWORD] Searching for user...');
    const user = await getSharedPrismaClient().user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    });

    // If user not found, check if they have a pending invitation
    if (!user) {
      console.log('⚠️ [FORGOT-PASSWORD] User not found in users table');
      console.log('🔍 [FORGOT-PASSWORD] Checking for pending invitation...');

      const invitation = await getSharedPrismaClient().userInvitation.findFirst({
        where: {
          email: email.toLowerCase(),
          status: 'PENDING'
        }
      });

      if (invitation) {
        console.log('📨 [FORGOT-PASSWORD] Found pending invitation');
        return res.status(400).json({
          success: false,
          message: 'هذا البريد الإلكتروني لديه دعوة معلقة. يرجى قبول الدعوة أولاً لإنشاء حسابك، ثم يمكنك إعادة تعيين كلمة المرور.',
          code: 'PENDING_INVITATION'
        });
      }

      // No user and no invitation - return generic success for security
      console.log('⚠️ [FORGOT-PASSWORD] No user or invitation found');
      return res.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني موجوداً، سيتم إرسال رابط إعادة تعيين كلمة المرور'
      });
    }

    console.log('✅ [FORGOT-PASSWORD] User found:', user.id);

    // Generate reset token
    console.log('🔑 [FORGOT-PASSWORD] Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to database
    console.log('💾 [FORGOT-PASSWORD] Saving token to database...');
    await getSharedPrismaClient().user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: resetTokenExpiry
      }
    });
    console.log('✅ [FORGOT-PASSWORD] Token saved to database');

    // Create reset link
    const resetLink = `https://maxp-ai.pro/auth/reset-password?token=${resetToken}`;

    // Send email if SMTP is configured
    let emailSent = false;
    let emailError = null;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        console.log('📧 Attempting to send password reset email to:', email);
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: '🔐 إعادة تعيين كلمة المرور',
          html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 إعادة تعيين كلمة المرور</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">مرحباً ${user.firstName} ${user.lastName}،</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong style="color: #667eea;">${user.company?.name || 'النظام'}</strong>.
                            </p>
                            
                            <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #856404;">
                                    ⚠️ <strong>هذا الرابط صالح لمدة ساعة واحدة فقط</strong>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                لإعادة تعيين كلمة المرور، انقر على الزر أدناه:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            🔓 إعادة تعيين كلمة المرور
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                أو انسخ الرابط التالي والصقه في المتصفح:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${resetLink}
                            </p>
                            
                            <div style="background-color: #f8d7da; border-right: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #721c24;">
                                    🔒 <strong>لم تطلب إعادة تعيين كلمة المرور؟</strong><br>
                                    يمكنك تجاهل هذا البريد بأمان. كلمة المرور الخاصة بك لن تتغير.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ⏰ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> من وقت الإرسال
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                🔒 لأسباب أمنية، لا تشارك هذا الرابط مع أي شخص
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} ${user.company?.name || 'النظام'}. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `
        });
        emailSent = true;
        console.log('✅ Password reset email sent successfully to:', email);
      } catch (error) {
        emailError = error;
        console.error('❌ Error sending password reset email:', error);
        console.error('Error details:', {
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode
        });
      }
    } else {
      console.log('⚠️ SMTP not configured - email will not be sent');
    }

    res.json({
      success: true,
      message: emailSent
        ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
        : 'تم إنشاء رابط إعادة التعيين (لم يتم إرسال البريد الإلكتروني)',
      emailSent,
      resetLink,
      emailError: emailError ? emailError.message : (emailSent ? null : 'SMTP not configured')
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة طلب إعادة تعيين كلمة المرور',
      error: error.message
    });
  }
};

// Reset Password - Verify token and update password
const resetPassword = async (req, res) => {
  try {
    console.log('🔐 [RESET-PASSWORD] Request received');
    console.log('📦 [RESET-PASSWORD] Body:', req.body);

    // Accept both 'password' and 'newPassword' for compatibility
    const { token, password, newPassword } = req.body;
    const passwordToUse = password || newPassword;

    if (!token || !passwordToUse) {
      return res.status(400).json({
        success: false,
        message: 'الرمز وكلمة المرور الجديدة مطلوبان'
      });
    }

    if (passwordToUse.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // Hash the token to compare with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    console.log('🔑 [RESET-PASSWORD] Token hash:', resetTokenHash);

    // Find user with valid reset token
    const user = await getSharedPrismaClient().user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      console.log('⚠️ [RESET-PASSWORD] Invalid or expired token');

      // Check if token exists but expired
      const expiredUser = await getSharedPrismaClient().user.findFirst({
        where: {
          resetPasswordToken: resetTokenHash
        }
      });

      if (expiredUser) {
        console.log('⏰ [RESET-PASSWORD] Token expired at:', expiredUser.resetPasswordExpires);
        return res.status(400).json({
          success: false,
          message: 'انتهت صلاحية رمز إعادة التعيين. يرجى طلب رابط جديد.'
        });
      }

      console.log('❌ [RESET-PASSWORD] Token not found in database');
      return res.status(400).json({
        success: false,
        message: 'رمز إعادة التعيين غير صحيح'
      });
    }

    console.log('✅ [RESET-PASSWORD] User found:', user.id);

    // Hash new password
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    // Update password and clear reset token
    await getSharedPrismaClient().user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        passwordChangedAt: new Date()
      }
    });

    console.log('✅ [RESET-PASSWORD] Password updated successfully');

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تعيين كلمة المرور',
      error: error.message
    });
  }
};

// Get all companies for the current user
const getUserCompanies = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user's companies from UserCompany table
    const userCompanies = await getSharedPrismaClient().userCompany.findMany({
      where: {
        userId: decoded.userId,
        isActive: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            currency: true,
            isActive: true,
            sidebarLayout: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { joinedAt: 'asc' }
      ]
    });

    // Also get the main company from user record (for backward compatibility)
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: {
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            sidebarLayout: true,
            plan: true,
            currency: true,
            isActive: true
          }
        }
      }
    });

    // Combine results - include main company if not already in userCompanies
    const companyIds = new Set(userCompanies.map(uc => uc.companyId));
    const companies = userCompanies.map(uc => ({
      ...uc.company,
      role: uc.role,
      isDefault: uc.isDefault,
      joinedAt: uc.joinedAt
    }));

    // Add main company if not in the list
    if (user?.company && !companyIds.has(user.companyId)) {
      companies.unshift({
        ...user.company,
        role: 'COMPANY_ADMIN',
        isDefault: true,
        joinedAt: null,
        isMainCompany: true
      });
    }

    // Mark current company
    const currentCompanyId = decoded.companyId;
    const companiesWithCurrent = companies.map(c => ({
      ...c,
      isCurrent: c.id === currentCompanyId
    }));

    res.json({
      success: true,
      data: {
        companies: companiesWithCurrent,
        currentCompanyId
      }
    });

  } catch (error) {
    console.error('❌ Get user companies error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح أو منتهي الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشركات',
      error: error.message
    });
  }
};

// Switch to a different company
const switchCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId;

    console.log('🔄 [SWITCH-COMPANY] User:', userId, 'switching to company:', companyId);

    // Get user data with all companies
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                plan: true,
                currency: true,
                isActive: true,
                sidebarLayout: true
              }
            }
          },
          orderBy: [
            { isDefault: 'desc' },
            { joinedAt: 'asc' }
          ]
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير مفعل'
      });
    }

    // Check if user has access to this company
    // First, check if it's the main company
    let hasAccess = user.companyId === companyId;
    let userRole = user.role;

    if (!hasAccess) {
      // Check UserCompany table
      const userCompany = await getSharedPrismaClient().userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        }
      });

      if (userCompany && userCompany.isActive) {
        hasAccess = true;
        userRole = userCompany.role;
      }
    }

    if (!hasAccess) {
      console.log('❌ [SWITCH-COMPANY] User does not have access to company:', companyId);
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذه الشركة'
      });
    }

    // Get the target company details
    const targetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        currency: true,
        isActive: true,
        sidebarLayout: true
      }
    });

    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    if (!targetCompany.isActive) {
      return res.status(403).json({
        success: false,
        message: 'حساب الشركة غير مفعل'
      });
    }

    // ❌ DO NOT UPDATE User.companyId in database!
    // User.companyId is the PRIMARY company and should remain constant
    // We only issue a new JWT with the switched company for session purposes

    // ✅ CORRECT: Only generate new JWT, don't touch the database
    // The primary company (User.companyId) should NEVER change during switch
    // Exception: We can update lastAccessedCompanyId if we add that field later

    // Generate new JWT token with the new company
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: userRole,  // Use the role for THIS company
        companyId: companyId  // Use the target company ID
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ [SWITCH-COMPANY] Successfully switched to company:', targetCompany.name);

    // Build companies list for the response
    const companiesMap = new Map();

    // Add main company if exists
    if (user.companyId) {
      const mainCompany = await getSharedPrismaClient().company.findUnique({
        where: { id: user.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          plan: true,
          currency: true,
          isActive: true,
          sidebarLayout: true
        }
      });

      if (mainCompany) {
        const mainRole = user.userCompanies?.find(uc => uc.companyId === user.companyId)?.role || user.role;
        companiesMap.set(user.companyId, {
          ...mainCompany,
          role: mainRole,
          isDefault: true,
          isCurrent: user.companyId === companyId
        });
      }
    }

    // Add companies from userCompanies
    if (user.userCompanies) {
      for (const uc of user.userCompanies) {
        if (uc.company && uc.company.isActive) {
          if (!companiesMap.has(uc.companyId)) {
            companiesMap.set(uc.companyId, {
              ...uc.company,
              role: uc.role,
              isDefault: uc.isDefault,
              isCurrent: uc.companyId === companyId
            });
          } else {
            // Update isCurrent flag
            const existing = companiesMap.get(uc.companyId);
            companiesMap.set(uc.companyId, {
              ...existing,
              isCurrent: uc.companyId === companyId
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `تم التبديل إلى ${targetCompany.name} بنجاح`,
      data: {
        token: newToken,
        company: targetCompany,
        role: userRole,
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('❌ Switch company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح أو منتهي الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في التبديل بين الشركات',
      error: error.message
    });
  }
};

// Add user to a company (Admin only)
const addUserToCompany = async (req, res) => {
  try {
    const { userId, companyId, role = 'AGENT' } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم ومعرف الشركة مطلوبان'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Check if the requester is admin of the target company or super admin
    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    const isAuthorized =
      requester.role === 'SUPER_ADMIN' ||
      (requester.role === 'COMPANY_ADMIN' && requester.companyId === companyId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإضافة مستخدمين لهذه الشركة'
      });
    }

    // Check if user exists
    const targetUser = await getSharedPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check if company exists
    const targetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    // Check if user is already in this company
    const existingMembership = await getSharedPrismaClient().userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: companyId
        }
      }
    });

    if (existingMembership) {
      // Update the existing membership
      const updated = await getSharedPrismaClient().userCompany.update({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        },
        data: {
          role: role,
          isActive: true
        }
      });

      return res.json({
        success: true,
        message: 'تم تحديث عضوية المستخدم في الشركة',
        data: updated
      });
    }

    // Create new membership
    const userCompany = await getSharedPrismaClient().userCompany.create({
      data: {
        userId: userId,
        companyId: companyId,
        role: role,
        isActive: true,
        isDefault: false
      }
    });

    console.log('✅ [ADD-USER-COMPANY] User', userId, 'added to company', companyId);

    res.status(201).json({
      success: true,
      message: 'تم إضافة المستخدم إلى الشركة بنجاح',
      data: userCompany
    });

  } catch (error) {
    console.error('❌ Add user to company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح أو منتهي الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المستخدم إلى الشركة',
      error: error.message
    });
  }
};

// Remove user from a company (Admin only)
const removeUserFromCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم ومعرف الشركة مطلوبان'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    const isAuthorized =
      requester.role === 'SUPER_ADMIN' ||
      (requester.role === 'COMPANY_ADMIN' && requester.companyId === companyId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإزالة مستخدمين من هذه الشركة'
      });
    }

    // Delete the membership
    await getSharedPrismaClient().userCompany.delete({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: companyId
        }
      }
    });

    console.log('✅ [REMOVE-USER-COMPANY] User', userId, 'removed from company', companyId);

    res.json({
      success: true,
      message: 'تم إزالة المستخدم من الشركة بنجاح'
    });

  } catch (error) {
    console.error('❌ Remove user from company error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'المستخدم ليس عضواً في هذه الشركة'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح أو منتهي الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إزالة المستخدم من الشركة',
      error: error.message
    });
  }
};

// Set user's primary company to system company (Super Admin only)
const setPrimaryCompany = async (req, res) => {
  try {
    const { userId } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    // Only SUPER_ADMIN can change primary company
    if (requester.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'فقط السوبر أدمن يمكنه تغيير الشركة الأساسية'
      });
    }

    // Get the system company ID (the super admin's company)
    const systemCompanyId = requester.companyId;

    if (!systemCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم العثور على شركة النظام'
      });
    }

    // Update user's primary company
    const updatedUser = await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: { companyId: systemCompanyId }
    });

    console.log('✅ [SET-PRIMARY-COMPANY] User', userId, 'primary company set to system company', systemCompanyId);

    res.json({
      success: true,
      message: 'تم تعيين شركة النظام كشركة أساسية بنجاح',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Set primary company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح أو منتهي الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في تعيين الشركة الأساسية',
      error: error.message
    });
  }
};


module.exports = {
  register,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword,
  getUserCompanies,
  switchCompany,
  addUserToCompany,
  removeUserFromCompany,
  setPrimaryCompany
};
