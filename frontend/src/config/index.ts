/**
 * Frontend Configuration
 * 
 * Centralized configuration for the frontend application
 */

import { envConfig } from './environment';

// Environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

export const config = {
  // API Configuration - استخدام النظام الذكي
  apiUrl: envConfig.apiUrl,
  wsUrl: envConfig.wsUrl,
  appUrl: envConfig.appUrl,
  backendUrl: envConfig.backendUrl,

  // App Information
  app: {
    name: getEnvVar('REACT_APP_APP_NAME', 'Communication Platform'),
    version: getEnvVar('REACT_APP_APP_VERSION', '1.0.0'),
    company: getEnvVar('REACT_APP_COMPANY_NAME', 'Your Company'),
  },

  // Environment
  env: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // Feature Flags
  features: {
    aiFeatures: getEnvVar('REACT_APP_ENABLE_AI_FEATURES', 'true') === 'true',
    ecommerce: getEnvVar('REACT_APP_ENABLE_ECOMMERCE', 'true') === 'true',
    analytics: getEnvVar('REACT_APP_ENABLE_ANALYTICS', 'true') === 'true',
    notifications: getEnvVar('REACT_APP_ENABLE_NOTIFICATIONS', 'true') === 'true',
    realTime: getEnvVar('REACT_APP_ENABLE_REAL_TIME', 'true') === 'true',
    pwa: getEnvVar('REACT_APP_ENABLE_PWA', 'true') === 'true',
  },

  // External Services
  facebook: {
    appId: getEnvVar('REACT_APP_FACEBOOK_APP_ID'),
  },

  google: {
    mapsApiKey: getEnvVar('REACT_APP_GOOGLE_MAPS_API_KEY'),
  },

  // Payment Gateways
  payment: {
    stripe: {
      publishableKey: getEnvVar('REACT_APP_STRIPE_PUBLISHABLE_KEY'),
    },
    paypal: {
      clientId: getEnvVar('REACT_APP_PAYPAL_CLIENT_ID'),
    },
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(getEnvVar('REACT_APP_MAX_FILE_SIZE', '10485760'), 10), // 10MB
    allowedTypes: getEnvVar(
      'REACT_APP_ALLOWED_FILE_TYPES',
      'image/jpeg,image/png,image/gif,application/pdf'
    ).split(','),
  },

  // Theme
  theme: {
    default: getEnvVar('REACT_APP_DEFAULT_THEME', 'light') as 'light' | 'dark' | 'system',
    primaryColor: getEnvVar('REACT_APP_PRIMARY_COLOR', '#3B82F6'),
    secondaryColor: getEnvVar('REACT_APP_SECONDARY_COLOR', '#10B981'),
  },

  // Localization
  i18n: {
    defaultLanguage: getEnvVar('REACT_APP_DEFAULT_LANGUAGE', 'ar'),
    supportedLanguages: getEnvVar('REACT_APP_SUPPORTED_LANGUAGES', 'ar,en').split(','),
  },

  // Analytics
  analytics: {
    googleAnalyticsId: getEnvVar('REACT_APP_GOOGLE_ANALYTICS_ID'),
    mixpanelToken: getEnvVar('REACT_APP_MIXPANEL_TOKEN'),
  },

  // Error Tracking
  sentry: {
    dsn: getEnvVar('REACT_APP_SENTRY_DSN'),
  },

  // Development
  debug: {
    enabled: getEnvVar('REACT_APP_DEBUG_MODE', 'false') === 'true',
    logLevel: getEnvVar('REACT_APP_LOG_LEVEL', 'info'),
  },

  // Cache
  cache: {
    duration: parseInt(getEnvVar('REACT_APP_CACHE_DURATION', '300000'), 10), // 5 minutes
  },

  // Real-time
  realTime: {
    heartbeatInterval: parseInt(getEnvVar('REACT_APP_HEARTBEAT_INTERVAL', '30000'), 10), // 30 seconds
  },

  // PWA
  pwa: {
    name: getEnvVar('REACT_APP_PWA_NAME', 'Communication Platform'),
    shortName: getEnvVar('REACT_APP_PWA_SHORT_NAME', 'CommPlatform'),
  },

  // API Endpoints
  endpoints: {
    auth: '/auth',
    users: '/users',
    companies: '/companies',
    customers: '/customers',
    conversations: '/conversations',
    messages: '/messages',
    products: '/products',
    orders: '/orders',
    reports: '/reports',
    notifications: '/notifications',
    uploads: '/uploads',
    ai: '/ai',
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Date/Time
  dateTime: {
    format: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'YYYY-MM-DD HH:mm',
    timezone: 'Asia/Riyadh',
  },

  // Validation
  validation: {
    passwordMinLength: 8,
    phoneRegex: /^[\+]?[1-9][\d]{0,15}$/,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // UI
  ui: {
    sidebarWidth: 256,
    headerHeight: 64,
    mobileBreakpoint: 768,
    animationDuration: 200,
  },
} as const;

// Validate required configuration
const validateConfig = (): void => {
  // Note: REACT_APP_API_URL is optional - the app uses smart environment detection
  // from environment.ts which automatically detects the API URL based on hostname
  // Only validate truly required variables here
  const requiredVars: string[] = [
    // Add any truly required environment variables here
    // REACT_APP_API_URL is not required due to smart detection
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
  }

  // Log configuration in development
  if (config.isDev && config.debug.enabled) {
    console.log('App Configuration:', {
      ...config,
      // Don't log sensitive data
      payment: '[HIDDEN]',
      analytics: '[HIDDEN]',
      sentry: '[HIDDEN]',
    });
  }
};

// Validate configuration on load
validateConfig();

export default config;
