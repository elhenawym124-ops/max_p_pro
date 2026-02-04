import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartBarIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface ConversionStats {
  overallRate: number;
  visitorToCart: number;
  cartToCheckout: number;
  checkoutToOrder: number;
  dailyTrends: Array<{ date: string; rate: number }>;
}

const ConversionRateAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<ConversionStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getConversionRateAnalytics(period);
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({ overallRate: 0, visitorToCart: 0, cartToCheckout: 0, checkoutToOrder: 0, dailyTrends: [] });
      }
    } catch (err: any) {
      console.error('ConversionRateAnalytics error:', err);
      setError(err.message || t('conversionAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('conversionAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('conversionAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('conversionAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('conversionAnalytics.last7Days')}</option>
          <option value="30">{t('conversionAnalytics.last30Days')}</option>
          <option value="90">{t('conversionAnalytics.last90Days')}</option>
          <option value="365">{t('conversionAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('conversionAnalytics.overallRate')}</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.overallRate?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('conversionAnalytics.visitorToCart')}</p>
          <p className="text-2xl font-bold text-green-600">{stats?.visitorToCart?.toFixed(1)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('conversionAnalytics.cartToCheckout')}</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.cartToCheckout?.toFixed(1)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('conversionAnalytics.checkoutToOrder')}</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.checkoutToOrder?.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('conversionAnalytics.trend')}</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyTrends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line type="monotone" dataKey="rate" stroke="#3B82F6" strokeWidth={2} name={t('conversionAnalytics.rate')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ConversionRateAnalytics;
