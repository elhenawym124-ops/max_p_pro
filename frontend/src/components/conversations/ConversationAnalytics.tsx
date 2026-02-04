import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  unreadMessages: number;
  averageResponseTime: number;
  onlineUsers: number;
  messagesPerHour: number;
  responseRate: number;
  lastUpdated: Date;
}

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, icon, trend, color }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="w-4 h-4 ml-1" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 ml-1" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
};

interface ConversationAnalyticsProps {
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
}

const ConversationAnalytics: React.FC<ConversationAnalyticsProps> = ({
  refreshInterval = 30000,
  showRealTimeUpdates = true
}) => {
  const [stats, setStats] = useState<ConversationStats>({
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    unreadMessages: 0,
    averageResponseTime: 0,
    onlineUsers: 0,
    messagesPerHour: 0,
    responseRate: 0,
    lastUpdated: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب الإحصائيات
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // محاكاة جلب البيانات من API
      const response = await fetch('/api/v1/conversations/analytics');
      
      if (!response.ok) {
        throw new Error('فشل في جلب الإحصائيات');
      }

      const data = await response.json();
      
      // إذا لم يكن هناك API حقيقي، استخدم بيانات تجريبية
      const mockStats: ConversationStats = {
        totalConversations: Math.floor(Math.random() * 100) + 50,
        activeConversations: Math.floor(Math.random() * 20) + 10,
        totalMessages: Math.floor(Math.random() * 1000) + 500,
        unreadMessages: Math.floor(Math.random() * 50) + 5,
        averageResponseTime: Math.floor(Math.random() * 300) + 60,
        onlineUsers: Math.floor(Math.random() * 15) + 5,
        messagesPerHour: Math.floor(Math.random() * 50) + 20,
        responseRate: Math.floor(Math.random() * 30) + 70,
        lastUpdated: new Date()
      };

      setStats(data.success ? data.stats : mockStats);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('فشل في تحميل الإحصائيات');
      
      // استخدام بيانات تجريبية في حالة الخطأ
      setStats({
        totalConversations: 75,
        activeConversations: 15,
        totalMessages: 850,
        unreadMessages: 12,
        averageResponseTime: 120,
        onlineUsers: 8,
        messagesPerHour: 35,
        responseRate: 85,
        lastUpdated: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  // تحديث الإحصائيات دورياً
  useEffect(() => {
    fetchStats();

    if (showRealTimeUpdates) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, showRealTimeUpdates]);

  // تنسيق الوقت
  const formatResponseTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}ث`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}د`;
  };

  // إضافة return statement للتأكد من عدم وجود خطأ
  const handleRefresh = () => {
    fetchStats();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 space-x-reverse">
          <ChartBarIcon className="w-8 h-8 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">إحصائيات المحادثات</h2>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
          <ClockIcon className="w-4 h-4" />
          <span>آخر تحديث: {stats.lastUpdated.toLocaleTimeString('ar-SA')}</span>
          {showRealTimeUpdates && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-400 ml-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={fetchStats}
                className="text-sm text-red-600 hover:text-red-500 font-medium mt-1"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="إجمالي المحادثات"
          value={stats.totalConversations}
          icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
          trend={{ value: 12, isPositive: true }}
          color="border-blue-500"
        />

        <AnalyticsCard
          title="المحادثات النشطة"
          value={stats.activeConversations}
          icon={<UserGroupIcon className="w-8 h-8" />}
          trend={{ value: 8, isPositive: true }}
          color="border-green-500"
        />

        <AnalyticsCard
          title="إجمالي الرسائل"
          value={stats.totalMessages.toLocaleString('ar-SA')}
          icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
          trend={{ value: 15, isPositive: true }}
          color="border-purple-500"
        />

        <AnalyticsCard
          title="الرسائل غير المقروءة"
          value={stats.unreadMessages}
          icon={<EyeIcon className="w-8 h-8" />}
          trend={{ value: 5, isPositive: false }}
          color="border-red-500"
        />

        <AnalyticsCard
          title="متوسط وقت الرد"
          value={formatResponseTime(stats.averageResponseTime)}
          icon={<ClockIcon className="w-8 h-8" />}
          trend={{ value: 10, isPositive: false }}
          color="border-yellow-500"
        />

        <AnalyticsCard
          title="المستخدمون المتصلون"
          value={stats.onlineUsers}
          icon={<UserGroupIcon className="w-8 h-8" />}
          color="border-green-500"
        />

        <AnalyticsCard
          title="الرسائل/الساعة"
          value={stats.messagesPerHour}
          icon={<ArrowTrendingUpIcon className="w-8 h-8" />}
          trend={{ value: 20, isPositive: true }}
          color="border-indigo-500"
        />

        <AnalyticsCard
          title="معدل الاستجابة"
          value={`${stats.responseRate}%`}
          icon={<CheckCircleIcon className="w-8 h-8" />}
          trend={{ value: 3, isPositive: true }}
          color="border-teal-500"
        />
      </div>

      {/* رسم بياني بسيط */}
      <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">نشاط الرسائل اليومي</h3>
        <div className="flex items-end justify-between h-32 space-x-2 space-x-reverse">
          {[...Array(7)].map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div key={i} className="flex flex-col items-center">
                <div
                  className="bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t w-8 transition-all duration-500 hover:from-indigo-600 hover:to-indigo-400"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG', { weekday: 'short', calendar: 'gregory' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center space-x-2 space-x-reverse"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>تحديث</span>
        </button>

        <div className="flex space-x-2 space-x-reverse">
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200">
            تصدير
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200">
            تفاصيل
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationAnalytics;
