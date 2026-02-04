import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface OrdersStats {
  totalOrders: number;
  byStatus: Record<string, number>;
  dailyTrend: Array<{ date: string; orders: number }>;
  weeklyTrend: Array<{ week: string; orders: number }>;
  monthlyTrend: Array<{ month: string; orders: number }>;
  codVsPrepaid: { cod: number; prepaid: number };
  cancelledOrders: number;
  rejectedOrders: number;
}

const OrdersAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storeData, dailyData] = await Promise.all([
        analyticsService.getStoreAnalytics(period),
        analyticsService.getDailyAnalytics(period),
      ]);

      if (storeData.success) {
        const data = storeData.data;
        setStats({
          totalOrders: data.totalOrders || 0,
          byStatus: data.ordersByStatus || {},
          dailyTrend: dailyData.data || [],
          weeklyTrend: [],
          monthlyTrend: [],
          codVsPrepaid: {
            cod: data.codOrders || 0,
            prepaid: data.prepaidOrders || 0,
          },
          cancelledOrders: data.cancelledOrders || 0,
          rejectedOrders: data.rejectedOrders || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    'completed': 'bg-green-500',
    'processing': 'bg-blue-500',
    'pending': 'bg-yellow-500',
    'cancelled': 'bg-red-500',
    'refunded': 'bg-purple-500',
    'on-hold': 'bg-orange-500',
    'failed': 'bg-gray-500',
  };

  const statusLabels: Record<string, string> = {
    'completed': 'مكتمل',
    'processing': 'قيد المعالجة',
    'pending': 'قيد الانتظار',
    'cancelled': 'ملغي',
    'refunded': 'مسترد',
    'on-hold': 'معلق',
    'failed': 'فاشل',
  };

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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحليلات الطلبات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تتبع وتحليل حالات الطلبات</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 90 يوم</option>
          <option value="365">آخر سنة</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalOrders?.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">الدفع عند الاستلام (COD)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.codVsPrepaid.cod?.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">الدفع المسبق</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.codVsPrepaid.prepaid?.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">الطلبات الملغاة</p>
              <p className="text-2xl font-bold text-red-600">{stats?.cancelledOrders?.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الطلبات حسب الحالة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className={`w-4 h-4 rounded-full ${statusColors[status] || 'bg-gray-400'} mx-auto mb-2`}></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{statusLabels[status] || status}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">اتجاه الطلبات</h3>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setTrendView(view)}
                className={`px-3 py-1 rounded-lg text-sm ${trendView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
              >
                {view === 'daily' ? 'يومي' : view === 'weekly' ? 'أسبوعي' : 'شهري'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis dataKey="date" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <YAxis stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                }}
                wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
              />
              <Legend />
              <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} name="الطلبات" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* COD vs Prepaid Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الدفع عند الاستلام مقابل الدفع المسبق</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'الدفع عند الاستلام', value: stats?.codVsPrepaid.cod || 0 },
                { name: 'الدفع المسبق', value: stats?.codVsPrepaid.prepaid || 0 },
              ]}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis type="number" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" />
              <YAxis dataKey="name" type="category" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" width={120} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                }}
                wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OrdersAnalytics;
