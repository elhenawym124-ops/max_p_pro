import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuthSimple';
import { useTheme } from '../hooks/useTheme';
import { buildApiUrl } from '../utils/urlHelper';
import ActiveUsersMonitor from '../components/ActiveUsersMonitor';
import '../styles/dashboard-enhanced.css';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const themeColors = {
    cardBg: isDark ? 'bg-slate-800' : 'bg-white',
    cardBorder: isDark ? 'border-slate-700' : 'border-gray-100',
    titleText: isDark ? 'text-white' : 'text-gray-900',
    bodyText: isDark ? 'text-gray-300' : 'text-gray-500',
    subText: isDark ? 'text-gray-400' : 'text-gray-500',
    mutedBg: isDark ? 'bg-slate-700/50' : 'bg-gray-50',
    hoverBg: isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50',
    buttonBg: isDark ? 'bg-slate-800' : 'bg-white',
    buttonBorder: isDark ? 'border-slate-600' : 'border-gray-300',
    buttonText: isDark ? 'text-gray-200' : 'text-gray-700'
  };

  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActiveUsers, setShowActiveUsers] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      console.log('🔍 [DASHBOARD] Fetching stats with token:', token ? 'Present' : 'Missing');

      const response = await fetch(buildApiUrl('admin/statistics'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      } else {
        setError(data.message || 'فشل في جلب الإحصائيات');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Operational Pulse Card Component
  const PulseCard = ({ title, value, icon, color, subtext }) => (
    <div className={`group relative overflow-hidden ${themeColors.cardBg} rounded-2xl p-6 border ${themeColors.cardBorder} shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110`}></div>
      <div className="relative flex justify-between items-start">
        <div>
          <p className={`text-sm font-medium ${themeColors.bodyText} mb-1`}>{title}</p>
          <h3 className={`text-3xl font-bold ${themeColors.titleText}`}>{value?.toLocaleString() || 0}</h3>
          <p className={`text-xs mt-2 font-medium text-${color}-600 bg-${color}-500/10 inline-block px-2 py-1 rounded-full`}>
            {subtext}
          </p>
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-xl text-${color}-600 group-hover:bg-${color}-600 group-hover:text-white transition-colors duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const PlanBar = ({ plan, count, total }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const planConfig = {
      BASIC: { label: 'أساسي', color: 'blue' },
      PRO: { label: 'احترافي', color: 'amber' },
      ENTERPRISE: { label: 'مؤسسي', color: 'emerald' }
    };

    const config = planConfig[plan] || { label: plan, color: 'gray' };

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${config.color}-500/10 text-${config.color}-500`}>
              {config.label}
            </span>
            <span className={`text-sm ${themeColors.bodyText}`}>{count} شركة</span>
          </div>
          <span className={`text-sm font-bold ${themeColors.bodyText}`}>{percentage}%</span>
        </div>
        <div className={`w-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-full h-2`}>
          <div
            className={`bg-${config.color}-500 h-2 rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 rounded shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 py-8" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className={`text-2xl font-bold ${themeColors.titleText}`}>
            لوحة تحكم مدير النظام
            <span className={`text-base font-normal ${themeColors.subText} mr-2`}> | {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </h1>
          <p className={`${themeColors.bodyText} mt-1`}>
            مرحباً {user?.firstName} {user?.lastName}، إليك نظرة عامة على النظام
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowActiveUsers(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors`}
          >
            <ClockIcon className="h-5 w-5" />
            المستخدمون النشطون
          </button>
          <button
            onClick={fetchStatistics}
            className={`inline-flex items-center px-4 py-2 ${themeColors.buttonBg} border ${themeColors.buttonBorder} rounded-xl text-sm font-medium ${themeColors.buttonText} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'} shadow-sm transition-colors`}
          >
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PulseCard
          title="إجمالي الشركات"
          value={statistics?.overview?.totalCompanies}
          icon={<BuildingOfficeIcon className="h-6 w-6" />}
          color="indigo"
          subtext={`نشطة: ${statistics?.overview?.activeCompanies || 0}`}
        />
        <PulseCard
          title="إجمالي المستخدمين"
          value={statistics?.overview?.totalUsers}
          icon={<UsersIcon className="h-6 w-6" />}
          color="emerald"
          subtext="مستخدمين مسجلين"
        />
        <PulseCard
          title="إجمالي العملاء"
          value={statistics?.overview?.totalCustomers}
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="blue"
          subtext="عملاء نهائيين"
        />
        <PulseCard
          title="إجمالي المحادثات"
          value={statistics?.overview?.totalConversations}
          icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
          color="amber"
          subtext="عبر كل القنوات"
        />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Plan Distribution */}
        <div className={`${themeColors.cardBg} rounded-2xl p-6 border ${themeColors.cardBorder} shadow-sm`}>
          <div className="flex items-center gap-2 mb-6">
            <div className={`p-2 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'} rounded-lg text-indigo-600`}>
              <ChartBarIcon className="h-6 w-6" />
            </div>
            <h2 className={`text-lg font-bold ${themeColors.titleText}`}>توزيع الخطط</h2>
          </div>
          <div className="space-y-1">
            {Object.entries(statistics?.planDistribution || {}).map(([plan, count]) => (
              <PlanBar
                key={plan}
                plan={plan}
                count={count}
                total={statistics?.overview?.totalCompanies}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`${themeColors.cardBg} rounded-2xl p-6 border ${themeColors.cardBorder} shadow-sm`}>
          <div className="flex items-center gap-2 mb-6">
            <div className={`p-2 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'} rounded-lg text-emerald-600`}>
              <ArrowTrendingUpIcon className="h-6 w-6" />
            </div>
            <h2 className={`text-lg font-bold ${themeColors.titleText}`}>النشاط الأخير (30 يوم)</h2>
          </div>

          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 ${themeColors.mutedBg} rounded-xl hover:bg-gray-100 transition-colors`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'} text-indigo-600 rounded-full`}>
                  <BriefcaseIcon className="h-5 w-5" />
                </div>
                <span className={`${themeColors.bodyText} font-medium`}>شركات جديدة</span>
              </div>
              <span className={`text-xl font-bold ${themeColors.titleText}`}>{statistics?.recentActivity?.newCompaniesLast30Days || 0}</span>
            </div>

            <div className={`flex items-center justify-between p-4 ${themeColors.mutedBg} rounded-xl hover:bg-gray-100 transition-colors`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'} text-emerald-600 rounded-full`}>
                  <UsersIcon className="h-5 w-5" />
                </div>
                <span className={`${themeColors.bodyText} font-medium`}>مستخدمين جدد</span>
              </div>
              <span className={`text-xl font-bold ${themeColors.titleText}`}>{statistics?.recentActivity?.newUsersLast30Days || 0}</span>
            </div>

            <div className={`flex items-center justify-between p-4 ${themeColors.mutedBg} rounded-xl hover:bg-gray-100 transition-colors`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} text-blue-600 rounded-full`}>
                  <UserGroupIcon className="h-5 w-5" />
                </div>
                <span className={`${themeColors.bodyText} font-medium`}>عملاء جدد</span>
              </div>
              <span className={`text-xl font-bold ${themeColors.titleText}`}>{statistics?.recentActivity?.newCustomersLast30Days || 0}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Active Users Monitor */}
      <ActiveUsersMonitor
        isOpen={showActiveUsers}
        onClose={() => setShowActiveUsers(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;

