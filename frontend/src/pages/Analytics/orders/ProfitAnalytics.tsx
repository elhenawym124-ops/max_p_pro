import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyDollarIcon, XCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface ProfitStats {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  cogs: number;
  operatingExpenses: number;
  adsCost: number;
  dailyProfit: Array<{ date: string; profit: number; revenue: number; costs: number }>;
  profitByCategory: Array<{ name: string; profit: number; margin: number }>;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const ProfitAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<ProfitStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getProfitAnalytics(period);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          cogs: 0,
          operatingExpenses: 0,
          adsCost: 0,
          dailyProfit: [],
          profitByCategory: [],
        });
      }
    } catch (err: any) {
      console.error('ProfitAnalytics error:', err);
      setError(err.message || t('profitAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('profitAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profitAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('profitAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('profitAnalytics.last7Days')}</option>
          <option value="30">{t('profitAnalytics.last30Days')}</option>
          <option value="90">{t('profitAnalytics.last90Days')}</option>
          <option value="365">{t('profitAnalytics.lastYear')}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profitAnalytics.grossProfit')}</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats?.grossProfit || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profitAnalytics.netProfit')}</p>
              <p className="text-2xl font-bold text-blue-600">{formatPrice(stats?.netProfit || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profitAnalytics.profitMargin')}</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.profitMargin?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <ArrowTrendingDownIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profitAnalytics.totalCosts')}</p>
              <p className="text-2xl font-bold text-red-600">{formatPrice((stats?.cogs || 0) + (stats?.operatingExpenses || 0) + (stats?.adsCost || 0))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('profitAnalytics.cogs')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.cogs || 0)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('profitAnalytics.adsCost')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.adsCost || 0)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">{t('profitAnalytics.operatingExpenses')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats?.operatingExpenses || 0)}</p>
        </div>
      </div>

      {/* Profit Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('profitAnalytics.profitOverTime')}</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyProfit || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip formatter={(value) => value ? formatPrice(value as number) : '0'} />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name={t('profitAnalytics.profit')} />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name={t('profitAnalytics.revenue')} />
              <Line type="monotone" dataKey="costs" stroke="#EF4444" strokeWidth={2} name={t('profitAnalytics.costs')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('profitAnalytics.profitByCategory')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.profitByCategory || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="profit"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(1) : 0}%)`}
                >
                  {(stats?.profitByCategory || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value ? formatPrice(value as number) : '0'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('profitAnalytics.profitMarginByCategory')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.profitByCategory || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="margin" fill="#10B981" name={t('profitAnalytics.profitMarginPercentage')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalytics;
