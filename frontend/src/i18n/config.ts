import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import arTranslation from '../locales/ar/translation.json';
import enTranslation from '../locales/en/translation.json';
import { getBackendUrl } from '../config/environment';

// قائمة الدول العربية
const ARABIC_COUNTRIES = [
  'EG', // مصر
  'SA', // السعودية
  'AE', // الإمارات
  'KW', // الكويت
  'QA', // قطر
  'BH', // البحرين
  'OM', // عمان
  'JO', // الأردن
  'LB', // لبنان
  'SY', // سوريا
  'IQ', // العراق
  'YE', // اليمن
  'PS', // فلسطين
  'LY', // ليبيا
  'TN', // تونس
  'DZ', // الجزائر
  'MA', // المغرب
  'SD', // السودان
  'SO', // الصومال
  'DJ', // جيبوتي
  'KM', // جزر القمر
  'MR', // موريتانيا
];

// دالة للكشف عن الدولة من خلال IP
const detectCountryByIP = async (): Promise<string | null> => {
  try {
    // Prefer backend endpoint to avoid leaking user IP/location to third-party services from the browser
    const response = await fetch(`${getBackendUrl()}/api/geolocation/detect`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result?.data?.countryCode || null;
  } catch (error) {
    // Silence in production to avoid noisy logs; language will fallback
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.error('Error detecting country:', error);
    }
    return null;
  }
};

// دالة لتحديد اللغة بناءً على الدولة
const getLanguageByCountry = async (): Promise<string> => {
  // أولاً، تحقق من اللغة المحفوظة في localStorage
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    return savedLanguage;
  }

  // إذا لم تكن هناك لغة محفوظة، اكتشف الدولة
  const countryCode = await detectCountryByIP();
  
  if (countryCode && ARABIC_COUNTRIES.includes(countryCode)) {
    return 'ar';
  }
  
  return 'en';
};

// إعداد i18n - تهيئة متزامنة أولية
const savedLanguage = localStorage.getItem('language');
const initialLanguage = savedLanguage || 'ar';

// تهيئة i18n متزامنة أولية (لضمان جاهزية الترجمات عند التحميل الأول)
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: arTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    lng: initialLanguage,
    fallbackLng: 'ar',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// تطبيق اتجاه النص
document.documentElement.dir = initialLanguage === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = initialLanguage;

// إذا لم تكن هناك لغة محفوظة، اكتشف الدولة وتحديث اللغة إذا لزم الأمر
if (!savedLanguage) {
  getLanguageByCountry().then((detectedLanguage) => {
    if (detectedLanguage !== initialLanguage) {
      i18n.changeLanguage(detectedLanguage);
      localStorage.setItem('language', detectedLanguage);
      document.documentElement.dir = detectedLanguage === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = detectedLanguage;
    }
  });
}

// دالة لتغيير اللغة
export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem('language', language);
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  // إعادة تحميل الصفحة لتطبيق التغييرات على جميع المكونات
  window.location.reload();
};

export default i18n;
