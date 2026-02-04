import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TruckIcon, XCircleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface DeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  dailyTrends: Array<{ date: string; successful: number; failed: number; rate: number }>;
  regionPerformance: Array<{ region: string; deliveryRate: number; avgTime: number }>;
  shippingCompanies: Array<{ company: string; deliveryRate: number; orders: number }>;
}

const DeliveryRateAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<DeliveryStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getDeliveryRateAnalytics(period);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          totalDeliveries: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          deliveryRate: 0,
          averageDeliveryTime: 0,
          dailyTrends: [],
          regionPerformance: [],
          shippingCompanies: [],
        });
      }
    } catch (err: any) {
      console.error('DeliveryRateAnalytics error:', err);
      setError(err.message || t('deliveryRateAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('deliveryRateAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('deliveryRateAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('deliveryRateAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('deliveryRateAnalytics.last7Days')}</option>
          <option value="30">{t('deliveryRateAnalytics.last30Days')}</option>
          <option value="90">{t('deliveryRateAnalytics.last90Days')}</option>
          <option value="365">{t('deliveryRateAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('deliveryRateAnalytics.totalDeliveries')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalDeliveries?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('deliveryRateAnalytics.successRate')}</p>
              <p className="text-2xl font-bold text-green-600">{stats?.deliveryRate?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('deliveryRateAnalytics.avgDeliveryTime')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.averageDeliveryTime?.toFixed(1)} {t('deliveryRateAnalytics.day')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('deliveryRateAnalytics.failedDeliveries')}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.failedDeliveries?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('deliveryRateAnalytics.deliveryRateOverTime')}</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyTrends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} name={t('deliveryRateAnalytics.deliveryRatePercentage')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('deliveryRateAnalytics.performanceByRegion')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.regionPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="region" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="deliveryRate" fill="#10B981" name={t('deliveryRateAnalytics.deliveryRatePercentage')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('deliveryRateAnalytics.shippingCompanyPerformance')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.shippingCompanies || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="company" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="deliveryRate" fill="#3B82F6" name={t('deliveryRateAnalytics.deliveryRatePercentage')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRateAnalytics;
