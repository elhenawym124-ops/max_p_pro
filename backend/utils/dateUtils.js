/**
 * 📅 Date Utilities for Egypt Timezone
 * جميع دوال التاريخ والوقت مضبوطة على توقيت مصر (Africa/Cairo)
 */

const EGYPT_TIMEZONE = 'Africa/Cairo';

/**
 * الحصول على التاريخ الحالي بتوقيت مصر
 */
function getNowInEgypt() {
  return getNowInTimezone(EGYPT_TIMEZONE);
}

/**
 * الحصول على التاريخ الحالي في منطقة زمنية محددة
 */
function getNowInTimezone(timezone = EGYPT_TIMEZONE) {
  // Create a date object
  const now = new Date();

  // Format it to the target timezone string
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const dateObj = {};
  parts.forEach(p => dateObj[p.type] = p.value);

  // Create new Date object matching the wall-clock time in that timezone
  // Note: This constructs a date that "looks like" the local time but is stored as UTC or local system time depending on usage.
  // Ideally we should handle timestamps carefully. 
  // But following the existing pattern of getStartOfDayInEgypt:

  // Construct ISO string YYYY-MM-DDTHH:mm:ss.sss
  const isoString = `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}.000`;

  // We return a Date object that represents this "wall clock" time.
  // Warning: This physically shifts the time to match the string representation.
  return new Date(isoString);
}

/**
 * الحصول على بداية اليوم بتوقيت مصر
 */
function getStartOfDayInEgypt(date = new Date()) {
  return getStartOfDayInTimezone(date, EGYPT_TIMEZONE);
}

/**
 * الحصول على بداية اليوم في منطقة زمنية محددة
 */
function getStartOfDayInTimezone(date = new Date(), timezone = EGYPT_TIMEZONE) {
  const d = new Date(date);
  // Get date string (YYYY-MM-DD) in Target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(d);
  // Create UTC date at midnight for this day
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * الحصول على نهاية اليوم بتوقيت مصر
 */
function getEndOfDayInEgypt(date = new Date()) {
  return getEndOfDayInTimezone(date, EGYPT_TIMEZONE);
}

/**
 * الحصول على نهاية اليوم في منطقة زمنية محددة
 */
function getEndOfDayInTimezone(date = new Date(), timezone = EGYPT_TIMEZONE) {
  // Use start of day for the timezone, then add to 23:59:59.999
  const start = getStartOfDayInTimezone(date, timezone);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * تحويل تاريخ إلى بداية اليوم
 */
function toStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * تحويل تاريخ إلى نهاية اليوم
 */
function toEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * دمج تاريخ مع وقت (HH:mm)
 */
function combineDateAndTime(date, timeString) {
  if (!timeString || !timeString.trim()) {
    return null;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * تنسيق التاريخ والوقت للعرض بالعربية
 */
function formatDateTimeArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق الوقت فقط للعرض بالعربية
 */
function formatTimeArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleTimeString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق التاريخ فقط للعرض بالعربية
 */
function formatDateArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * الحصول على مدى تاريخي (من تاريخ إلى تاريخ)
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const start = toStartOfDay(new Date(startDate));
  const end = toStartOfDay(new Date(endDate));

  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * حساب الفرق بالدقائق بين تاريخين
 */
function getDifferenceInMinutes(date1, date2) {
  return Math.floor((date2 - date1) / 60000);
}

/**
 * حساب الفرق بالساعات بين تاريخين
 */
function getDifferenceInHours(date1, date2) {
  return (date2 - date1) / 3600000;
}

/**
 * التحقق من أن التاريخ هو اليوم
 */
function isToday(date) {
  const today = getStartOfDayInEgypt();
  const checkDate = getStartOfDayInEgypt(date);
  return today.getTime() === checkDate.getTime();
}

/**
 * إضافة أيام لتاريخ معين
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * إضافة ساعات لتاريخ معين
 */
function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * إضافة دقائق لتاريخ معين
 */
function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

module.exports = {
  EGYPT_TIMEZONE,
  // Generic Timezone Functions
  getNowInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  // Legacy Egypt Wrappers
  getNowInEgypt,
  getStartOfDayInEgypt,
  getEndOfDayInEgypt,
  toStartOfDay,
  toEndOfDay,
  combineDateAndTime,
  formatDateTimeArabic,
  formatTimeArabic,
  formatDateArabic,
  getDateRange,
  getDifferenceInMinutes,
  getDifferenceInHours,
  isToday,
  addDays,
  addHours,
  addMinutes
};
