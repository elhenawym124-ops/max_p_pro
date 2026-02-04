const express = require('express');
const router = express.Router();
const axios = require('axios');

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

/**
 * GET /api/geolocation/detect
 * كشف الدولة واللغة المناسبة بناءً على IP
 */
router.get('/detect', async (req, res) => {
  try {
    // الحصول على IP من الطلب
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress;

    // في حالة التطوير المحلي
    if (clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'localhost') {
      return res.json({
        success: true,
        data: {
          countryCode: 'EG', // افتراضي لمصر في التطوير المحلي
          countryName: 'Egypt',
          language: 'ar',
          isArabicCountry: true,
        },
      });
    }

    // استخدام API مجاني للكشف عن الموقع الجغرافي
    let geoData;
    try {
      // محاولة استخدام ipapi.co
      const response = await axios.get(`https://ipapi.co/${clientIP}/json/`, {
        timeout: 5000,
      });
      geoData = response.data;
    } catch (error) {
      // إذا فشلت المحاولة، استخدم القيمة الافتراضية (تجنب fallback غير مشفر HTTP)
      return res.json({
        success: true,
        data: {
          countryCode: 'EG',
          countryName: 'Egypt',
          language: 'ar',
          isArabicCountry: true,
          note: 'Using default values due to geolocation API failure',
        },
      });
    }

    const countryCode = geoData.country_code || geoData.countryCode;
    const countryName = geoData.country_name || geoData.country;
    const isArabicCountry = ARABIC_COUNTRIES.includes(countryCode);
    const language = isArabicCountry ? 'ar' : 'en';

    res.json({
      success: true,
      data: {
        countryCode,
        countryName,
        language,
        isArabicCountry,
      },
    });
  } catch (error) {
    console.error('Error detecting geolocation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect geolocation',
      error: error.message,
    });
  }
});

/**
 * GET /api/geolocation/countries
 * الحصول على قائمة الدول العربية
 */
router.get('/countries', (req, res) => {
  res.json({
    success: true,
    data: {
      arabicCountries: ARABIC_COUNTRIES,
      count: ARABIC_COUNTRIES.length,
    },
  });
});

module.exports = router;
