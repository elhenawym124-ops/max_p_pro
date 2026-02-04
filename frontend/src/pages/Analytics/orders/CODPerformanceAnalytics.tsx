import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TruckIcon, XCircleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface CODStats {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  successRate: number;
  cancellationRate: number;
  returnRate: number;
  totalRevenue: number;
  lostRevenue: number;
  avgOrderValue: number;
  regionalPerformance: Array<{
    region: string;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    successRate: number;
    cancellationRate: number;
  }>;
}

const CODPerformanceAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<CODStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getCODPerformanceAnalytics(period);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          pendingOrders: 0,
          successRate: 0,
          cancellationRate: 0,
          returnRate: 0,
          totalRevenue: 0,
          lostRevenue: 0,
          avgOrderValue: 0,
          regionalPerformance: [],
        });
      }
    } catch (err: any) {
      console.error('CODPerformanceAnalytics error:', err);
      setError(err.message || t('codPerformance.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('codPerformance.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('codPerformance.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('codPerformance.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('codPerformance.last7Days')}</option>
          <option value="30">{t('codPerformance.last30Days')}</option>
          <option value="90">{t('codPerformance.last90Days')}</option>
          <option value="365">{t('codPerformance.lastYear')}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('codPerformance.totalCODOrders')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalOrders?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('codPerformance.successRate')}</p>
              <p className="text-2xl font-bold text-green-600">{typeof stats?.successRate === 'number' ? stats.successRate.toFixed(1) : '0.0'}%</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.deliveredOrders?.toLocaleString()} {t('codPerformance.orders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <XMarkIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('codPerformance.cancellationRate')}</p>
              <p className="text-2xl font-bold text-red-600">{typeof stats?.cancellationRate === 'number' ? stats.cancellationRate.toFixed(1) : '0.0'}%</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.cancelledOrders?.toLocaleString()} {t('codPerformance.orders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('codPerformance.lostRevenue')}</p>
              <p className="text-2xl font-bold text-orange-600">{formatPrice(stats?.lostRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('codPerformance.performanceSummary')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('codPerformance.pendingOrders')}</p>
            <p className="text-xl font-bold text-blue-600">{stats?.pendingOrders?.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('codPerformance.returnedOrders')}</p>
            <p className="text-xl font-bold text-orange-600">{stats?.returnedOrders?.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('codPerformance.totalRevenue')}</p>
            <p className="text-xl font-bold text-green-600">{formatPrice(stats?.totalRevenue || 0)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('codPerformance.averageOrderValue')}</p>
            <p className="text-xl font-bold text-purple-600">{formatPrice(stats?.avgOrderValue || 0)}</p>
          </div>
        </div>
      </div>

      {/* Region Performance */}
      {stats?.regionalPerformance && stats.regionalPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('codPerformance.regionalPerformance')}</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height={400} minHeight={400}>
              <BarChart data={stats.regionalPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="region" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="successRate" fill="#10B981" name={t('codPerformance.successRatePercentage')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CODPerformanceAnalytics;
