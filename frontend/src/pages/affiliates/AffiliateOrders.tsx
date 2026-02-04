import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import {
  PlusIcon,
  EyeIcon,
  ShoppingBagIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  orderSource: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
}

const AffiliateOrders: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    orderSource: ''
  });

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.orderSource) params.orderSource = filters.orderSource;

      const response = await apiClient.get('/affiliates/orders', { params });
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; lightClass: string; darkClass: string }> = {
      PENDING: { label: 'معلق', lightClass: 'bg-yellow-100 text-yellow-800', darkClass: 'bg-yellow-900/50 text-yellow-300' },
      CONFIRMED: { label: 'مؤكد', lightClass: 'bg-blue-100 text-blue-800', darkClass: 'bg-blue-900/50 text-blue-300' },
      DELIVERED: { label: 'تم التسليم', lightClass: 'bg-green-100 text-green-800', darkClass: 'bg-green-900/50 text-green-300' },
      CANCELLED: { label: 'ملغي', lightClass: 'bg-red-100 text-red-800', darkClass: 'bg-red-900/50 text-red-300' }
    };
    const statusInfo = statusMap[status] || { label: status, lightClass: 'bg-gray-100 text-gray-800', darkClass: 'bg-gray-700 text-gray-300' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${isDark ? statusInfo.darkClass : statusInfo.lightClass}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, { label: string; lightClass: string; darkClass: string }> = {
      AFFILIATE_REFERRAL: { label: 'إحالة', lightClass: 'bg-purple-100 text-purple-800', darkClass: 'bg-purple-900/50 text-purple-300' },
      AFFILIATE_DIRECT: { label: 'مباشر', lightClass: 'bg-indigo-100 text-indigo-800', darkClass: 'bg-indigo-900/50 text-indigo-300' },
      REGULAR: { label: 'عادي', lightClass: 'bg-gray-100 text-gray-800', darkClass: 'bg-gray-700 text-gray-300' }
    };
    const sourceInfo = sourceMap[source] || { label: source, lightClass: 'bg-gray-100 text-gray-800', darkClass: 'bg-gray-700 text-gray-300' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${isDark ? sourceInfo.darkClass : sourceInfo.lightClass}`}>
        {sourceInfo.label}
      </span>
    );
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلباتي</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>جميع الطلبات المرتبطة بك</p>
          </div>
          <button
            onClick={() => navigate('/affiliates/orders/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء طلب جديد
          </button>
        </div>

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
              <option value="DELIVERED">تم التسليم</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            <select
              value={filters.orderSource}
              onChange={(e) => setFilters({ ...filters, orderSource: e.target.value })}
              className={`px-4 py-2 border rounded-lg ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">جميع المصادر</option>
              <option value="AFFILIATE_REFERRAL">إحالة</option>
              <option value="AFFILIATE_DIRECT">مباشر</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        {orders.length > 0 ? (
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
                    العميل
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
                    المصدر
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    العمولة
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
                {orders.map((order) => (
                  <tr key={order.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {order.orderNumber}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {order.customer?.firstName} {order.customer?.lastName}
                      <br />
                      <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{order.customer?.phone}</span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSourceBadge(order.orderSource)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {order.commissions && order.commissions.length > 0
                        ? formatPrice(order.commissions[0].amount)
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                      >
                        <EyeIcon className="h-4 w-4" />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBagIcon className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>لا توجد طلبات بعد</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default AffiliateOrders;

