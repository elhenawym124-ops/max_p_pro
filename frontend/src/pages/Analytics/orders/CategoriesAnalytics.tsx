import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface CategoryStats {
  categories: Array<{ name: string; orders: number; revenue: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const CategoriesAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<CategoryStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getCategoriesAnalytics(period);
      if (response.success && response.data) {
        // Handle both array and object responses
        let categoriesData = [];
        if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categoriesData = response.data.categories;
        } else if (typeof response.data === 'object') {
          // If data is an object but not an array, try to extract array from it
          categoriesData = Object.values(response.data).filter((item: any) =>
            item && typeof item === 'object' && item.name
          );
        }
        setStats({ categories: categoriesData });
      } else {
        setStats({ categories: [] });
      }
    } catch (err: any) {
      console.error('CategoriesAnalytics error:', err);
      setError(err.message || t('categoriesAnalytics.fetchError'));
      setStats({ categories: [] });
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('categoriesAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('categoriesAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('categoriesAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('categoriesAnalytics.last7Days')}</option>
          <option value="30">{t('categoriesAnalytics.last30Days')}</option>
          <option value="90">{t('categoriesAnalytics.last90Days')}</option>
          <option value="365">{t('categoriesAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FolderIcon className="h-5 w-5 text-blue-500" />
            {t('categoriesAnalytics.revenueByCategory')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.categories || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="revenue" nameKey="name">
                  {(stats?.categories || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value ? formatPrice(value as number) : '0'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('categoriesAnalytics.ordersByCategory')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.categories || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="orders" fill="#10B981" name={t('categoriesAnalytics.orders')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('categoriesAnalytics.details')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('categoriesAnalytics.category')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('categoriesAnalytics.orders')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('categoriesAnalytics.revenue')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('categoriesAnalytics.percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.categories?.map((cat, index) => {
                const totalRevenue = stats.categories.reduce((sum, c) => sum + c.revenue, 0);
                const percentage = totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : '0';
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{cat.orders}</td>
                    <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(cat.revenue)}</td>
                    <td className="py-3 px-4 text-sm text-blue-600">{percentage}%</td>
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

export default CategoriesAnalytics;
