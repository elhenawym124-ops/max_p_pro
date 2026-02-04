import { useState, useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager';
import { 
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Calendar,
  PieChart,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface BillingData {
  totalRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  revenueByType: any[];
  revenueByPlan: any[];
  failedPayments: any[];
}

export default function BillingOverview() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchBillingData();
  }, [dateRange]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      if (!token) return;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await axios.get(`${API_URL}/api/v1/super-admin/platform/billing-overview`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('خطأ في جلب بيانات الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value.toString());
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PLATFORM_FEE: 'رسوم المنصة',
      APP_SUBSCRIPTION: 'اشتراكات الأدوات',
      APP_USAGE: 'استخدام الأدوات',
      WALLET_RECHARGE: 'شحن المحفظة',
      REFUND: 'استرداد',
      ADJUSTMENT: 'تعديل'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            لا توجد بيانات
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نظرة عامة على الفواتير</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                تحليلات الإيرادات والفواتير
              </p>
            </div>
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 90 يوم</option>
                <option value="365">آخر سنة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
              <TrendingUp size={24} />
            </div>
            <p className="text-blue-100 text-sm mb-1">إجمالي الإيرادات</p>
            <p className="text-3xl font-bold">
              {toNumber(data.totalRevenue).toLocaleString('ar-EG')} ج
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Calendar size={32} />
              <TrendingUp size={24} />
            </div>
            <p className="text-purple-100 text-sm mb-1">MRR (الإيرادات الشهرية)</p>
            <p className="text-3xl font-bold">
              {toNumber(data.mrr).toLocaleString('ar-EG')} ج
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} />
              <TrendingUp size={24} />
            </div>
            <p className="text-green-100 text-sm mb-1">الاشتراكات النشطة</p>
            <p className="text-3xl font-bold">
              {data.activeSubscriptions}
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle size={32} />
              <TrendingUp size={24} />
            </div>
            <p className="text-red-100 text-sm mb-1">الدفعات الفاشلة</p>
            <p className="text-3xl font-bold">
              {data.failedPayments.length}
            </p>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <PieChart size={24} />
              الإيرادات حسب النوع
            </h2>
            <div className="space-y-4">
              {data.revenueByType.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {getTypeLabel(item.type)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item._count} عملية
                    </div>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {toNumber(item._sum.amount).toLocaleString('ar-EG')} ج
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BarChart3 size={24} />
              الإيرادات حسب الخطة
            </h2>
            <div className="space-y-4">
              {data.revenueByPlan.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {item.plan}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item._count} اشتراك
                    </div>
                  </div>
                  <div className="text-lg font-bold text-purple-600">
                    {toNumber(item._sum.monthlyFee).toLocaleString('ar-EG')} ج/شهر
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Failed Payments */}
        {data.failedPayments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <AlertTriangle size={24} className="text-red-600" />
              الدفعات الفاشلة
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      الشركة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      المبلغ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      التاريخ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      الوصف
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.failedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {payment.company.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {payment.company.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {getTypeLabel(payment.type)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-bold">
                          {toNumber(payment.amount).toLocaleString('ar-EG')} ج
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {payment.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
