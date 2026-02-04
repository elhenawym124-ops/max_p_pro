/**
 * 🕐 Shift Utilities
 * دوال مساعدة مشتركة لنظام المناوبات
 */

/**
 * حساب ساعات العمل الصافية
 */
export const calculateWorkHours = (
  startTime: string,
  endTime: string,
  breakDuration: number
): string => {
  if (!startTime || !endTime) return '0.0';

  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);

  if (startParts.length < 2 || endParts.length < 2) return '0.0';

  const startHour = startParts[0] || 0;
  const startMin = startParts[1] || 0;
  const endHour = endParts[0] || 0;
  const endMin = endParts[1] || 0;

  let startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;

  // Handle overnight shifts
  if (endTotal < startTotal) endTotal += 24 * 60;

  const totalMinutes = endTotal - startTotal - breakDuration;
  return (totalMinutes / 60).toFixed(1);
};

/**
 * تنسيق التاريخ بالعربية
 */
export const formatArabicDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * تنسيق التاريخ المختصر
 */
export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * التحقق من صحة الوقت
 */
export const isValidTime = (time: string): boolean => {
  if (!time) return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * التحقق من منطقية أوقات المناوبة
 */
export const validateShiftTimes = (
  startTime: string,
  endTime: string,
  breakDuration: number
): { valid: boolean; error?: string } => {
  if (!isValidTime(startTime)) {
    return { valid: false, error: 'وقت البدء غير صحيح' };
  }

  if (!isValidTime(endTime)) {
    return { valid: false, error: 'وقت الانتهاء غير صحيح' };
  }

  if (breakDuration < 0 || breakDuration > 480) {
    return { valid: false, error: 'مدة الراحة يجب أن تكون بين 0 و 480 دقيقة' };
  }

  const hours = parseFloat(calculateWorkHours(startTime, endTime, breakDuration));
  if (hours <= 0) {
    return { valid: false, error: 'ساعات العمل يجب أن تكون أكبر من صفر' };
  }

  if (hours > 24) {
    return { valid: false, error: 'ساعات العمل لا يمكن أن تتجاوز 24 ساعة' };
  }

  return { valid: true };
};

/**
 * توليد نطاق تواريخ
 */
export const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = new Date(d).toISOString().split('T')[0];
    if (dateStr) {
      dates.push(dateStr);
    }
  }

  return dates;
};

/**
 * التحقق من تعارض المناوبات
 */
export const detectShiftConflict = (
  existingAssignments: Array<{ date: string; user?: { id: string } }>,
  newUserId: string,
  newDate: string
): boolean => {
  return existingAssignments.some(
    (assignment) =>
      assignment.user?.id === newUserId &&
      assignment.date.split('T')[0] === newDate
  );
};

/**
 * تجميع التعيينات حسب التاريخ
 */
export const groupAssignmentsByDate = (
  assignments: Array<{ date: string; user: any }>
): Record<string, Array<{ date: string; user: any }>> => {
  return assignments.reduce((acc, assignment) => {
    const date = assignment.date.split('T')[0];
    if (date) {
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(assignment);
    }
    return acc;
  }, {} as Record<string, Array<{ date: string; user: any }>>);
};

/**
 * حساب إحصائيات المناوبة
 */
export const calculateShiftStats = (shift: {
  startTime: string;
  endTime: string;
  breakDuration: number;
  _count?: { assignments: number };
}) => {
  const workHours = calculateWorkHours(
    shift.startTime,
    shift.endTime,
    shift.breakDuration
  );
  const totalAssignments = shift._count?.assignments || 0;

  return {
    workHours,
    totalAssignments,
    breakHours: (shift.breakDuration / 60).toFixed(1)
  };
};

/**
 * قوالب المناوبات الجاهزة
 */
export const SHIFT_TEMPLATES = [
  {
    id: 'morning',
    name: 'صباحي',
    startTime: '08:00',
    endTime: '16:00',
    breakDuration: 60,
    color: '#3B82F6',
    icon: '☀️',
    description: '8 ساعات - من الصباح حتى العصر'
  },
  {
    id: 'evening',
    name: 'مسائي',
    startTime: '16:00',
    endTime: '00:00',
    breakDuration: 60,
    color: '#F59E0B',
    icon: '🌆',
    description: '8 ساعات - من العصر حتى منتصف الليل'
  },
  {
    id: 'night',
    name: 'ليلي',
    startTime: '00:00',
    endTime: '08:00',
    breakDuration: 60,
    color: '#6366F1',
    icon: '🌙',
    description: '8 ساعات - من منتصف الليل حتى الصباح'
  },
  {
    id: 'fullday',
    name: 'دوام كامل',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    color: '#10B981',
    icon: '📅',
    description: '8 ساعات - دوام رسمي'
  },
  {
    id: 'split',
    name: 'مقسّم',
    startTime: '08:00',
    endTime: '14:00',
    breakDuration: 30,
    color: '#EC4899',
    icon: '⏰',
    description: '6 ساعات - دوام قصير'
  }
] as const;

/**
 * ألوان المناوبات الافتراضية
 */
export const SHIFT_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1'  // Indigo
] as const;
