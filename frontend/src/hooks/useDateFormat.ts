// frontend/src/hooks/useDateFormat.ts
// Hook for managing date format preferences

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuthSimple';
import { companyAwareApi } from '../services/companyAwareApi';
import {
  DateFormatType,
  DEFAULT_DATE_FORMAT,
  formatDate,
  formatTime,
  formatDateTime,
  getTimeAgo,
  parseDateFormatFromSettings
} from '../utils/dateFormat';

interface UseDateFormatReturn {
  dateFormat: DateFormatType;
  setDateFormat: (format: DateFormatType) => Promise<void>;
  formatDate: (date: Date | string | number) => string;
  formatTime: (date: Date | string | number) => string;
  formatDateTime: (date: Date | string | number) => string;
  getTimeAgo: (date: Date | string | number) => string;
  isLoading: boolean;
  error: string | null;
}

export const useDateFormat = (): UseDateFormatReturn => {
  const { user } = useAuth();
  const [dateFormat, setDateFormatState] = useState<DateFormatType>(DEFAULT_DATE_FORMAT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch company date format preference
  const fetchDateFormat = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await companyAwareApi.getCurrentCompany();
      const data = response.data;

      if (data.success) {
        const format = parseDateFormatFromSettings(data.data?.settings);
        setDateFormatState(format);
      } else {
        console.warn('Failed to fetch company date format, using default');
        setDateFormatState(DEFAULT_DATE_FORMAT);
      }
    } catch (err) {
      console.warn('Error fetching date format:', err);
      setDateFormatState(DEFAULT_DATE_FORMAT);
      setError('فشل في تحميل إعدادات التاريخ');
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId]);

  // Update date format preference
  const setDateFormat = useCallback(async (format: DateFormatType) => {
    if (!user?.companyId) {
      setError('لا يمكن تحديث الإعدادات بدون تسجيل الدخول');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await companyAwareApi.put(`/companies/current/date-format`, {
        dateFormat: format
      });

      if (response.data.success) {
        setDateFormatState(format);
        // Store in localStorage for immediate use
        localStorage.setItem('dateFormat', format);
      } else {
        setError(response.data.error || 'فشل في تحديث تنسيق التاريخ');
      }
    } catch (err: any) {
      console.error('Error updating date format:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحديث تنسيق التاريخ');
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId]);

  // Load date format on mount
  useEffect(() => {
    // Always use Gregorian format
    setDateFormatState('gregorian');

    // Then fetch from server (will also be Gregorian)
    fetchDateFormat();
  }, [fetchDateFormat]);

  // Wrapper functions that use the current date format
  const formatDateWrapper = useCallback((date: Date | string | number) => {
    return formatDate(date, dateFormat);
  }, [dateFormat]);

  const formatTimeWrapper = useCallback((date: Date | string | number) => {
    return formatTime(date);
  }, []);

  const formatDateTimeWrapper = useCallback((date: Date | string | number) => {
    return formatDateTime(date, dateFormat);
  }, [dateFormat]);

  const getTimeAgoWrapper = useCallback((date: Date | string | number) => {
    return getTimeAgo(date);
  }, []);

  return {
    dateFormat,
    setDateFormat,
    formatDate: formatDateWrapper,
    formatTime: formatTimeWrapper,
    formatDateTime: formatDateTimeWrapper,
    getTimeAgo: getTimeAgoWrapper,
    isLoading,
    error
  };
};
