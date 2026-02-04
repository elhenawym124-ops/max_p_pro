const express = require('express');
const router = express.Router();
const { getCompanyFromSubdomain } = require('../middleware/companyMiddleware');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WalletService = require('../services/walletService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
const verifyToken = require('../utils/verifyToken');

const ensureWallet = async (customerId, companyId) => {
  try {
    if (!customerId || !companyId) return;
    await WalletService.createWallet(customerId, companyId);
  } catch (e) {
    console.error('⚠️ [PUBLIC-CUSTOMER] Wallet creation skipped:', e?.message || e);
  }
};

const resolveCompanyId = async (req) => {
  if (req.company && req.company.id) {
    return req.company.id;
  }

  let companyId = req.body.companyId || req.query.companyId || req.headers['x-company-id'] || null;
  if (!companyId) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ id: companyId }, { slug: companyId }],
      isActive: true
    },
    select: { id: true }
  });

  return company?.id || null;
};

const safeParseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
};

const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) {
    cleaned = `20${cleaned.substring(1)}`;
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = `20${cleaned}`;
  }
  return cleaned;
};

const getOtpCode = () => String(Math.floor(1000 + Math.random() * 9000));

const hashOtp = (code, salt) => {
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendOtpViaWhatsApp = async ({ companyId, phone, code }) => {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId },
    select: { defaultSessionId: true, isEnabled: true }
  });

  if (settings && settings.isEnabled === false) {
    return { success: false, reason: 'notifications_disabled' };
  }

  let sessionId = settings.defaultSessionId;
  if (!sessionId) {
    const connected = await prisma.whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED'
      },
      select: { id: true },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (connected?.id) {
      sessionId = connected.id;
      console.log(`ℹ️ [PUBLIC-CUSTOMER] Using fallback connected session for company ${companyId}: ${sessionId}`);
    }
  }

  if (!sessionId) {
    return { success: false, reason: 'no_session' };
  }

  let session = WhatsAppManager.getSession(sessionId);
  if (!session || session.status !== 'connected') {
    try {
      await WhatsAppManager.createSession(sessionId, companyId);
      await delay(1500);
      session = WhatsAppManager.getSession(sessionId);
    } catch (e) {
      // ignore and continue fallbacks
    }

    // Try one more fallback: pick any CONNECTED session from DB and see if runtime is connected
    const connected = await prisma.whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED',
        id: { not: sessionId }
      },
      select: { id: true },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (connected?.id) {
      const fallbackId = connected.id;
      let fallbackSession = WhatsAppManager.getSession(fallbackId);
      if (!fallbackSession || fallbackSession.status !== 'connected') {
        try {
          await WhatsAppManager.createSession(fallbackId, companyId);
          await delay(1500);
          fallbackSession = WhatsAppManager.getSession(fallbackId);
        } catch (e) {
          // ignore
        }
      }
      if (fallbackSession && fallbackSession.status === 'connected') {
        sessionId = fallbackId;
        session = fallbackSession;
        console.log(`ℹ️ [PUBLIC-CUSTOMER] Using fallback runtime-connected session for company ${companyId}: ${sessionId}`);
      }
    }
  }

  if (!session || session.status !== 'connected') {
    return { success: false, reason: 'session_not_connected' };
  }

  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) {
    return { success: false, reason: 'invalid_phone' };
  }

  const jid = `${formatted}@s.whatsapp.net`;
  try {
    const result = await WhatsAppMessageHandler.sendText(sessionId, jid, `كود الدخول: ${code}`);
    return { success: true, sessionId, formattedPhone: formatted, jid, messageId: result?.messageId || result?.key?.id || null };
  } catch (e) {
    console.error('❌ [PUBLIC-CUSTOMER] WhatsApp sendText failed:', {
      companyId,
      sessionId,
      jid,
      error: e?.message || e
    });
    return { success: false, reason: 'send_failed' };
  }
};

router.post('/register', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        companyId,
        phone
      },
      select: { id: true, firstName: true, lastName: true, phone: true, companyId: true }
    });

    if (existingCustomer) {
      await ensureWallet(existingCustomer.id, companyId);
      return res.json({
        success: true,
        message: 'تم تسجيل العميل بنجاح',
        data: { customer: existingCustomer }
      });
    }

    const last4 = phone.replace(/\D/g, '').slice(-4);

    const customer = await prisma.customer.create({
      data: {
        companyId,
        phone,
        firstName: 'عميل',
        lastName: last4 ? `#${last4}` : 'جديد'
      },
      select: { id: true, firstName: true, lastName: true, phone: true, companyId: true }
    });

    await ensureWallet(customer.id, companyId);

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل العميل بنجاح',
      data: { customer }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error registering customer:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل العميل'
    });
  }
});

