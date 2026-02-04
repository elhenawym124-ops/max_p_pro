/**
 * Security Monitor Middleware
 * مراقبة الأمان ومنع محاولات خرق العزل
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class SecurityMonitor {
  constructor() {
    this.suspiciousAttempts = new Map();
    this.maxAttemptsPerHour = 10;
  }
  
  /**
   * تسجيل محاولة مشبوهة
   */
  logSuspiciousAttempt(type, details) {
    const timestamp = new Date().toISOString();
    const key = `${details.pageId || 'unknown'}_${details.senderId || 'unknown'}`;
    
    //console.log(`🚨 [SECURITY-ALERT] ${type}:`);
    //console.log(`   📅 الوقت: ${timestamp}`);
    //console.log(`   📱 Page ID: ${details.pageId}`);
    //console.log(`   👤 Sender ID: ${details.senderId}`);
    //console.log(`   🏢 Company ID: ${details.companyId || 'غير محدد'}`);
    //console.log(`   📝 التفاصيل: ${details.message}`);
    
    // تتبع المحاولات المشبوهة
    if (!this.suspiciousAttempts.has(key)) {
      this.suspiciousAttempts.set(key, []);
    }
    
    const attempts = this.suspiciousAttempts.get(key);
    attempts.push({
      type,
      timestamp,
      details
    });
    
    // تنظيف المحاولات القديمة (أكثر من ساعة)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentAttempts = attempts.filter(attempt => 
      new Date(attempt.timestamp).getTime() > oneHourAgo
    );
    
    this.suspiciousAttempts.set(key, recentAttempts);
    
    // تحذير إذا تجاوز الحد المسموح
    if (recentAttempts.length > this.maxAttemptsPerHour) {
      //console.log(`🚨 [SECURITY-WARNING] تجاوز الحد المسموح: ${recentAttempts.length} محاولة في الساعة الأخيرة`);
      //console.log(`🔒 [SECURITY-ACTION] يُنصح بحظر هذا المستخدم مؤقتاً`);
    }
    
    return recentAttempts.length;
  }
  
  /**
   * فحص محاولة الوصول
   */
  async checkAccess(pageId, senderId, companyId) {
    try {
      // فحص صحة الصفحة
      const page = await getSharedPrismaClient().facebookPage.findUnique({
        where: { pageId: pageId },
        include: { company: true }
      });
      
      if (!page) {
        this.logSuspiciousAttempt('UNKNOWN_PAGE', {
          pageId,
          senderId,
          companyId,
          message: 'محاولة الوصول من صفحة غير مسجلة'
        });
        return { valid: false, reason: 'UNKNOWN_PAGE' };
      }
      
      if (!page.isActive) {
        this.logSuspiciousAttempt('INACTIVE_PAGE', {
          pageId,
          senderId,
          companyId,
          message: 'محاولة الوصول من صفحة غير نشطة'
        });
        return { valid: false, reason: 'INACTIVE_PAGE' };
      }
      
      if (page.companyId !== companyId) {
        this.logSuspiciousAttempt('COMPANY_MISMATCH', {
          pageId,
          senderId,
          companyId,
          message: `عدم تطابق الشركة: الصفحة تنتمي لـ ${page.companyId} لكن الطلب لـ ${companyId}`
        });
        return { valid: false, reason: 'COMPANY_MISMATCH' };
      }
      
      // فحص صحة الشركة
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId }
      });
      
      if (!company) {
        this.logSuspiciousAttempt('INVALID_COMPANY', {
          pageId,
          senderId,
          companyId,
          message: 'محاولة الوصول لشركة غير موجودة'
        });
        return { valid: false, reason: 'INVALID_COMPANY' };
      }
      
      //console.log(`✅ [SECURITY-CHECK] وصول آمن: ${page.pageName} → ${company.name}`);
      return { 
        valid: true, 
        page: page,
        company: company 
      };
      
    } catch (error) {
      console.error(`❌ [SECURITY-ERROR] خطأ في فحص الوصول:`, error);
      this.logSuspiciousAttempt('SECURITY_ERROR', {
        pageId,
        senderId,
        companyId,
        message: `خطأ في النظام: ${error.message}`
      });
      return { valid: false, reason: 'SYSTEM_ERROR' };
    }
  }
  
  /**
   * تقرير الأمان اليومي
   */
  generateSecurityReport() {
    //console.log('\n📊 تقرير الأمان اليومي:');
    //console.log('═'.repeat(60));
    
    let totalAttempts = 0;
    let suspiciousUsers = 0;
    
    for (const [key, attempts] of this.suspiciousAttempts.entries()) {
      totalAttempts += attempts.length;
      if (attempts.length > 5) {
        suspiciousUsers++;
        //console.log(`🚨 مستخدم مشبوه: ${key} - ${attempts.length} محاولة`);
      }
    }
    
    //console.log(`📊 إجمالي المحاولات المشبوهة: ${totalAttempts}`);
    //console.log(`👥 مستخدمين مشبوهين: ${suspiciousUsers}`);
    //console.log(`🔒 حالة الأمان: ${suspiciousUsers === 0 ? 'آمن' : 'يحتاج مراقبة'}`);
    
    return {
      totalAttempts,
      suspiciousUsers,
      status: suspiciousUsers === 0 ? 'SAFE' : 'NEEDS_MONITORING'
    };
  }
}

// إنشاء instance واحد للمراقبة
const securityMonitor = new SecurityMonitor();

/**
 * Middleware للمراقبة الأمنية
 */
const securityMiddleware = async (req, res, next) => {
  try {
    const { pageId, senderId, companyId } = req.body || {};
    
    if (pageId && senderId && companyId) {
      const accessCheck = await securityMonitor.checkAccess(pageId, senderId, companyId);
      
      if (!accessCheck.valid) {
        return res.status(403).json({
          error: 'Access denied',
          code: accessCheck.reason,
          message: 'تم رفض الوصول لأسباب أمنية'
        });
      }
      
      // إضافة بيانات الأمان للطلب
      req.security = {
        page: accessCheck.page,
        company: accessCheck.company,
        verified: true
      };
    }
    
    next();
    
  } catch (error) {
    console.error('❌ [SECURITY-MIDDLEWARE] خطأ:', error);
    next(); // السماح بالمرور في حالة الخطأ لتجنب تعطيل النظام
  }
};

/**
 * تشغيل تقرير الأمان كل ساعة
 */
setInterval(() => {
  securityMonitor.generateSecurityReport();
}, 60 * 60 * 1000); // كل ساعة

module.exports = {
  SecurityMonitor,
  securityMonitor,
  securityMiddleware
};

