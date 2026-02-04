import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { apiClient } from '../../services/apiClient';
import {
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ShippingReportData {
  orderId: string;
  orderNumber: string;
  actualCost: number;
  customerCost: number;
  difference: number;
  status: string;
  trackingNumber: string;
  createdAt: string;
}

interface ShippingStatistics {
  totalOrders: number;
  ordersWithCost: number;
  totalActual: number;
  totalCustomer: number;
  totalDifference: number;
  avgActual: number;
  avgCustomer: number;
}

const ShippingReport: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ShippingReportData[]>([]);
  const [statistics, setStatistics] = useState<ShippingStatistics | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchReport();
  }, [isAuthenticated, filters]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/turbo/reports/shipping?${params.toString()}`);
      if (response.data.success) {
        setReportData(response.data.data.orders);
        setStatistics(response.data.data.statistics);
      }
    } catch (error: any) {
      console.error('Error fetching shipping report:', error);
      alert(error.response?.data?.error || 'فشل جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      params.append('export', 'csv');

      const response = await apiClient.get(`/turbo/reports/shipping?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `turbo-shipping-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      alert('فشل تصدير التقرير');
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') return 'bg-green-100 text-green-800';
    if (statusLower === 'cancelled' || statusLower === 'returned') return 'bg-red-100 text-red-800';
    if (statusLower === 'in_transit' || statusLower === 'out_for_delivery') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status?: string) => {
    if (!status) return 'غير محدد';
    const statusMap: { [key: string]: string } = {
      'created': 'تم الإنشاء',
      'picked_up': 'تم الاستلام',
      'in_transit': 'قيد النقل',
      'out_for_delivery': 'في الطريق للتسليم',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغاة',
      'returned': 'مرتجعة'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-blue-500 ml-2" />
              تقرير الشحن - مقارنة الأسعار
            </h1>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="w-5 h-5 ml-2" />
              تصدير إلى Excel (CSV)
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">جميع الحالات</option>
                <option value="created">تم الإنشاء</option>
                <option value="picked_up">تم الاستلام</option>
                <option value="in_transit">قيد النقل</option>
                <option value="out_for_delivery">في الطريق للتسليم</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغاة</option>
                <option value="returned">مرتجعة</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-sm font-medium text-gray-700">إجمالي الطلبات</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{statistics.totalOrders}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <div className="text-sm font-medium text-gray-700">إجمالي السعر الفعلي</div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {formatPrice(statistics.totalActual)} EGP
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-500">
                <div className="text-sm font-medium text-gray-700">إجمالي سعر العميل</div>
                <div className="text-2xl font-bold text-gray-600 mt-1">
                  {formatPrice(statistics.totalCustomer)} EGP
                </div>
              </div>
              <div className={`p-4 rounded-lg border-l-4 ${
                statistics.totalDifference > 0 
                  ? 'bg-red-50 border-red-500' 
                  : statistics.totalDifference < 0 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-gray-50 border-gray-500'
              }`}>
                <div className="text-sm font-medium text-gray-700">إجمالي الفرق</div>
                <div className={`text-2xl font-bold mt-1 ${
                  statistics.totalDifference > 0 
                    ? 'text-red-600' 
                    : statistics.totalDifference < 0 
                    ? 'text-green-600' 
                    : 'text-gray-600'
                }`}>
                  {statistics.totalDifference > 0 ? '+' : ''}
                  {formatPrice(statistics.totalDifference)} EGP
                </div>
              </div>
            </div>
          )}

          {/* Report Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">جاري تحميل التقرير...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">لا توجد طلبات مع كود Turbo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم الطلب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      كود Turbo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      السعر الفعلي
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      سعر العميل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الفرق
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((row) => (
                    <tr key={row.orderId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/orders/details/${row.orderNumber}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          #{row.orderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.trackingNumber || '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.actualCost > 0 ? (
                          <span className="font-bold text-blue-600">
                            {formatPrice(row.actualCost)} EGP
                          </span>
                        ) : (
                          <span className="text-gray-500">غير متوفر</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPrice(row.customerCost)} EGP
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.actualCost > 0 ? (
                          <span className={`font-bold ${
                            row.difference > 0 
                              ? 'text-red-600' 
                              : row.difference < 0 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                          }`}>
                            {row.difference > 0 ? '+' : ''}
                            {formatPrice(row.difference)} EGP
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                          {getStatusText(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingReport;