router.post('/request-otp', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();

    const existingCustomer = await prisma.customer.findFirst({
      where: { companyId, phone },
      select: { id: true, metadata: true }
    });

    const code = getOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const metadata = safeParseJson(existingCustomer?.metadata);
    const nextMetadata = {
      ...metadata,
      otp: {
        hash: hashOtp(code, salt),
        salt,
        expiresAt,
        used: false
      }
    };

    let customerId = existingCustomer?.id;
    if (!customerId) {
      const last4 = phone.replace(/\D/g, '').slice(-4);
      const customer = await prisma.customer.create({
        data: {
          companyId,
          phone,
          firstName: 'عميل',
          lastName: last4 ? `#${last4}` : 'جديد',
          metadata: JSON.stringify(nextMetadata)
        },
        select: { id: true }
      });
      customerId = customer.id;
      await ensureWallet(customerId, companyId);
    } else {
      await prisma.customer.update({
        where: { id: customerId },
        data: { metadata: JSON.stringify(nextMetadata) }
      });
      await ensureWallet(customerId, companyId);
    }

    const sendResult = await sendOtpViaWhatsApp({ companyId, phone, code });
    if (!sendResult.success) {
      return res.status(400).json({
        success: false,
        message: sendResult.reason === 'no_session'
          ? 'تعذر إرسال كود واتساب: يرجى تفعيل إشعارات واتساب للشركة وتحديد جلسة واتساب افتراضية (Default Session) أولاً'
          : sendResult.reason === 'notifications_disabled'
            ? 'تعذر إرسال كود واتساب: إشعارات واتساب معطلة للشركة. يرجى تفعيل إشعارات واتساب من إعدادات الشركة'
          : sendResult.reason === 'session_not_connected'
            ? 'واتساب غير متصل حالياً. يرجى ربط واتساب من إعدادات الشركة أولاً'
            : sendResult.reason === 'invalid_phone'
              ? 'رقم الهاتف غير صالح'
              : sendResult.reason === 'send_failed'
                ? 'تعذر إرسال كود واتساب: فشل إرسال الرسالة من جلسة واتساب الحالية (راجع اتصال الجلسة وصحة الرقم ووجود واتساب عليه)'
              : 'تعذر إرسال كود واتساب'
      });
    }

    const response = {
      success: true,
      message: 'تم إرسال كود التحقق على واتساب'
    };

    if (process.env.NODE_ENV !== 'production') {
      response.debugCode = code;
      response.debugSessionId = sendResult.sessionId;
      response.debugFormattedPhone = sendResult.formattedPhone;
    }

    return res.json(response);
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error requesting OTP:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إرسال كود التحقق'
    });
  }
});

router.post('/verify-otp', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    const code = String(req.body.code || '').trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    if (!code || code.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'كود التحقق غير صحيح'
      });
    }

    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { companyId, phone },
      select: { id: true, firstName: true, lastName: true, metadata: true, companyId: true }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    const metadata = safeParseJson(customer.metadata);
    const otp = metadata?.otp;
    if (!otp || !otp.hash || !otp.salt || !otp.expiresAt || otp.used) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد كود صالح. اطلب كود جديد'
      });
    }

    if (Date.now() > Number(otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية الكود. اطلب كود جديد'
      });
    }

    const expectedHash = hashOtp(code, otp.salt);
    if (expectedHash !== otp.hash) {
      return res.status(400).json({
        success: false,
        message: 'كود التحقق غير صحيح'
      });
    }

    const nextMetadata = {
      ...metadata,
      otp: {
        ...otp,
        used: true,
        verifiedAt: Date.now()
      }
    };

    await prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: JSON.stringify(nextMetadata) }
    });

    const token = jwt.sign(
      {
        userId: customer.id,
        customerId: customer.id,
        role: 'CUSTOMER',
        companyId: customer.companyId,
        phone
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone,
          companyId: customer.companyId
        },
        token,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error verifying OTP:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء التحقق من الكود'
    });
  }
});

router.get('/me', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const customerId = req.user.customerId || req.user.userId || req.user.id;
    const companyId = req.user.companyId;

    if (!customerId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyId: true
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    return res.json({
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        role: 'CUSTOMER',
        companyId: customer.companyId,
        company: null
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error in /me:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل بيانات العميل'
    });
  }
});

module.exports = router;
