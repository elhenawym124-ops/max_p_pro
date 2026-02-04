import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface RevenueStats {
  grossRevenue: number;
  netRevenue: number;
  refunds: number;
  averageOrderValue: number;
  revenueGrowth: number;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
}

const RevenueAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<RevenueStats | null>(null);

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
          grossRevenue: data.totalRevenue || 0,
          netRevenue: (data.totalRevenue || 0) - (data.refundedAmount || 0),
          refunds: data.refundedAmount || 0,
          averageOrderValue: data.averageOrderValue || 0,
          revenueGrowth: data.revenueGrowth || 0,
          dailyRevenue: dailyData.data || [],
        });
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحليلات الإيرادات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تتبع الإيرادات والأرباح</p>
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
              <p className="text-sm text-gray-500">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.grossRevenue || 0)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">صافي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.netRevenue || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">بعد خصم المرتجعات</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">المرتجعات</p>
              <p className="text-2xl font-bold text-red-600">{formatPrice(stats?.refunds || 0)}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <ReceiptRefundIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.averageOrderValue || 0)}</p>
              {stats?.revenueGrowth !== undefined && (
                <div className={`flex items-center mt-1 text-sm ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueGrowth >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                  )}
                  <span>{Math.abs(stats.revenueGrowth)}%</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الإيرادات عبر الزمن</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.dailyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis dataKey="date" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <YAxis stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                }}
                wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                formatter={(value) => value ? [formatPrice(value as number), 'الإيرادات'] : ['0', 'الإيرادات']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="الإيرادات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue vs Orders Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الإيرادات مقابل عدد الطلبات</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.dailyRevenue?.slice(-14) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis dataKey="date" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <YAxis yAxisId="left" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                }}
                wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="الإيرادات" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="orders" fill="#10B981" name="الطلبات" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
