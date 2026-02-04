/**
 * Geolocation Utilities
 * دوال مساعدة للتعامل مع المواقع الجغرافية
 */

/**
 * حساب المسافة بين نقطتين جغرافيتين باستخدام Haversine Formula
 * Calculate distance between two geographic points using Haversine Formula
 * 
 * @param {number} lat1 - خط العرض للنقطة الأولى (Latitude of first point)
 * @param {number} lon1 - خط الطول للنقطة الأولى (Longitude of first point)
 * @param {number} lat2 - خط العرض للنقطة الثانية (Latitude of second point)
 * @param {number} lon2 - خط الطول للنقطة الثانية (Longitude of second point)
 * @returns {number} - المسافة بالمتر (Distance in meters)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  // نصف قطر الأرض بالمتر
  // Earth's radius in meters
  const R = 6371e3;

  // تحويل الدرجات إلى راديان
  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // المسافة بالمتر
  // Distance in meters
  const distance = R * c;

  return distance;
}

/**
 * التحقق من وجود موقع داخل نطاق معين
 * Check if a location is within a specific radius
 * 
 * @param {number} userLat - خط عرض الموظف (User latitude)
 * @param {number} userLon - خط طول الموظف (User longitude)
 * @param {number} officeLat - خط عرض المكتب (Office latitude)
 * @param {number} officeLon - خط طول المكتب (Office longitude)
 * @param {number} radius - نصف القطر المسموح بالمتر (Allowed radius in meters)
 * @returns {Object} - نتيجة التحقق (Validation result)
 */
function isWithinGeofence(userLat, userLon, officeLat, officeLon, radius) {
  const distance = calculateDistance(userLat, userLon, officeLat, officeLon);
  
  return {
    isWithin: distance <= radius,
    distance: Math.round(distance),
    allowedRadius: radius,
    message: distance <= radius 
      ? `داخل النطاق المسموح (${Math.round(distance)} متر)`
      : `خارج النطاق المسموح (${Math.round(distance)} متر من ${radius} متر)`
  };
}

/**
 * تنسيق رسالة خطأ عند البصمة خارج النطاق
 * Format error message for out-of-range attendance
 * 
 * @param {number} distance - المسافة الحالية (Current distance)
 * @param {number} allowedRadius - النطاق المسموح (Allowed radius)
 * @returns {string} - رسالة الخطأ (Error message)
 */
function formatGeofenceError(distance, allowedRadius) {
  const roundedDistance = Math.round(distance);
  const extraDistance = roundedDistance - allowedRadius;
  
  return `أنت خارج النطاق المسموح للبصمة.\n` +
         `المسافة الحالية: ${roundedDistance} متر\n` +
         `المسافة المسموحة: ${allowedRadius} متر\n` +
         `يجب أن تقترب ${extraDistance} متر من المكتب للبصمة.`;
}

/**
 * التحقق من صحة الإحداثيات الجغرافية
 * Validate geographic coordinates
 * 
 * @param {number} lat - خط العرض (Latitude)
 * @param {number} lon - خط الطول (Longitude)
 * @returns {boolean} - صحة الإحداثيات (Validity)
 */
function isValidCoordinates(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

module.exports = {
  calculateDistance,
  isWithinGeofence,
  formatGeofenceError,
  isValidCoordinates
};
