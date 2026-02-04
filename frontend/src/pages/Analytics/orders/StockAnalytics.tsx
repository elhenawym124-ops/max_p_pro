import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArchiveBoxIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface StockStats {
  lowStockProducts: Array<{ id: string; name: string; stock: number; threshold: number }>;
  fastMovingProducts: Array<{ id: string; name: string; salesVelocity: number }>;
  overstockedProducts: Array<{ id: string; name: string; stock: number; avgSales: number }>;
  totalLowStock: number;
  totalOutOfStock: number;
}

const StockAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<StockStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getStockForecastAnalytics(period);
      if (response.success) {
        const data = response.data || {};
        setStats({
          lowStockProducts: data.lowStockProducts || [],
          fastMovingProducts: data.fastMovingProducts || [],
          overstockedProducts: data.overstockedProducts || [],
          totalLowStock: data.totalLowStock || 0,
          totalOutOfStock: data.totalOutOfStock || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || t('stockAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('stockAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stockAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('stockAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('stockAnalytics.last7Days')}</option>
          <option value="30">{t('stockAnalytics.last30Days')}</option>
          <option value="90">{t('stockAnalytics.last90Days')}</option>
          <option value="365">{t('stockAnalytics.lastYear')}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('stockAnalytics.lowStockProducts')}</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.totalLowStock || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('stockAnalytics.outOfStockProducts')}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.totalOutOfStock || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('stockAnalytics.fastMovingProducts')}</p>
              <p className="text-2xl font-bold text-green-600">{stats?.fastMovingProducts?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {t('stockAnalytics.replenishAlert')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-yellow-200 dark:border-yellow-700">
                  <th className="text-right py-2 px-4 text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('stockAnalytics.product')}</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('stockAnalytics.currentStock')}</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('stockAnalytics.threshold')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.slice(0, 10).map((product) => (
                  <tr key={product.id} className="border-b border-yellow-100 dark:border-yellow-800">
                    <td className="py-2 px-4 text-sm text-yellow-900 dark:text-yellow-100">{product.name}</td>
                    <td className="py-2 px-4 text-sm text-red-600 font-bold">{product.stock}</td>
                    <td className="py-2 px-4 text-sm text-yellow-700 dark:text-yellow-300">{product.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fast Moving Products Chart */}
      {stats?.fastMovingProducts && stats.fastMovingProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
            {t('stockAnalytics.fastestMovingProducts')}
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={stats.fastMovingProducts.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={150} />
                <Tooltip />
                <Bar dataKey="salesVelocity" fill="#10B981" name={t('stockAnalytics.salesVelocity')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Overstocked Products */}
      {stats?.overstockedProducts && stats.overstockedProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="h-5 w-5 text-blue-500" />
            {t('stockAnalytics.overstockedProducts')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('stockAnalytics.product')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('stockAnalytics.currentStock')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('stockAnalytics.averageSalesPerMonth')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('stockAnalytics.monthsToSell')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.overstockedProducts.map((product) => {
                  const monthsToSell = product.avgSales > 0 ? Math.round(product.stock / product.avgSales) : 999;
                  return (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{product.name}</td>
                      <td className="py-3 px-4 text-sm text-blue-600 font-bold">{product.stock}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{product.avgSales}</td>
                      <td className="py-3 px-4 text-sm text-orange-600">{monthsToSell > 12 ? '12+' : monthsToSell}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalytics;
