/**
 * Smart Environment Configuration System for Backend
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً للخادم الخلفي
 */

const detectEnvironment = () => {
  // فحص متغيرات البيئة أولاً
  if (process.env.NODE_ENV === 'production') {
    console.log('production');
    return 'production';
  }

  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }

  // فحص الـ hostname أو المنافذ
  const port = process.env.PORT || '3001';

  // إذا كان المنفذ محلي أو في نطاق التطوير
  if (port === '3001' || port === '3001' || process.env.NODE_ENV !== 'production') {
    return 'development';
  }

  return 'production';
};

const createEnvironmentConfig = () => {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  let frontendUrl;
  let backendUrl;
  let apiBaseUrl;
  let wsUrl;

  if (isDevelopment) {
    // إعدادات بيئة التطوير
    const backendPort = process.env.PORT || '3010';
    const frontendPort = '3008';

    frontendUrl = `http://localhost:${frontendPort}`;
    backendUrl = `http://localhost:${backendPort}`;
    apiBaseUrl = `http://localhost:${backendPort}/api/v1`;
    wsUrl = `ws://localhost:${backendPort}`;
  } else {
    // إعدادات بيئة الإنتاج - استخدام النطاق بدون www كافتراضي لتقليل مشاكل CORS
    // أو يمكن استخدام النطاق الذي جاء منه الطلب
    const productionDomain = 'https://maxp-ai.pro';
    const productionDomainWWW = 'https://www.maxp-ai.pro';

    frontendUrl = productionDomain;
    backendUrl = productionDomain;
    apiBaseUrl = `${productionDomain}/api/v1`;
    wsUrl = `wss://maxp-ai.pro`;
  }

  return {
    environment,
    isDevelopment,
    isProduction,
    frontendUrl,
    backendUrl,
    apiBaseUrl,
    wsUrl,

    // CORS Origins - Allow both www, non-www, and all subdomains
    // Using function to dynamically validate origins
    corsOrigins: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        'http://localhost:3008',
        'http://localhost:3000',
        'https://maxp-ai.pro',
        'https://maxp-ai.pro',
        'https://www.maxp-ai.pro',
        /^https:\/\/[a-zA-Z0-9-]+\.mokhtarelhenawy\.online$/ // All subdomains
      ];

      const isAllowed = allowedPatterns.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return pattern === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn('🚫 [CORS] Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },

    // Database Configuration
    database: {
      // يمكن إضافة إعدادات قاعدة البيانات حسب البيئة
      ssl: isProduction,
      logging: isDevelopment
    }
  };
};

// إنشاء إعدادات البيئة
const envConfig = createEnvironmentConfig();

// تسجيل معلومات البيئة
console.log('🌍 [BACKEND-ENV] Environment Detection:', {
  environment: envConfig.environment,
  frontendUrl: envConfig.frontendUrl,
  backendUrl: envConfig.backendUrl,
  apiBaseUrl: envConfig.apiBaseUrl,
  corsOrigins: envConfig.corsOrigins
});

module.exports = envConfig;