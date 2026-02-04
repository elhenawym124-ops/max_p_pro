// frontend/src/utils/dateFormat.ts
// Date formatting utilities with Gregorian calendar support

export type DateFormatType = 'gregorian';

export interface DateFormatOptions {
  format: DateFormatType;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
}

// Default date format options
export const DEFAULT_DATE_FORMAT: DateFormatType = 'gregorian';

// Date format configurations
export const DATE_FORMAT_CONFIGS = {
  gregorian: {
    locale: 'ar-EG', // Arabic locale with Gregorian calendar
    options: {
      year: 'numeric' as const,
      month: 'long' as const,
      day: 'numeric' as const,
      calendar: 'gregory' as const
    }
  }
};

// Format date based on the specified format type
export const formatDate = (
  date: Date | string | number,
  formatType: DateFormatType = DEFAULT_DATE_FORMAT,
  customOptions?: Intl.DateTimeFormatOptions
): string => {
  try {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'تاريخ غير صحيح';
    }

    const config = DATE_FORMAT_CONFIGS[formatType];
    const options = customOptions || (config.options as Intl.DateTimeFormatOptions);

    // Apply timezone if provided
    const finalOptions: Intl.DateTimeFormatOptions = { ...options };
    if (customOptions?.timeZone) {
      finalOptions.timeZone = customOptions.timeZone;
    }

    return dateObj.toLocaleDateString(config.locale, finalOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'تاريخ غير صحيح';
  }
};

// Format time
export const formatTime = (
  date: Date | string | number,
  locale: string = 'ar-EG'
): string => {
  try {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'وقت غير صحيح';
    }

    return dateObj.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: typeof date === 'string' || typeof date === 'number' || date instanceof Date ? undefined : (date as any).timeZone
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'وقت غير صحيح';
  }
};

// Format time with explicit timezone support
export const formatTimeWithZone = (
  date: Date | string | number,
  timezone?: string,
  locale: string = 'ar-EG'
): string => {
  try {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'وقت غير صحيح';
    }

    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    if (timezone) {
      options.timeZone = timezone;
    }

    return dateObj.toLocaleTimeString(locale, options);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'وقت غير صحيح';
  }
};

// Format date and time together
export const formatDateTime = (
  date: Date | string | number,
  formatType: DateFormatType = DEFAULT_DATE_FORMAT
): string => {
  const formattedDate = formatDate(date, formatType);
  const formattedTime = formatTime(date);

  return `${formattedDate} - ${formattedTime}`;
};

// Get relative time (time ago)
export const getTimeAgo = (date: Date | string | number): string => {
  try {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    if (diffWeeks < 4) return `منذ ${diffWeeks} أسبوع`;
    if (diffMonths < 12) return `منذ ${diffMonths} شهر`;

    const diffYears = Math.floor(diffMonths / 12);
    return `منذ ${diffYears} سنة`;
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return 'منذ وقت غير محدد';
  }
};

// Date format display names for UI
export const DATE_FORMAT_LABELS = {
  gregorian: 'ميلادي (Gregorian)'
};

// Validate date format type
export const isValidDateFormat = (format: string): format is DateFormatType => {
  return format === 'gregorian';
};

// Get current date in specified format
export const getCurrentDate = (formatType: DateFormatType = DEFAULT_DATE_FORMAT): string => {
  return formatDate(new Date(), formatType);
};

// Parse date format from company settings
export const parseDateFormatFromSettings = (settings: any): DateFormatType => {
  if (settings?.dateFormat && isValidDateFormat(settings.dateFormat)) {
    return settings.dateFormat;
  }
  return DEFAULT_DATE_FORMAT;
};
