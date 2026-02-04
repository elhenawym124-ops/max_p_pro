/**
 * Performance Configuration
 * إعدادات تحسين الأداء للسرفر الأساسي
 */

// إعدادات التحميل المؤجل للخدمات
const PERFORMANCE_CONFIG = {
  // تأجيل تحميل خدمات الذكاء الصناعي
  LAZY_LOAD_AI_SERVICES: true,
  
  // ❌ REMOVED: Pattern Services - Pattern System removed
  
  // تقليل عدد الاتصالات بقاعدة البيانات
  REDUCE_DB_CONNECTIONS: true,
  
  // تحميل سريع للخدمات الأساسية فقط
  FAST_STARTUP_MODE: true,
  
  // فترة إنتظار لبدء الخدمات الثقيلة (بالثواني)
  HEAVY_SERVICES_DELAY: 10
};

module.exports = PERFORMANCE_CONFIG;