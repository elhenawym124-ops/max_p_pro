import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPinIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface RegionStats {
  regions: Array<{
    name: string;
    orders: number;
    revenue: number;
    deliveryRate: number;
    codAcceptanceRate: number;
  }>;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const RegionAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<RegionStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getRegionAnalytics(period);
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({ regions: [] });
      }
    } catch (err: any) {
      console.error('RegionAnalytics error:', err);
      setError(err.message || t('regionAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('regionAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('regionAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('regionAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('regionAnalytics.last7Days')}</option>
          <option value="30">{t('regionAnalytics.last30Days')}</option>
          <option value="90">{t('regionAnalytics.last90Days')}</option>
          <option value="365">{t('regionAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('regionAnalytics.revenueByRegion')}</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.regions || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip formatter={(value) => formatPrice(value as number)} />
                <Bar dataKey="revenue" fill="#10B981" name={t('regionAnalytics.revenue')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('regionAnalytics.ordersDistribution')}</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.regions || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="orders"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(1) : 0}%)`}
                >
                  {(stats?.regions || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-blue-500" />
          {t('regionAnalytics.regionDetails')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('regionAnalytics.region')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('regionAnalytics.ordersCount')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('regionAnalytics.revenue')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('regionAnalytics.deliveryRate')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('regionAnalytics.codAcceptanceRate')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.regions?.map((region, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{region.name}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{region.orders?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(region.revenue)}</td>
                  <td className="py-3 px-4 text-sm text-purple-600">{region.deliveryRate?.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-sm text-orange-600">{region.codAcceptanceRate?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegionAnalytics;
