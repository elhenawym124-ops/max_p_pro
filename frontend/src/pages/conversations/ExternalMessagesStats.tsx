import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';
import { useAuth } from '../../hooks/useAuthSimple';

interface ConversationInfo {
  id: string;
  customerName: string;
  customerId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

interface ExternalMessagesStats {
  date: string;
  totalMessages: number;
  uniqueConversations: number;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  conversations?: ConversationInfo[];
}

const ExternalMessagesStats: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [stats, setStats] = useState<ExternalMessagesStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        buildApiUrl(`conversations/external-messages/stats?date=${selectedDate}`),
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في جلب الإحصائيات');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'فشل في جلب الإحصائيات');
      }
    } catch (err: any) {
      console.error('Error fetching external messages stats:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الإحصائيات');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const maxHourlyCount = stats
    ? Math.max(...stats.hourlyDistribution.map((h) => h.count), 1)
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            إحصائيات الرسائل الخارجية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            عرض عدد الرسائل المرسلة من مواقع خارجية (بدون اسم موظف) في تاريخ محدد
          </p>
        </div>

        {/* Date Picker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <label htmlFor="date-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                اختر التاريخ:
              </label>
              <input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
              />
              تحديث
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">جاري جلب الإحصائيات...</p>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Total Messages Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      إجمالي الرسائل الخارجية
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.totalMessages.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Unique Conversations Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      عدد المحادثات المختلفة
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.uniqueConversations.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <ChartBarIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Conversations List */}
            {stats.conversations && stats.conversations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  المحادثات ({stats.conversations.length})
                </h2>
                <div className="space-y-3">
                  {stats.conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-blue-100 rounded-full p-2">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {conversation.customerName}
                          </p>
                          {conversation.customerEmail && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {conversation.customerEmail}
                            </p>
                          )}
                          {conversation.customerPhone && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {conversation.customerPhone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {conversation.id.slice(0, 8)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly Distribution Chart */}
            {stats.hourlyDistribution && stats.hourlyDistribution.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  توزيع الرسائل حسب الوقت
                </h2>
                <div className="space-y-3">
                  {stats.hourlyDistribution.map((hourData) => {
                    const percentage = (hourData.count / maxHourlyCount) * 100;
                    return (
                      <div key={hourData.hour} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                          {formatHour(hourData.hour)}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            >
                              {hourData.count > 0 && (
                                <span className="text-white text-xs font-medium">
                                  {hourData.count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
                          {hourData.count} رسالة
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {stats.totalMessages === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  لا توجد رسائل خارجية في التاريخ المحدد
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExternalMessagesStats;


