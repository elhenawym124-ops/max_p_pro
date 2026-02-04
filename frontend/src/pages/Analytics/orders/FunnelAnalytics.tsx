import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FunnelIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';

interface FunnelStats {
  funnelSteps: Array<{
    step: string;
    count: number;
    rate: number;
  }>;
  overallConversionRate: number;
  biggestDropOff: {
    from: string;
    to: string;
    dropRate: number;
  };
}

const FunnelAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<FunnelStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getFunnelAnalytics(period);
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          funnelSteps: [],
          overallConversionRate: 0,
          biggestDropOff: { from: '', to: '', dropRate: 0 }
        });
      }
    } catch (err: any) {
      console.error('FunnelAnalytics error:', err);
      setError(err.message || t('funnelAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('funnelAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('funnelAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('funnelAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('funnelAnalytics.last7Days')}</option>
          <option value="30">{t('funnelAnalytics.last30Days')}</option>
          <option value="90">{t('funnelAnalytics.last90Days')}</option>
          <option value="365">{t('funnelAnalytics.lastYear')}</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-full bg-blue-500">
            <FunnelIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('funnelAnalytics.overallConversionRate')}</p>
            <p className="text-3xl font-bold text-blue-600">{typeof stats?.overallConversionRate === 'number' ? stats.overallConversionRate.toFixed(1) : '0.0'}%</p>
          </div>
        </div>
      </div>

      {stats?.funnelSteps && stats.funnelSteps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('funnelAnalytics.funnelStages')}</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height={400} minHeight={400}>
              <BarChart data={stats.funnelSteps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="step" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name={t('funnelAnalytics.count')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('funnelAnalytics.stagesDetails')}</h3>
        <div className="space-y-4">
          {stats?.funnelSteps?.map((step, index) => {
            // Calculate drop rate from previous step
            const dropRate = index > 0 && stats.funnelSteps[index - 1].count > 0
              ? 100 - ((step.count / stats.funnelSteps[index - 1].count) * 100)
              : 0;

            return (
              <div key={index} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{step.step}</h4>
                  <span className="text-sm text-gray-500">{step.count?.toLocaleString()} {t('funnelAnalytics.visitor')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${step.rate}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{typeof step.rate === 'number' ? step.rate.toFixed(1) : '0.0'}%</span>
                  {dropRate > 0 && (
                    <span className="text-sm text-red-600">-{dropRate.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {stats?.biggestDropOff && stats.biggestDropOff.dropRate > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">{t('funnelAnalytics.biggestDropOff')}</h4>
            <p className="text-sm text-red-700 dark:text-red-400">
              {t('funnelAnalytics.from')} <span className="font-semibold">{stats.biggestDropOff.from}</span> {t('funnelAnalytics.to')} <span className="font-semibold">{stats.biggestDropOff.to}</span>
              {' '}- {t('funnelAnalytics.dropRate')}: <span className="font-bold">{stats.biggestDropOff.dropRate.toFixed(1)}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelAnalytics;
