/**
 * Smart Environment Configuration System
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً
 */

interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  appUrl: string;
  backendUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  environment: 'development' | 'production';
  googleMapsApiKey: string;
}

/**
 * كشف البيئة الحالية بناءً على hostname
 */
const detectEnvironment = (): 'development' | 'production' => {
  const hostname = window.location.hostname;

  // إذا كان localhost أو IP محلي = بيئة تطوير
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.endsWith('.local')
  ) {
    return 'development';
  }

  // أي شيء آخر = بيئة إنتاج
  return 'production';
};

/**
 * إنشاء إعدادات البيئة الذكية
 */
const createEnvironmentConfig = (): EnvironmentConfig => {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  let apiUrl: string;
  let wsUrl: string;
  let appUrl: string;
  let backendUrl: string;

  if (isDevelopment) {
    // إعدادات بيئة التطوير
    const backendPort = 3010;
    const frontendPort = window.location.port || '3000';
    const devHost = window.location.hostname || 'localhost';

    apiUrl = `http://${devHost}:${backendPort}/api/v1`;
    wsUrl = `ws://${devHost}:${backendPort}`;
    appUrl = `http://${devHost}:${frontendPort}`;
    backendUrl = `http://${devHost}:${backendPort}`;
  } else {
    const currentOrigin = window.location.origin;
    const isSecure = window.location.protocol === 'https:';

    // إعدادات بيئة الإنتاج - استخدام النطاق الحالي ديناميكياً لتجنب مشاكل CORS
    let productionDomain = currentOrigin.includes('maxp-ai.pro')
      ? currentOrigin
      : 'https://maxp-ai.pro';

    // التأكد من استخدام https في الإنتاج إذا كان الموقع يعمل بـ https
    if (isSecure && productionDomain.startsWith('http:')) {
      productionDomain = productionDomain.replace('http:', 'https:');
    }

    apiUrl = `${productionDomain}/api/v1`;
    // استخدام wss للنطاق الحالي
    const wsHost = window.location.host;
    wsUrl = isSecure ? `wss://${wsHost}` : `ws://${wsHost}`;

    appUrl = productionDomain;
    backendUrl = productionDomain;
  }

  return {
    apiUrl,
    wsUrl,
    appUrl,
    backendUrl,
    isDevelopment,
    isProduction,
    environment,
    googleMapsApiKey: (import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string) || ''
  };
};

// إنشاء إعدادات البيئة
export const envConfig = createEnvironmentConfig();
console.log('🌍 [ENV] Detected Environment:', envConfig.environment, 'API:', envConfig.apiUrl, 'WS:', envConfig.wsUrl);

// تسجيل معلومات البيئة في الكونسول
if (import.meta.env.DEV || import.meta.env.MODE === 'development') {

  console.debug('🌍 [ENV-CONFIG] Environment Detection:', {

    hostname: window.location.hostname,

    environment: envConfig.environment,

    apiUrl: envConfig.apiUrl,

    wsUrl: envConfig.wsUrl,

    appUrl: envConfig.appUrl,

    backendUrl: envConfig.backendUrl

  });

}



// تصدير دوال مساعدة

export const isLocal = () => envConfig.isDevelopment;

export const isProduction = () => envConfig.isProduction;

export const getApiUrl = () => envConfig.apiUrl;

export const getWsUrl = () => envConfig.wsUrl;

export const getAppUrl = () => envConfig.appUrl;

export const getBackendUrl = () => envConfig.backendUrl;



export default envConfig;