import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';
import {
  Award,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

const API_URL = (import.meta as any).env['VITE_API_URL'] || 'https://maxp-ai.pro/api/v1';

interface RewardRecord {
  id: string;
  rewardName: string;
  rewardCategory: string;
  calculatedValue: number;
  status: string;
  appliedMonth: number;
  appliedYear: number;
  periodStart: string;
  periodEnd: string;
  reason?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    departmentRelation?: { name: string };
  };
  rewardType: {
    name: string;
    nameAr?: string;
    category: string;
  };
}

interface Statistics {
  total: number;
  totalValue: number;
  byStatus: Array<{ status: string; count: number; value: number }>;
  byCategory: Array<{ category: string; count: number; value: number }>;
}

const RewardsList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<RewardRecord[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    month: '',
    year: new Date().getFullYear().toString(),
    userId: '',
    rewardTypeId: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchRewards();
    fetchStatistics();
  }, [pagination.page, filters]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await apiClient.get(`/hr/rewards/records?${params}`);

      if (response.data.success) {
        setRecords(response.data.records || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.response?.data?.message || 'فشل في تحميل المكافآت');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year
      });

      const response = await apiClient.get(`/hr/rewards/statistics?${params}`);

      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const handleStatusUpdate = async (id: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      await apiClient.patch(`/hr/rewards/${action}/${id}`);
      alert(action === 'approve' ? 'تم اعتماد المكافأة' : 'تم رفض المكافأة');
      fetchRewards();
      fetchStatistics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث الحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المكافأة؟')) return;

    try {
      await apiClient.delete(`/hr/rewards/records/${id}`);

      fetchRewards();
      fetchStatistics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل في حذف المكافأة');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      PENDING: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'معتمد', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      APPLIED: { label: 'مطبق', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-800', icon: XCircle },
      VOIDED: { label: 'ملغي', className: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig['PENDING'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { label: string; className: string }> = {
      ATTENDANCE: { label: 'حضور وانضباط', className: 'bg-blue-100 text-blue-800' },
      PERFORMANCE: { label: 'أداء متميز', className: 'bg-purple-100 text-purple-800' },
      ACHIEVEMENT: { label: 'إنجاز', className: 'bg-green-100 text-green-800' },
      SEASONAL: { label: 'موسمية', className: 'bg-orange-100 text-orange-800' },
      TEAM_BASED: { label: 'فريق', className: 'bg-indigo-100 text-indigo-800' },
      COMPANY_WIDE: { label: 'عامة', className: 'bg-pink-100 text-pink-800' },
      TARGET_ACHIEVEMENT: { label: 'تحقيق تارجت', className: 'bg-emerald-100 text-emerald-800' },
      TARGET_EXCEED: { label: 'تجاوز تارجت', className: 'bg-cyan-100 text-cyan-800' },
      PUNCTUALITY: { label: 'التزام بالمواعيد', className: 'bg-sky-100 text-sky-800' },
      NO_ABSENCE: { label: 'عدم غياب', className: 'bg-teal-100 text-teal-800' },
      QUALITY: { label: 'جودة العمل', className: 'bg-violet-100 text-violet-800' },
      EMPLOYEE_OF_MONTH: { label: 'موظف الشهر', className: 'bg-amber-100 text-amber-800' },
      INITIATIVE: { label: 'مبادرة مميزة', className: 'bg-rose-100 text-rose-800' },
      PROJECT_SUCCESS: { label: 'مشروع ناجح', className: 'bg-lime-100 text-lime-800' },
      SALES: { label: 'مبيعات', className: 'bg-blue-100 text-blue-800' },
      ADMINISTRATIVE: { label: 'مكافأة إدارية', className: 'bg-slate-100 text-slate-800' },
      OTHER: { label: 'أخرى', className: 'bg-gray-100 text-gray-800' }
    };

    const config = categoryConfig[category] || categoryConfig['OTHER'];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل المكافآت...</p>
        </div>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">حدث خطأ</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchRewards()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-8 h-8 text-blue-600" />
            إدارة المكافآت
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">عرض وإدارة جميع مكافآت الموظفين</p>
        </div>
        <button
          onClick={() => navigate('/hr/rewards/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة مكافأة
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المكافآت</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.total}</p>
              </div>
              <Award className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">القيمة الإجمالية</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalValue.toLocaleString()} ج.م
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">معتمد</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.byStatus.find(s => s.status === 'APPROVED')?.count || 0}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">قيد الانتظار</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statistics.byStatus.find(s => s.status === 'PENDING')?.count || 0}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter className="w-5 h-5" />
            الفلاتر
          </button>
          <button
            onClick={() => {
              setFilters({
                search: '',
                status: '',
                category: '',
                month: '',
                year: new Date().getFullYear().toString(),
                userId: '',
                rewardTypeId: ''
              });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            إعادة تعيين
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="ابحث..."
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">الكل</option>
                <option value="PENDING">قيد الانتظار</option>
                <option value="APPROVED">معتمد</option>
                <option value="APPLIED">مطبق</option>
                <option value="REJECTED">مرفوض</option>
                <option value="VOIDED">ملغي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التصنيف</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">الكل</option>
                <option value="ATTENDANCE">حضور</option>
                <option value="PERFORMANCE">أداء</option>
                <option value="ACHIEVEMENT">إنجاز</option>
                <option value="SEASONAL">موسمية</option>
                <option value="TEAM_BASED">فريق</option>
                <option value="COMPANY_WIDE">عامة</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السنة</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا توجد مكافآت</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">لم يتم العثور على أي مكافآت بالفلاتر المحددة</p>
          <button
            onClick={() => navigate('/hr/rewards/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إضافة مكافأة جديدة
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المكافأة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التصنيف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القيمة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.user.firstName} {record.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{record.user.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.rewardType?.nameAr || record.rewardName}
                      </div>
                      {record.reason && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{record.reason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(record.rewardCategory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {record.calculatedValue.toLocaleString()} ج.م
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.appliedMonth}/{record.appliedYear}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/hr/rewards/${record.id}`)}
                          className="text-blue-600 hover:text-blue-700"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {record.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(record.id, 'approve')}
                              className="text-green-600 hover:text-green-700"
                              title="اعتماد"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(record.id, 'reject')}
                              className="text-orange-600 hover:text-orange-700"
                              title="رفض"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/hr/rewards/edit/${record.id}`)}
                              className="text-blue-600 hover:text-blue-700"
                              title="تعديل"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-red-600 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                عرض {((pagination.page - 1) * pagination.limit) + 1} إلى{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} من{' '}
                {pagination.total} نتيجة
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RewardsList;
