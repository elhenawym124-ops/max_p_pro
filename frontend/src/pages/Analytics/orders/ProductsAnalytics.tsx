import React, { useState, useEffect } from 'react';
import {
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import analyticsService from '../../../services/analyticsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface ProductStats {
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
    image?: string;
  }>;
  lowPerformingProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  totalProducts: number;
}

const ProductsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<ProductStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [topProductsData, productAnalyticsData] = await Promise.all([
        analyticsService.getTopProducts(period, 10),
        analyticsService.getProductAnalytics(period),
      ]);

      setStats({
        topProducts: topProductsData.success ? topProductsData.data : [],
        lowPerformingProducts: productAnalyticsData.success ? (productAnalyticsData.data?.lowPerforming || []) : [],
        totalProducts: productAnalyticsData.success ? (productAnalyticsData.data?.totalProducts || 0) : 0,
      });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في جلب البيانات');
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
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحليلات المنتجات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">أداء المنتجات والمبيعات</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 90 يوم</option>
          <option value="365">آخر سنة</option>
        </select>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-purple-500">
            <ShoppingBagIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">إجمالي المنتجات</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalProducts?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Top Products Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
          أفضل المنتجات مبيعاً
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.topProducts || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis type="number" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} width={150} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                }}
                wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                formatter={(value, name) => {
                  if (!value) return ['0', name];
                  if (name === 'revenue') return [formatPrice(value as number), 'الإيرادات'];
                  return [value, 'المبيعات'];
                }}
              />
              <Bar dataKey="sales" fill="#3B82F6" name="المبيعات" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <StarIcon className="h-5 w-5 text-yellow-500" />
          تفاصيل أفضل المنتجات
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المنتج</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المبيعات</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topProducts?.map((product, index) => (
                <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{product.sales}</td>
                  <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Performing Products */}
      {stats?.lowPerformingProducts && stats.lowPerformingProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
            المنتجات الأقل أداءً
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المنتج</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المبيعات</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowPerformingProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-red-600">{product.sales}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatPrice(product.revenue)}</td>
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

export default ProductsAnalytics;
