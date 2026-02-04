import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCartIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface AbandonedCartStats {
  totalCarts: number;
  abandonedCarts: number;
  convertedCarts: number;
  abandonmentRate: number;
  totalCartValue: number;
  avgCartValue: number;
  topAbandonedProducts: Array<{
    productName: string;
    category: string;
    abandonedCount: number;
    lostRevenue: number;
  }>;
  recentAbandonedCarts: Array<{
    cartId: string;
    itemsCount: number;
    cartValue: number;
    lastUpdated: string;
    expiresAt: string;
  }>;
}

const AbandonedCartAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<AbandonedCartStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getAbandonedCartAnalytics(period);
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          totalCarts: 0,
          abandonedCarts: 0,
          convertedCarts: 0,
          abandonmentRate: 0,
          totalCartValue: 0,
          avgCartValue: 0,
          topAbandonedProducts: [],
          recentAbandonedCarts: []
        });
      }
    } catch (err: any) {
      console.error('AbandonedCartAnalytics error:', err);
      setError(err.message || t('abandonedCartAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('abandonedCartAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('abandonedCartAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('abandonedCartAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('abandonedCartAnalytics.last7Days')}</option>
          <option value="30">{t('abandonedCartAnalytics.last30Days')}</option>
          <option value="90">{t('abandonedCartAnalytics.last90Days')}</option>
          <option value="365">{t('abandonedCartAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('abandonedCartAnalytics.abandonedCarts')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.abandonedCarts?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('abandonedCartAnalytics.abandonmentRate')}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.abandonmentRate?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('abandonedCartAnalytics.totalCartValue')}</p>
              <p className="text-2xl font-bold text-purple-600">{formatPrice(stats?.totalCartValue || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('abandonedCartAnalytics.avgCartValue')}</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats?.avgCartValue || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.convertedCarts?.toLocaleString()} {t('abandonedCartAnalytics.converted')}</p>
            </div>
          </div>
        </div>
      </div>

      {stats?.topAbandonedProducts && stats.topAbandonedProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('abandonedCartAnalytics.topAbandonedProducts')}</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height={350} minHeight={350}>
              <BarChart data={stats.topAbandonedProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="productName" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                <Tooltip />
                <Bar dataKey="abandonedCount" fill="#F97316" name={t('abandonedCartAnalytics.abandonedCarts')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats?.recentAbandonedCarts && stats.recentAbandonedCarts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('abandonedCartAnalytics.recentAbandonedCarts')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">{t('abandonedCartAnalytics.cartId')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">{t('abandonedCartAnalytics.itemsCount')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">{t('abandonedCartAnalytics.cartValue')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">{t('abandonedCartAnalytics.lastUpdated')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAbandonedCarts.map((cart, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{cart.cartId}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{cart.itemsCount}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{formatPrice(cart.cartValue)}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {new Date(cart.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbandonedCartAnalytics;
