import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  dailyTrend: Array<{ date: string; orders: number; revenue: number }>;
}

const OverviewDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storeData, dailyData] = await Promise.all([
        analyticsService.getStoreAnalytics(period),
        analyticsService.getDailyAnalytics(period),
      ]);

      if (storeData.success && dailyData.success) {
        const storeStats = storeData.data;
        setStats({
          totalOrders: storeStats.totalOrders || 0,
          completedOrders: storeStats.completedOrders || 0,
          cancelledOrders: storeStats.cancelledOrders || 0,
          returnedOrders: storeStats.returnedOrders || 0,
          pendingOrders: storeStats.pendingOrders || 0,
          totalRevenue: storeStats.totalRevenue || 0,
          averageOrderValue: storeStats.averageOrderValue || 0,
          conversionRate: storeStats.conversionRate || 0,
          dailyTrend: dailyData.data || [],
        });
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    trend?: number;
    link?: string;
  }> = ({ title, value, icon: Icon, color, trend, link }) => {
    const content = (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <ArrowTrendingUpIcon className="h-4 w-4 mr-1" /> : <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
                <span>{Math.abs(trend)}% عن الفترة السابقة</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );

    return link ? <Link to={link}>{content}</Link> : content;
  };

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1'];

  const orderStatusData = stats ? [
    { name: 'مكتمل', value: stats.completedOrders, color: '#10B981' },
    { name: 'ملغي', value: stats.cancelledOrders, color: '#EF4444' },
    { name: 'مرتجع', value: stats.returnedOrders, color: '#F59E0B' },
    { name: 'قيد الانتظار', value: stats.pendingOrders, color: '#6366F1' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">نظرة عامة على الأداء</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">ملخص شامل لأداء المتجر</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 90 يوم</option>
          <option value="365">آخر سنة</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الطلبات"
          value={stats?.totalOrders?.toLocaleString() || 0}
          icon={ShoppingCartIcon}
          color="bg-blue-500"
          link="/analytics/orders/orders"
        />
        <StatCard
          title="الطلبات المكتملة"
          value={stats?.completedOrders?.toLocaleString() || 0}
          icon={CheckCircleIcon}
          color="bg-green-500"
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatPrice(stats?.totalRevenue || 0)}
          icon={CurrencyDollarIcon}
          color="bg-purple-500"
          link="/analytics/orders/revenue"
        />
        <StatCard
          title="متوسط قيمة الطلب"
          value={formatPrice(stats?.averageOrderValue || 0)}
          icon={ArrowTrendingUpIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">اتجاه الطلبات اليومي</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis dataKey="date" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
                <YAxis stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                  }}
                  wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="الطلبات"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">توزيع حالات الطلبات</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {orderStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الوصول السريع للتحليلات</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { to: '/analytics/orders/orders', icon: ShoppingCartIcon, label: 'الطلبات', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
            { to: '/analytics/orders/revenue', icon: CurrencyDollarIcon, label: 'الإيرادات', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
            { to: '/analytics/orders/products', icon: ChartBarIcon, label: 'المنتجات', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
            { to: '/analytics/orders/categories', icon: ClockIcon, label: 'الأقسام', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
            { to: '/analytics/orders/coupons', icon: TruckIcon, label: 'الكوبونات', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
            { to: '/analytics/orders/stock', icon: UsersIcon, label: 'المخزون', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className={`flex flex-col items-center p-4 rounded-xl ${item.color} hover:opacity-80 transition-all duration-200`}
            >
              <item.icon className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
