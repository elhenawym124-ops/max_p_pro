import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import {
  CurrencyDollarIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Commission {
  id: string;
  orderId: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  order: {
    orderNumber: string;
    total: number;
  };
  affiliate: {
    affiliateCode: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  merchant: {
    name: string;
  };
}

const CommissionsManagement: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: ''
  });

  useEffect(() => {
    loadCommissions();
  }, [filters]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const response = await apiClient.get('/commissions', { params });
      if (response.data.success) {
        setCommissions(response.data.data.commissions || []);
        setStats(response.data.data.stats);
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب العمولات');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (commissionId: string, status: string) => {
    try {
      const response = await apiClient.put(`/commissions/${commissionId}/status`, { status });
      if (response.data.success) {
        toast.success('تم تحديث الحالة بنجاح');
        loadCommissions();
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="w-full">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>إدارة العمولات</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>عرض وإدارة جميع العمولات</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>إجمالي العمولات</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(stats.totalAmount || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>عمولات المسوقين</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(stats.byType?.AFFILIATE || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>عمولات التجار</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(stats.byType?.MERCHANT || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>عمولات المنصة</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(stats.byType?.PLATFORM || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-6`}>
          <div className="flex items-center gap-4">
            <FunnelIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`px-4 py-2 border rounded-lg ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">معلق</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="PAID">مدفوع</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className={`px-4 py-2 border rounded-lg ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">جميع الأنواع</option>
              <option value="AFFILIATE">مسوق</option>
              <option value="MERCHANT">تاجر</option>
              <option value="PLATFORM">منصة</option>
            </select>
          </div>
        </div>

        {/* Commissions Table */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        {commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    رقم الطلب
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    النوع
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    المستفيد
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    المبلغ
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    الحالة
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    التاريخ
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                {commissions.map((commission) => (
                  <tr key={commission.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {commission.order?.orderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        commission.type === 'AFFILIATE' 
                          ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800' :
                        commission.type === 'MERCHANT' 
                          ? isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800' :
                          isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {commission.type === 'AFFILIATE' ? 'مسوق' :
                         commission.type === 'MERCHANT' ? 'تاجر' : 'منصة'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {commission.affiliate 
                        ? `${commission.affiliate.user.firstName} ${commission.affiliate.user.lastName} (${commission.affiliate.affiliateCode})`
                        : commission.merchant 
                        ? commission.merchant.name
                        : 'المنصة'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatPrice(commission.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        commission.status === 'PAID' 
                          ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800' :
                        commission.status === 'CONFIRMED' 
                          ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800' :
                        commission.status === 'CANCELLED' 
                          ? isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800' :
                          isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {commission.status === 'PAID' ? 'مدفوع' :
                         commission.status === 'CONFIRMED' ? 'مؤكد' :
                         commission.status === 'CANCELLED' ? 'ملغي' : 'معلق'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(commission.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {commission.status === 'CONFIRMED' && (
                        <button
                          onClick={() => updateCommissionStatus(commission.id, 'PAID')}
                          className="text-green-600 hover:text-green-800 flex items-center gap-1 transition"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          تأكيد الدفع
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CurrencyDollarIcon className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>لا توجد عمولات</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CommissionsManagement;

