import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  PlusCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';
import { useAuth } from '../../hooks/useAuthSimple';

interface SentMessagesStatsData {
  summary: {
    messages: {
      totalSent: number;
      totalSaved: number;
      totalIgnored: number;
      savedPercentage: number;
      ignoredPercentage: number;
    };
    conversations: {
      created: number;
      existed: number;
      ignored: number;
      total: number;
    };
  };
  dailyStats: Array<{
    date: string;
    saved: number;
    ignored: number;
    total: number;
    conversationsCreated: number;
    conversationsExisted: number;
    conversationsIgnored: number;
  }>;
  pageStats: Array<{
    pageId: string;
    pageName: string;
    count: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

const SentMessagesStats: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('30d');
  const [stats, setStats] = useState<SentMessagesStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
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
        buildApiUrl(`conversations/stats/sent-messages?period=${period}`),
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
      console.error('Error fetching sent messages stats:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الإحصائيات');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
            إحصائيات الرسائل المرسلة
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            عرض إحصائيات الرسائل المرسلة للعملاء والمحادثات (محفوظة/متجاهلة)
          </p>
        </div>

        {/* Period Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <label htmlFor="period-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                اختر الفترة:
              </label>
              <select
                id="period-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">اليوم</option>
                <option value="7d">آخر 7 أيام</option>
                <option value="30d">آخر 30 يوم</option>
                <option value="90d">آخر 90 يوم</option>
              </select>
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
            {/* Messages Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      إجمالي الرسائل المرسلة
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.messages.totalSent.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium text-gray-600">محفوظة</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.messages.totalSaved.toLocaleString('ar-EG')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {stats.summary.messages.savedPercentage}%
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                      <p className="text-sm font-medium text-gray-600">متجاهلة</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.messages.totalIgnored.toLocaleString('ar-EG')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {stats.summary.messages.ignoredPercentage}%
                    </p>
                  </div>
                  <div className="bg-red-100 rounded-full p-3">
                    <XCircleIcon className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      نسبة الحفظ
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.messages.savedPercentage}%
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Conversations Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PlusCircleIcon className="h-4 w-4 text-indigo-500" />
                      <p className="text-sm font-medium text-gray-600">محادثات منشأة</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.conversations.created.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-indigo-100 rounded-full p-3">
                    <PlusCircleIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      محادثات موجودة
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.conversations.existed.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-yellow-100 rounded-full p-3">
                    <UserGroupIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <XCircleIcon className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium text-gray-600">محادثات متجاهلة</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.conversations.ignored.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-orange-100 rounded-full p-3">
                    <XCircleIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      إجمالي المحادثات
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.summary.conversations.total.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-teal-100 rounded-full p-3">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Chart */}
            {stats.dailyStats && stats.dailyStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  الإحصائيات اليومية
                </h2>
                <div className="flex items-end justify-between h-64 space-x-2 space-x-reverse">
                  {stats.dailyStats.map((day, index) => {
                    const maxTotal = Math.max(...stats.dailyStats.map(d => d.total), 1);
                    const savedHeight = (day.saved / maxTotal) * 100;
                    const ignoredHeight = (day.ignored / maxTotal) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div
                            className="bg-green-500 rounded-t w-full transition-all duration-300 hover:bg-green-600"
                            style={{ height: `${savedHeight}%` }}
                            title={`محفوظة: ${day.saved}`}
                          />
                          <div
                            className="bg-red-500 rounded-t w-full transition-all duration-300 hover:bg-red-600"
                            style={{ height: `${ignoredHeight}%` }}
                            title={`متجاهلة: ${day.ignored}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          {new Date(day.date).toLocaleDateString('ar-EG', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </span>
                        <span className="text-xs font-bold mt-1">{day.total}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">محفوظة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">متجاهلة</span>
                  </div>
                </div>
              </div>
            )}

            {/* Page Stats */}
            {stats.pageStats && stats.pageStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  الإحصائيات حسب الصفحة
                </h2>
                <div className="space-y-2">
                  {stats.pageStats.map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <span className="font-medium text-gray-900 dark:text-white">{page.pageName}</span>
                      <span className="text-lg font-bold text-blue-600">{page.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {stats.summary.messages.totalSent === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  لا توجد رسائل مرسلة في الفترة المحددة
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SentMessagesStats;


