import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SwatchIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface VariationStats {
  sizes: Array<{ name: string; sales: number; revenue: number }>;
  colors: Array<{ name: string; sales: number; revenue: number }>;
  topVariations: Array<{ name: string; product: string; sales: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const VariationsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<VariationStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getVariationsAnalytics(period);

      if (response.success) {
        const data = response.data || {};
        setStats({
          sizes: Array.isArray(data) ? [] : (data.sizes || []),
          colors: Array.isArray(data) ? [] : (data.colors || []),
          topVariations: Array.isArray(data) ? [] : (data.topVariations || []),
        });
      }
    } catch (err: any) {
      setError(err.message || t('variationsAnalytics.fetchError'));
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
          {t('variationsAnalytics.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('variationsAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('variationsAnalytics.subtitle')}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="7">{t('variationsAnalytics.last7Days')}</option>
          <option value="30">{t('variationsAnalytics.last30Days')}</option>
          <option value="90">{t('variationsAnalytics.last90Days')}</option>
          <option value="365">{t('variationsAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sizes Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-blue-500" />
            {t('variationsAnalytics.topSizes')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.sizes || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="sales"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                >
                  {(stats?.sizes || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Colors Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-purple-500" />
            {t('variationsAnalytics.topColors')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.colors || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="sales" fill="#8B5CF6" name={t('variationsAnalytics.sales')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Variations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('variationsAnalytics.topVariations')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('variationsAnalytics.variation')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('variationsAnalytics.product')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('variationsAnalytics.sales')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topVariations?.map((variation, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{variation.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{variation.product}</td>
                  <td className="py-3 px-4 text-sm text-blue-600 font-medium">{variation.sales}</td>
                </tr>
              ))}
              {(!stats?.topVariations || stats.topVariations.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">{t('variationsAnalytics.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VariationsAnalytics;
