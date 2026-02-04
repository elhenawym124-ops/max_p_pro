/**
 * Timezone Detection Utility
 * يكتشف المنطقة الزمنية للمستخدم تلقائياً من المتصفح
 */

/**
 * يكتشف المنطقة الزمنية الحالية للمستخدم
 * @returns {string} المنطقة الزمنية بصيغة IANA (مثل: Africa/Cairo, Asia/Riyadh)
 */
export const detectTimezone = (): string => {
  try {
    // استخدام Intl API للحصول على المنطقة الزمنية
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (timezone && isValidTimezone(timezone)) {
      console.log('✅ [TIMEZONE] Detected timezone:', timezone);
      return timezone;
    }
    
    // إذا فشل الكشف، استخدام الافتراضي
    console.warn('⚠️ [TIMEZONE] Could not detect timezone, using default');
    return getDefaultTimezone();
  } catch (error) {
    console.error('❌ [TIMEZONE] Error detecting timezone:', error);
    return getDefaultTimezone();
  }
};

/**
 * يتحقق من صحة المنطقة الزمنية
 * @param {string} timezone - المنطقة الزمنية للتحقق منها
 * @returns {boolean} true إذا كانت صحيحة
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    // محاولة إنشاء DateTimeFormat بالمنطقة الزمنية للتحقق من صحتها
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * يعيد المنطقة الزمنية الافتراضية
 * @returns {string} المنطقة الزمنية الافتراضية (Asia/Riyadh)
 */
export const getDefaultTimezone = (): string => {
  return 'Asia/Riyadh';
};

/**
 * يحصل على معلومات المنطقة الزمنية بشكل مفصل
 * @param {string} timezone - المنطقة الزمنية (اختياري)
 * @returns {object} معلومات المنطقة الزمنية
 */
export const getTimezoneInfo = (timezone?: string) => {
  const tz = timezone || detectTimezone();
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA', {
      timeZone: tz,
      timeZoneName: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || tz;
    
    // حساب الفارق الزمني
    const offset = getTimezoneOffset(tz);
    
    return {
      timezone: tz,
      name: timeZoneName,
      offset: offset,
      offsetString: formatOffset(offset),
      currentTime: now.toLocaleString('ar-SA', { timeZone: tz })
    };
  } catch (error) {
    console.error('❌ [TIMEZONE] Error getting timezone info:', error);
    return {
      timezone: tz,
      name: tz,
      offset: 0,
      offsetString: '+00:00',
      currentTime: now.toLocaleString('ar-SA')
    };
  }
};

/**
 * يحصل على الفارق الزمني بالدقائق
 * @param {string} timezone - المنطقة الزمنية
 * @returns {number} الفارق الزمني بالدقائق
 */
export const getTimezoneOffset = (timezone: string): number => {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    return 0;
  }
};

/**
 * يحول الفارق الزمني إلى نص
 * @param {number} offset - الفارق الزمني بالدقائق
 * @returns {string} الفارق الزمني بصيغة +HH:MM
 */
export const formatOffset = (offset: number): string => {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * قائمة المناطق الزمنية الشائعة في المنطقة العربية
 */
export const COMMON_ARABIC_TIMEZONES = [
  { value: 'Asia/Riyadh', label: 'الرياض (السعودية)', offset: '+03:00' },
  { value: 'Africa/Cairo', label: 'القاهرة (مصر)', offset: '+02:00' },
  { value: 'Asia/Dubai', label: 'دبي (الإمارات)', offset: '+04:00' },
  { value: 'Asia/Kuwait', label: 'الكويت', offset: '+03:00' },
  { value: 'Asia/Bahrain', label: 'البحرين', offset: '+03:00' },
  { value: 'Asia/Qatar', label: 'قطر', offset: '+03:00' },
  { value: 'Asia/Muscat', label: 'مسقط (عمان)', offset: '+04:00' },
  { value: 'Asia/Amman', label: 'عمّان (الأردن)', offset: '+03:00' },
  { value: 'Asia/Beirut', label: 'بيروت (لبنان)', offset: '+02:00' },
  { value: 'Asia/Damascus', label: 'دمشق (سوريا)', offset: '+03:00' },
  { value: 'Asia/Baghdad', label: 'بغداد (العراق)', offset: '+03:00' },
  { value: 'Africa/Casablanca', label: 'الدار البيضاء (المغرب)', offset: '+01:00' },
  { value: 'Africa/Algiers', label: 'الجزائر', offset: '+01:00' },
  { value: 'Africa/Tunis', label: 'تونس', offset: '+01:00' },
  { value: 'Africa/Tripoli', label: 'طرابلس (ليبيا)', offset: '+02:00' },
  { value: 'Africa/Khartoum', label: 'الخرطوم (السودان)', offset: '+02:00' },
];
