const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * دالة بسيطة لتحليل User-Agent بدون dependencies
 */
function parseUserAgent(userAgent = '') {
  const ua = userAgent.toLowerCase();
  
  // تحديد المتصفح
  let browserName = 'Unknown';
  if (ua.includes('edg/')) browserName = 'Edge';
  else if (ua.includes('chrome')) browserName = 'Chrome';
  else if (ua.includes('firefox')) browserName = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browserName = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr/')) browserName = 'Opera';
  
  // تحديد نظام التشغيل
  let osName = 'Unknown';
  if (ua.includes('windows')) osName = 'Windows';
  else if (ua.includes('mac')) osName = 'macOS';
  else if (ua.includes('linux')) osName = 'Linux';
  else if (ua.includes('android')) osName = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS';
  
  // تحديد نوع الجهاز
  let deviceType = 'desktop';
  if (ua.includes('mobile')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';
  
  return {
    browser: {
      name: browserName,
      version: 'N/A'
    },
    os: {
      name: osName,
      version: 'N/A'
    },
    device: {
      type: deviceType
    }
  };
}

/**
 * Middleware لتسجيل النشاطات تلقائياً
 * @param {Object} options - خيارات التسجيل
 * @param {String} options.category - تصنيف النشاط (AUTH, ADS, etc.)
 * @param {String} options.action - نوع الإجراء (CREATE, UPDATE, etc.)
 * @param {String} options.description - وصف النشاط
 * @param {String} options.targetType - نوع العنصر المستهدف
 * @param {String} options.severity - مستوى الخطورة (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {Function} options.getTargetId - دالة للحصول على معرف العنصر من req
 * @param {Function} options.getTargetName - دالة للحصول على اسم العنصر من req
 * @param {Function} options.getMetadata - دالة للحصول على بيانات إضافية من req
 */
const logActivity = (options = {}) => {
  return async (req, res, next) => {
    // حفظ الدالة الأصلية
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // متغير لتخزين البيانات
    let responseData = null;
    let isSuccess = true;

    // Override res.json
    res.json = function(data) {
      responseData = data;
      isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      return originalJson(data);
    };

    // Override res.send
    res.send = function(data) {
      if (!responseData) {
        responseData = data;
        isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      }
      return originalSend(data);
    };

    // الاستمرار في معالجة الطلب
    next();

    // تسجيل النشاط بعد انتهاء الطلب
    res.on('finish', async () => {
      try {
        // التأكد من وجود مستخدم مسجل
        if (!req.user || !req.user.id) {
          return;
        }

        // استخراج معلومات الجهاز والمتصفح
        const userAgent = req.headers['user-agent'] || '';
        const deviceInfo = parseUserAgent(userAgent);

        // بناء البيانات الأساسية - استخدام req.user.id (من Prisma) بدلاً من _id
        const baseMetadata = {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
          userAgent: userAgent,
          browser: deviceInfo.browser.name,
          browserVersion: deviceInfo.browser.version,
          os: deviceInfo.os.name,
          osVersion: deviceInfo.os.version,
          deviceType: deviceInfo.device.type
        };

        const logData = {
          userId: req.user.id,
          companyId: req.user.companyId,
          category: options.category || 'SETTINGS',
          action: options.action || 'VIEW',
          description: typeof options.description === 'function' 
            ? options.description(req, responseData) 
            : options.description || 'نشاط غير محدد',
          severity: options.severity || 'LOW',
          isSuccess,
          metadata: baseMetadata
        };

        // إضافة معرف العنصر المستهدف
        if (options.targetType) {
          logData.targetType = options.targetType;
        }

        if (options.getTargetId) {
          logData.targetId = options.getTargetId(req, responseData);
        } else if (req.params.id) {
          logData.targetId = req.params.id;
        }

        if (options.getTargetName) {
          logData.targetName = options.getTargetName(req, responseData);
        }

        // إضافة البيانات التفصيلية
        if (options.getMetadata) {
          const customMetadata = options.getMetadata(req, responseData);
          logData.metadata = { ...logData.metadata, ...customMetadata };
        }

        // إضافة رسالة الخطأ إذا فشل الطلب
        if (!isSuccess && responseData) {
          logData.errorMessage = responseData.message || responseData.error || 'خطأ غير معروف';
        }

        // إضافة Tags
        if (options.tags) {
          logData.tags = typeof options.tags === 'function' 
            ? options.tags(req, responseData) 
            : options.tags;
        }

        // حفظ السجل باستخدام Prisma
        const prisma = getSharedPrismaClient();
        await prisma.activityLog.create({
          data: {
            userId: logData.userId,
            companyId: logData.companyId,
            category: logData.category,
            action: logData.action,
            description: logData.description,
            targetType: logData.targetType,
            targetId: logData.targetId,
            targetName: logData.targetName,
            metadata: logData.metadata ? JSON.stringify(logData.metadata) : null,
            severity: logData.severity,
            isSuccess: logData.isSuccess,
            errorMessage: logData.errorMessage,
            tags: logData.tags ? JSON.stringify(logData.tags) : null
          }
        });
      } catch (error) {
        // نسجل الخطأ لكن لا نوقف العملية
        console.error('Error logging activity:', error);
      }
    });
  };
};

/**
 * Middleware مبسط لتسجيل نشاطات المصادقة
 */
const logAuth = (action, description) => {
  return logActivity({
    category: 'AUTH',
    action,
    description,
    severity: action === 'LOGIN' ? 'MEDIUM' : 'LOW'
  });
};

/**
 * Middleware لتسجيل نشاطات الحملات الإعلانية
 */
const logAds = (action, targetType = 'Campaign') => {
  return logActivity({
    category: 'ADS',
    action,
    targetType,
    description: (req, res) => {
      const actionMap = {
        CREATE: 'إنشاء',
        UPDATE: 'تعديل',
        DELETE: 'حذف',
        ACTIVATE: 'تفعيل',
        DEACTIVATE: 'إيقاف'
      };
      const typeMap = {
        Campaign: 'حملة إعلانية',
        AdSet: 'مجموعة إعلانية',
        Ad: 'إعلان'
      };
      return `${actionMap[action]} ${typeMap[targetType]}`;
    },
    severity: action === 'DELETE' ? 'HIGH' : 'MEDIUM',
    getTargetId: (req, res) => {
      return req.params.id || (res && res._id);
    },
    getTargetName: (req, res) => {
      return req.body?.name || (res && res.name);
    },
    getMetadata: (req, res) => {
      const metadata = {};
      
      if (action === 'UPDATE' && req.body) {
        metadata.changes = Object.keys(req.body).map(key => ({
          field: key,
          newValue: req.body[key]
        }));
      }
      
      if (req.body?.budget) {
        metadata.budget = req.body.budget;
      }
      
      return metadata;
    }
  });
};

/**
 * Middleware لتسجيل نشاطات المحادثات
 */
const logConversation = (action) => {
  return logActivity({
    category: 'CONVERSATIONS',
    action,
    targetType: action === 'SEND' ? 'Message' : 'Conversation',
    description: (req, res) => {
      const actionMap = {
        CREATE: 'إنشاء محادثة جديدة',
        SEND: 'إرسال رسالة',
        ACTIVATE: 'تفعيل الذكاء الاصطناعي',
        DEACTIVATE: 'إيقاف الذكاء الاصطناعي',
        UPDATE: 'تعديل إعدادات المحادثة'
      };
      return actionMap[action] || 'نشاط في المحادثة';
    },
    severity: 'LOW',
    getTargetId: (req, res) => {
      return req.params.conversationId || req.params.id || (res && res._id);
    }
  });
};

/**
 * Middleware لتسجيل نشاطات الفواتير
 */
const logBilling = (action) => {
  return logActivity({
    category: 'BILLING',
    action,
    targetType: action === 'CREATE' ? 'Payment' : 'Invoice',
    description: (req, res) => {
      const actionMap = {
        CREATE: 'شحن الرصيد',
        VIEW: 'عرض الفاتورة',
        EXPORT: 'تصدير الفاتورة',
        UPDATE: 'تحديث طريقة الدفع'
      };
      return actionMap[action] || 'نشاط في الفواتير';
    },
    severity: action === 'CREATE' ? 'HIGH' : 'MEDIUM',
    getMetadata: (req, res) => {
      const metadata = {};
      if (req.body?.amount) {
        metadata.amount = req.body.amount;
      }
      if (req.body?.paymentMethod) {
        metadata.paymentMethod = req.body.paymentMethod;
      }
      return metadata;
    }
  });
};

/**
 * Middleware لتسجيل نشاطات الدعم الفني
 */
const logSupport = (action, targetType = 'Ticket') => {
  return logActivity({
    category: 'SUPPORT',
    action,
    targetType,
    description: (req, res) => {
      const actionMap = {
        CREATE: 'إنشاء تذكرة دعم جديدة',
        UPDATE: 'تحديث تذكرة الدعم',
        SEND: 'إرسال رد على التذكرة',
        APPROVE: 'إغلاق التذكرة'
      };
      return actionMap[action] || 'نشاط في الدعم الفني';
    },
    severity: 'LOW',
    getTargetId: (req, res) => {
      return req.params.ticketId || req.params.id || (res && res._id);
    }
  });
};

/**
 * Middleware لتسجيل نشاطات الملفات
 */
const logFile = (action) => {
  return logActivity({
    category: 'FILES',
    action,
    targetType: 'File',
    description: (req, res) => {
      const actionMap = {
        UPLOAD: 'رفع ملف',
        DOWNLOAD: 'تحميل ملف',
        DELETE: 'حذف ملف'
      };
      return actionMap[action] || 'نشاط في الملفات';
    },
    severity: action === 'DELETE' ? 'MEDIUM' : 'LOW',
    getMetadata: (req, res) => {
      const metadata = {};
      if (req.file) {
        metadata.fileName = req.file.originalname;
        metadata.fileSize = req.file.size;
        metadata.mimeType = req.file.mimetype;
      }
      return metadata;
    }
  });
};

/**
 * Middleware لتسجيل نشاطات إدارة المستخدمين
 */
const logUser = (action) => {
  return logActivity({
    category: 'USERS',
    action,
    targetType: 'User',
    description: (req, res) => {
      const actionMap = {
        CREATE: 'إضافة مستخدم جديد',
        UPDATE: 'تعديل بيانات مستخدم',
        DELETE: 'حذف مستخدم',
        ACTIVATE: 'تفعيل مستخدم',
        DEACTIVATE: 'إيقاف مستخدم'
      };
      return actionMap[action] || 'نشاط في إدارة المستخدمين';
    },
    severity: action === 'DELETE' ? 'CRITICAL' : 'HIGH',
    getTargetId: (req, res) => {
      return req.params.userId || req.params.id || (res && res._id);
    },
    getTargetName: (req, res) => {
      return req.body?.name || req.body?.email || (res && res.name);
    }
  });
};

/**
 * Middleware لتسجيل نشاطات الإعدادات
 */
const logSettings = (action) => {
  return logActivity({
    category: 'SETTINGS',
    action,
    targetType: 'Settings',
    description: (req, res) => {
      const actionMap = {
        UPDATE: 'تعديل الإعدادات',
        VIEW: 'عرض الإعدادات'
      };
      return actionMap[action] || 'نشاط في الإعدادات';
    },
    severity: 'MEDIUM',
    getMetadata: (req, res) => {
      const metadata = {};
      if (req.body) {
        metadata.changes = Object.keys(req.body).map(key => ({
          field: key,
          newValue: req.body[key]
        }));
      }
      return metadata;
    }
  });
};

/**
 * Middleware لتسجيل نشاطات الشركة
 */
const logCompany = (action) => {
  return logActivity({
    category: 'COMPANY',
    action,
    targetType: 'Company',
    description: (req, res) => {
      const actionMap = {
        UPDATE: 'تعديل بيانات الشركة',
        VIEW: 'عرض بيانات الشركة'
      };
      return actionMap[action] || 'نشاط في إدارة الشركة';
    },
    severity: 'HIGH',
    getMetadata: (req, res) => {
      const metadata = {};
      if (req.body) {
        metadata.changes = Object.keys(req.body).map(key => ({
          field: key,
          newValue: req.body[key]
        }));
      }
      return metadata;
    }
  });
};

module.exports = {
  logActivity,
  logAuth,
  logAds,
  logConversation,
  logBilling,
  logSupport,
  logFile,
  logUser,
  logSettings,
  logCompany
};
