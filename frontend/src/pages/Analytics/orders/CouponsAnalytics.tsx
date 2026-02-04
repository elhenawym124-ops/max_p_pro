import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TicketIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface CouponStats {
  coupons: Array<{ code: string; usageCount: number; discountAmount: number; revenue: number }>;
  totalDiscounts: number;
  totalCouponOrders: number;
}

const CouponsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<CouponStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getCouponsAnalytics(period);
      if (response.success) {
        const data = response.data || {};
        setStats({
          coupons: data.coupons || [],
          totalDiscounts: data.totalDiscounts || 0,
          totalCouponOrders: data.totalCouponOrders || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || t('couponsAnalytics.fetchError'));
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('couponsAnalytics.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('couponsAnalytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('couponsAnalytics.subtitle')}</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">{t('couponsAnalytics.last7Days')}</option>
          <option value="30">{t('couponsAnalytics.last30Days')}</option>
          <option value="90">{t('couponsAnalytics.last90Days')}</option>
          <option value="365">{t('couponsAnalytics.lastYear')}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <TicketIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('couponsAnalytics.ordersWithCoupons')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalCouponOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('couponsAnalytics.totalDiscounts')}</p>
            <p className="text-2xl font-bold text-red-600">{formatPrice(stats?.totalDiscounts || 0)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <TicketIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('couponsAnalytics.couponsUsedCount')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.coupons?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('couponsAnalytics.usageChartTitle')}</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.coupons?.slice(0, 10) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis dataKey="code" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
              <Tooltip />
              <Bar dataKey="usageCount" fill="#8B5CF6" name={t('couponsAnalytics.usageCount')} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('couponsAnalytics.detailsTitle')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('couponsAnalytics.coupon')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('couponsAnalytics.usageCount')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('couponsAnalytics.discountAmount')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('couponsAnalytics.revenueGenerated')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('couponsAnalytics.status')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.coupons?.map((coupon, index) => {
                const profitWarning = coupon.discountAmount > coupon.revenue * 0.3;
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-mono font-medium">{coupon.code}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{coupon.usageCount}</td>
                    <td className="py-3 px-4 text-sm text-red-600">{formatPrice(coupon.discountAmount)}</td>
                    <td className="py-3 px-4 text-sm text-green-600">{formatPrice(coupon.revenue)}</td>
                    <td className="py-3 px-4">
                      {profitWarning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          {t('couponsAnalytics.highDiscount')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t('couponsAnalytics.good')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
};

export default CouponsAnalytics;
