import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCardIcon, BanknotesIcon, XCircleIcon, InformationCircleIcon, TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface PaymentStats {
  methods: Array<{ name: string; count: number; revenue: number; percentage: number; averageOrderValue: number }>;
  totalOrders: number;
  codVsOnline: {
    cod: { count: number; revenue: number; percentage: number };
    online: { count: number; revenue: number; percentage: number };
  };
  successRate: number;
  dailyTrends: Array<{ date: string; cod: number; online: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PaymentMethodAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<PaymentStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getPaymentMethodsAnalytics(period);
      if (response.success && response.data) {
        const data = response.data || {};
        const methodsData = Array.isArray(data) ? data : (data.methods || []);

        // Calculate COD vs Online
        const codData = methodsData.filter((m: any) => {
          const name = m.name || '';
          return name.toLowerCase().includes('cod') || name.toLowerCase().includes('نقد');
        });
        const onlineData = methodsData.filter((m: any) => {
          const name = m.name || '';
          return !name.toLowerCase().includes('cod') && !name.toLowerCase().includes('نقد');
        });

        const codTotal = codData.reduce((sum: number, m: any) => sum + (m.count || 0), 0);
        const codRevenue = codData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
        const onlineTotal = onlineData.reduce((sum: number, m: any) => sum + (m.count || 0), 0);
        const onlineRevenue = onlineData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
        const totalCount = codTotal + onlineTotal;

        setStats({
          methods: methodsData,
          totalOrders: data.totalOrders || totalCount || 0,
          codVsOnline: {
            cod: {
              count: codTotal,
              revenue: codRevenue,
              percentage: totalCount > 0 ? (codTotal / totalCount) * 100 : 0,
            },
            online: {
              count: onlineTotal,
              revenue: onlineRevenue,
              percentage: totalCount > 0 ? (onlineTotal / totalCount) * 100 : 0,
            },
          },
          successRate: data.successRate || 95,
          dailyTrends: data.dailyTrends || [],
        });
      }
    } catch (err: any) {
      console.error('PaymentMethodAnalytics error:', err);
      setError(err.message || t('paymentAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('paymentAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('paymentAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('paymentAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('paymentAnalytics.last7Days')}</option>
          <option value="30">{t('paymentAnalytics.last30Days')}</option>
          <option value="90">{t('paymentAnalytics.last90Days')}</option>
          <option value="365">{t('paymentAnalytics.lastYear')}</option>
        </select>
      </div>

      {/* Basic Analytics Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500" />
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {t('paymentAnalytics.basicAnalyticsNotice')}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('paymentAnalytics.totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalOrders?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('paymentAnalytics.codPercentage')}</p>
              <p className="text-2xl font-bold text-orange-600">{typeof stats?.codVsOnline?.cod?.percentage === 'number' ? stats.codVsOnline.cod.percentage.toFixed(1) : '0.0'}%</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.codVsOnline?.cod?.count?.toLocaleString()} {t('paymentAnalytics.orders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('paymentAnalytics.onlinePercentage')}</p>
              <p className="text-2xl font-bold text-green-600">{typeof stats?.codVsOnline?.online?.percentage === 'number' ? stats.codVsOnline.online.percentage.toFixed(1) : '0.0'}%</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.codVsOnline?.online?.count?.toLocaleString()} {t('paymentAnalytics.orders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('paymentAnalytics.successRate')}</p>
              <p className="text-2xl font-bold text-purple-600">{typeof stats?.successRate === 'number' ? stats.successRate.toFixed(1) : '0.0'}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie Chart */}
        {stats?.methods && stats.methods.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentAnalytics.paymentMethodsDistribution')}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <PieChart>
                  <Pie
                    data={stats.methods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name || t('paymentAnalytics.undefined')} (${percent ? (percent * 100).toFixed(1) : 0}%)`}
                  >
                    {stats.methods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Revenue by Payment Method */}
        {stats?.methods && stats.methods.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentAnalytics.revenueByPaymentMethod')}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <BarChart data={stats.methods} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                  <Tooltip formatter={(value) => value ? formatPrice(value as number) : '0'} />
                  <Bar dataKey="revenue" fill="#10B981" name={t('paymentAnalytics.revenue')} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* COD vs Online Trends */}
      {stats?.dailyTrends && stats.dailyTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentAnalytics.paymentTrends')}</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <LineChart data={stats.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="cod" stroke="#F59E0B" strokeWidth={2} name="COD" />
                <Line type="monotone" dataKey="online" stroke="#10B981" strokeWidth={2} name={t('paymentAnalytics.electronicPayment')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payment Methods Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentAnalytics.paymentMethodsDetails')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('paymentAnalytics.paymentMethod')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('paymentAnalytics.ordersCount')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('paymentAnalytics.revenue')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('paymentAnalytics.averageOrderValue')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('paymentAnalytics.percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.methods?.map((method, index) => {
                const methodName = method.name || t('paymentAnalytics.undefined');
                const isCOD = methodName.toLowerCase().includes('cod') || methodName.toLowerCase().includes('نقد') || methodName.includes('استلام');
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isCOD ? (
                          <BanknotesIcon className="h-5 w-5 text-orange-500" />
                        ) : (
                          <CreditCardIcon className="h-5 w-5 text-blue-500" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">{methodName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-blue-600 font-medium">{method.count || 0}</td>
                    <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(method.revenue || 0)}</td>
                    <td className="py-3 px-4 text-sm text-purple-600 font-medium">{formatPrice(method.averageOrderValue || (method.count > 0 ? method.revenue / method.count : 0))}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{typeof method.percentage === 'number' ? method.percentage.toFixed(1) : (method.percentage || '0.0')}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodAnalytics;
