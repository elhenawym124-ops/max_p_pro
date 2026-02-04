/**
 * 📊 Activity Logger Middleware - نسخة بسيطة بدون dependencies إضافية
 * 
 * هذا الملف بديل لـ activityLogger.js ولا يحتاج لـ ua-parser-js
 * استخدمه إذا كنت لا تريد تثبيت packages إضافية
 * 
 * للاستخدام: انسخ محتوى هذا الملف إلى activityLogger.js
 */

const ActivityLog = require('../models/ActivityLog');

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
 * استخراج معلومات الجهاز من Request
 */
function extractDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = parseUserAgent(userAgent);
  
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
    userAgent: userAgent,
    browser: deviceInfo.browser.name,
    browserVersion: deviceInfo.browser.version,
    os: deviceInfo.os.name,
    osVersion: deviceInfo.os.version,
    deviceType: deviceInfo.device.type
  };
}

/**
 * Middleware عام لتسجيل النشاطات
 */
function logActivity(options) {
  return async (req, res, next) => {
    // حفظ الـ response الأصلي
    const originalJson = res.json;
    const originalSend = res.send;
    
    let responseData = null;
    
    // Override res.json لالتقاط البيانات
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };
    
    // Override res.send لالتقاط البيانات
    res.send = function(data) {
      if (!responseData) {
        try {
          responseData = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          responseData = data;
        }
      }
      return originalSend.call(this, data);
    };
    
    // الاستماع لحدث finish
    res.on('finish', async () => {
      try {
        // تجاهل إذا لم يكن هناك user
        if (!req.user) return;
        
        const deviceInfo = extractDeviceInfo(req);
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        
        // بناء بيانات النشاط
        const activityData = {
          userId: req.user._id,
          companyId: req.user.companyId,
          category: typeof options === 'object' ? options.category : options,
          action: typeof options === 'object' ? options.action : 'UPDATE',
          description: typeof options === 'object' && typeof options.description === 'function' 
            ? options.description(req, responseData) 
            : (typeof options === 'object' ? options.description : 'نشاط جديد'),
          severity: typeof options === 'object' ? (options.severity || 'MEDIUM') : 'MEDIUM',
          isSuccess,
          ...deviceInfo
        };
        
        // إضافة معلومات الهدف إذا كانت متوفرة
        if (typeof options === 'object') {
          if (options.targetType) {
            activityData.targetType = options.targetType;
          }
          
          if (options.getTargetId && typeof options.getTargetId === 'function') {
            activityData.targetId = options.getTargetId(req, responseData);
          }
          
          if (options.getTargetName && typeof options.getTargetName === 'function') {
            activityData.targetName = options.getTargetName(req, responseData);
          }
          
          if (options.getMetadata && typeof options.getMetadata === 'function') {
            activityData.metadata = options.getMetadata(req, responseData);
          }
          
          if (options.tags) {
            activityData.tags = options.tags;
          }
        }
        
        // إضافة رسالة الخطأ إذا فشلت العملية
        if (!isSuccess && responseData && responseData.error) {
          activityData.errorMessage = responseData.error;
        }
        
        // حفظ النشاط في قاعدة البيانات
        await ActivityLog.create(activityData);
        
      } catch (error) {
        // تجاهل أخطاء التسجيل لعدم التأثير على العملية الأساسية
        console.error('Activity logging error:', error.message);
      }
    });
    
    next();
  };
}

/**
 * Middleware لتسجيل نشاطات المصادقة (Authentication)
 */
function logAuth(action, description) {
  return logActivity({
    category: 'AUTH',
    action,
    description,
    severity: action === 'LOGIN' || action === 'LOGOUT' ? 'MEDIUM' : 'HIGH',
    targetType: 'User'
  });
}

/**
 * Middleware لتسجيل نشاطات الحملات الإعلانية (Ads)
 */
function logAds(action, targetType = 'Ad') {
  const descriptions = {
    CREATE: `إنشاء ${targetType === 'Campaign' ? 'حملة إعلانية' : targetType === 'AdSet' ? 'مجموعة إعلانية' : 'إعلان'} جديد`,
    UPDATE: `تعديل ${targetType === 'Campaign' ? 'حملة إعلانية' : targetType === 'AdSet' ? 'مجموعة إعلانية' : 'إعلان'}`,
    DELETE: `حذف ${targetType === 'Campaign' ? 'حملة إعلانية' : targetType === 'AdSet' ? 'مجموعة إعلانية' : 'إعلان'}`,
    ACTIVATE: `تفعيل ${targetType === 'Campaign' ? 'حملة إعلانية' : targetType === 'AdSet' ? 'مجموعة إعلانية' : 'إعلان'}`,
    DEACTIVATE: `إيقاف ${targetType === 'Campaign' ? 'حملة إعلانية' : targetType === 'AdSet' ? 'مجموعة إعلانية' : 'إعلان'}`
  };
  
  return logActivity({
    category: 'ADS',
    action,
    description: descriptions[action] || `عملية على ${targetType}`,
    severity: action === 'DELETE' ? 'HIGH' : 'MEDIUM',
    targetType,
    getTargetId: (req, res) => res?.data?._id || res?._id || req.params.id,
    getTargetName: (req, res) => res?.data?.name || res?.name || req.body.name,
    getMetadata: (req, res) => ({
      budget: req.body.budget || res?.data?.budget,
      status: req.body.status || res?.data?.status
    })
  });
}

/**
 * Middleware لتسجيل نشاطات المحادثات (Conversations)
 */
