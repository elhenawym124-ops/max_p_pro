import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersIcon, ArrowPathIcon, XCircleIcon, StarIcon, CurrencyDollarIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface CustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
  newCustomers: number;
  repeatRate: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    orders: number;
    totalSpent: number;
    lastOrderDate: string;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const CustomerAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const qualityData = await analyticsService.getCustomerQualityAnalytics(period);

      if (qualityData.success) {
        const data = qualityData.data || {};
        setStats({
          totalCustomers: data.totalCustomers || 0,
          repeatCustomers: data.repeatCustomers || 0,
          newCustomers: data.newCustomers || 0,
          repeatRate: data.repeatRate || 0,
          averageOrderValue: data.averageOrderValue || 0,
          customerLifetimeValue: data.customerLifetimeValue || 0,
          topCustomers: data.topCustomers || [],
          customerSegments: data.segments || [
            { segment: t('customerAnalytics.vip'), count: 0, revenue: 0 },
            { segment: t('customerAnalytics.active'), count: 0, revenue: 0 },
            { segment: t('customerAnalytics.atRisk'), count: 0, revenue: 0 },
            { segment: t('customerAnalytics.lost'), count: 0, revenue: 0 },
          ],
        });
      }
    } catch (err: any) {
      console.error('CustomerAnalytics error:', err);
      setError(err.message || t('customerAnalytics.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const customerData = stats ? [
    { name: t('customerAnalytics.repeatCustomers'), value: stats.repeatCustomers },
    { name: t('customerAnalytics.newCustomers'), value: stats.newCustomers },
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('customerAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('customerAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('customerAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('customerAnalytics.last7Days')}</option>
          <option value="30">{t('customerAnalytics.last30Days')}</option>
          <option value="90">{t('customerAnalytics.last90Days')}</option>
          <option value="365">{t('customerAnalytics.lastYear')}</option>
        </select>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.totalCustomers')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalCustomers?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <ArrowPathIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.repeatCustomers')}</p>
              <p className="text-2xl font-bold text-green-600">{stats?.repeatCustomers?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.newCustomers')}</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.newCustomers?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <ArrowPathIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.repeatRate')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.repeatRate?.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-indigo-500">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.averageOrderValue')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.averageOrderValue || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customerAnalytics.customerLifetimeValue')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.customerLifetimeValue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('customerAnalytics.customerDistribution')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {customerData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('customerAnalytics.customerSegments')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.customerSegments || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="segment" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip formatter={(value) => value ? value.toLocaleString() : '0'} />
                <Bar dataKey="count" fill="#3B82F6" name={t('customerAnalytics.count')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <StarIcon className="h-5 w-5 text-yellow-500" />
          {t('customerAnalytics.topCustomers')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('customerAnalytics.customer')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('customerAnalytics.email')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('customerAnalytics.ordersCount')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('customerAnalytics.totalSpent')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('customerAnalytics.lastOrder')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topCustomers?.map((customer, index) => (
                <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{customer.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{customer.email}</td>
                  <td className="py-3 px-4 text-sm text-blue-600 font-medium">{customer.orders}</td>
                  <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(customer.totalSpent)}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{new Date(customer.lastOrderDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;
