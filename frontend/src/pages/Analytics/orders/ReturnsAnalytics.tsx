import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUturnLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface ReturnsStats {
  totalReturns: number;
  returnRate: number;
  returnedRevenue: number;
  reasons: Array<{ reason: string; count: number; percentage: number }>;
  topReturnedProducts: Array<{ name: string; returns: number; rate: number }>;
  dailyTrends: Array<{ date: string; returns: number; rate: number }>;
}

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];

const ReturnsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<ReturnsStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getReturnsAnalytics(period);
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          totalReturns: 0,
          returnRate: 0,
          returnedRevenue: 0,
          reasons: [],
          topReturnedProducts: [],
          dailyTrends: [],
        });
      }
    } catch (err: any) {
      console.error('ReturnsAnalytics error:', err);
      setError(err.message || t('returnsAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('returnsAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('returnsAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('returnsAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('returnsAnalytics.last7Days')}</option>
          <option value="30">{t('returnsAnalytics.last30Days')}</option>
          <option value="90">{t('returnsAnalytics.last90Days')}</option>
          <option value="365">{t('returnsAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('returnsAnalytics.totalReturns')}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.totalReturns?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('returnsAnalytics.returnRate')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.returnRate?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('returnsAnalytics.returnedRevenue')}</p>
              <p className="text-2xl font-bold text-purple-600">{formatPrice(stats?.returnedRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('returnsAnalytics.returnsTrend')}</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyTrends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="returns" stroke="#EF4444" strokeWidth={2} name={t('returnsAnalytics.returns')} />
              <Line type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2} name={t('returnsAnalytics.ratePercentage')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('returnsAnalytics.returnReasons')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.reasons || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="reason"
                  label={({ reason, percentage }) => `${reason} (${percentage?.toFixed(1)}%)`}
                >
                  {(stats?.reasons || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('returnsAnalytics.topReturnedProducts')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topReturnedProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                <Tooltip />
                <Bar dataKey="returns" fill="#EF4444" name={t('returnsAnalytics.returnsCount')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsAnalytics;