function logConversation(action) {
  const descriptions = {
    CREATE: 'إنشاء محادثة جديدة',
    SEND: 'إرسال رسالة',
    RECEIVE: 'استقبال رسالة',
    ACTIVATE: 'تفعيل الرد الآلي',
    DEACTIVATE: 'إيقاف الرد الآلي',
    UPDATE: 'تعديل إعدادات المحادثة'
  };
  
  return logActivity({
    category: 'CONVERSATIONS',
    action,
    description: descriptions[action] || 'عملية على المحادثة',
    severity: 'LOW',
    targetType: 'Conversation',
    getTargetId: (req, res) => req.params.id || res?.data?._id,
    getMetadata: (req, res) => ({
      messageType: req.body.type,
      hasAttachment: !!req.body.attachment
    })
  });
}

/**
 * Middleware لتسجيل نشاطات الفواتير (Billing)
 */
function logBilling(action) {
  const descriptions = {
    CREATE: 'إنشاء عملية دفع جديدة',
    VIEW: 'عرض فاتورة',
    EXPORT: 'تصدير فاتورة',
    UPDATE: 'تعديل طريقة الدفع'
  };
  
  return logActivity({
    category: 'BILLING',
    action,
    description: descriptions[action] || 'عملية مالية',
    severity: action === 'CREATE' ? 'HIGH' : 'MEDIUM',
    targetType: action === 'CREATE' ? 'Payment' : 'Invoice',
    getTargetId: (req, res) => res?.data?._id || req.params.id,
    getMetadata: (req, res) => ({
      amount: req.body.amount || res?.data?.amount,
      currency: 'EGP'
    })
  });
}

/**
 * Middleware لتسجيل نشاطات الدعم الفني (Support)
 */
function logSupport(action, targetType = 'Ticket') {
  const descriptions = {
    CREATE: `إنشاء ${targetType === 'Ticket' ? 'تذكرة دعم' : 'سؤال شائع'} جديد`,
    UPDATE: `تعديل ${targetType === 'Ticket' ? 'تذكرة دعم' : 'سؤال شائع'}`,
    SEND: 'إرسال رد على تذكرة',
    APPROVE: 'إغلاق تذكرة دعم'
  };
  
  return logActivity({
    category: 'SUPPORT',
    action,
    description: descriptions[action] || `عملية على ${targetType}`,
    severity: 'MEDIUM',
    targetType,
    getTargetId: (req, res) => res?.data?._id || req.params.id,
    getTargetName: (req, res) => res?.data?.subject || req.body.subject
  });
}

/**
 * Middleware لتسجيل نشاطات الملفات (Files)
 */
function logFile(action) {
  const descriptions = {
    UPLOAD: 'رفع ملف جديد',
    DOWNLOAD: 'تحميل ملف',
    DELETE: 'حذف ملف'
  };
  
  return logActivity({
    category: 'FILES',
    action,
    description: descriptions[action] || 'عملية على ملف',
    severity: action === 'DELETE' ? 'HIGH' : 'LOW',
    targetType: 'File',
    getTargetId: (req, res) => res?.data?._id || req.params.id,
    getMetadata: (req, res) => ({
      fileName: req.file?.originalname || req.body.fileName,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype
    })
  });
}

/**
 * Middleware لتسجيل نشاطات إدارة المستخدمين (Users)
 */
function logUser(action) {
  const descriptions = {
    CREATE: 'إضافة مستخدم جديد',
    UPDATE: 'تعديل بيانات مستخدم',
    DELETE: 'حذف مستخدم',
    ACTIVATE: 'تفعيل مستخدم',
    DEACTIVATE: 'إيقاف مستخدم'
  };
  
  return logActivity({
    category: 'USERS',
    action,
    description: descriptions[action] || 'عملية على مستخدم',
    severity: action === 'DELETE' ? 'CRITICAL' : 'HIGH',
    targetType: 'User',
    getTargetId: (req, res) => res?.data?._id || req.params.id,
    getTargetName: (req, res) => res?.data?.name || req.body.name
  });
}

/**
 * Middleware لتسجيل نشاطات الإعدادات (Settings)
 */
function logSettings(action) {
  return logActivity({
    category: 'SETTINGS',
    action,
    description: 'تعديل الإعدادات',
    severity: 'MEDIUM',
    targetType: 'Settings',
    getMetadata: (req, res) => ({
      changedFields: Object.keys(req.body)
    })
  });
}

/**
 * Middleware لتسجيل نشاطات الشركة (Company)
 */
function logCompany(action) {
  const descriptions = {
    CREATE: 'إنشاء شركة جديدة',
    UPDATE: 'تعديل بيانات الشركة',
    DELETE: 'حذف شركة'
  };
  
  return logActivity({
    category: 'COMPANY',
    action,
    description: descriptions[action] || 'عملية على الشركة',
    severity: action === 'DELETE' ? 'CRITICAL' : 'HIGH',
    targetType: 'Company',
    getTargetId: (req, res) => res?.data?._id || req.params.id,
    getTargetName: (req, res) => res?.data?.name || req.body.name
  });
}

/**
 * Middleware لتسجيل نشاطات التقارير (Reports)
 */
function logReport(action) {
  return logActivity({
    category: 'REPORTS',
    action,
    description: action === 'EXPORT' ? 'تصدير تقرير' : 'عرض تقرير',
    severity: 'LOW',
    targetType: 'Report',
    getMetadata: (req, res) => ({
      reportType: req.body.type || req.query.type,
      dateRange: {
        from: req.body.startDate || req.query.startDate,
        to: req.body.endDate || req.query.endDate
      }
    })
  });
}

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
  logCompany,
  logReport
};
