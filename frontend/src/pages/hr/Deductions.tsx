import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Search, Eye, Trash2,
  Check, X, Clock, AlertCircle, TrendingDown,
  CheckCircle, Loader2
} from 'lucide-react';
import api from '../../services/api';

interface Deduction {
  id: string;
  employeeId: string;
  type: string;
  category?: string;
  amount: number;
  reason: string;
  description?: string;
  date: string;
  effectiveMonth: number;
  effectiveYear: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  appliedToPayroll: boolean;
  payrollId?: string;
  notes?: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber?: string;
  };
}

const DEDUCTION_TYPES = {
  PENALTY: 'غرامة',
  VIOLATION: 'مخالفة',
  DAMAGE: 'تعويض عن ضرر',
  INSURANCE: 'تأمين',
  LOAN_REPAYMENT: 'سداد قرض',
  ADVANCE_REPAYMENT: 'سداد سلفة',
  TAX: 'ضريبة',
  SOCIAL_INSURANCE: 'تأمينات اجتماعية',
  ABSENCE: 'غياب',
  LATE: 'تأخير',
  EARLY_LEAVE: 'خروج مبكر',
  OTHER: 'أخرى'
};

const DEDUCTION_STATUS = {
  PENDING: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  APPROVED: { label: 'موافق عليه', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED: { label: 'مرفوض', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  APPLIED: { label: 'تم التطبيق', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  CANCELLED: { label: 'ملغي', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
};

const Deductions: React.FC = () => {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [filteredDeductions, setFilteredDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  const [createForm, setCreateForm] = useState({
    employeeId: '',
    type: 'OTHER',
    category: '',
    amount: '',
    reason: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    effectiveMonth: new Date().getMonth() + 1,
    effectiveYear: new Date().getFullYear(),
    notes: ''
  });

  useEffect(() => {
    loadData();
    loadEmployees();
  }, []);

  useEffect(() => {
    filterDeductions();
  }, [deductions, searchTerm, filterStatus, filterType, filterMonth, filterYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deductionsRes, statsRes] = await Promise.all([
        api.get('/hr/deductions'),
        api.get('/hr/deductions/stats')
      ]);

      if (deductionsRes.data.success) {
        setDeductions(deductionsRes.data.deductions);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (error: any) {
      console.error('❌ Error loading deductions:', error);
      const errorMsg = error.response?.data?.error || error.message || 'حدث خطأ أثناء جلب الخصومات';
      const details = error.response?.data?.details || '';
      alert(`${errorMsg}\n${details ? `التفاصيل: ${details}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get('/hr/employees');
      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const filterDeductions = () => {
    let filtered = [...deductions];

    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.employee?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.employee?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.employee?.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (filterType) {
      filtered = filtered.filter(d => d.type === filterType);
    }

    if (filterMonth && filterYear) {
      filtered = filtered.filter(d =>
        d.effectiveMonth === parseInt(filterMonth) &&
        d.effectiveYear === parseInt(filterYear)
      );
    }

    setFilteredDeductions(filtered);
  };

  const handleCreateDeduction = async () => {
    try {
      // Client-side validation
      if (!createForm.employeeId) {
        alert('يرجى اختيار موظف');
        return;
      }
      
      if (!createForm.amount || parseFloat(createForm.amount) <= 0) {
        alert('يرجى إدخال مبلغ صحيح أكبر من صفر');
        return;
      }
      
      if (!createForm.reason || createForm.reason.trim().length < 5) {
        alert('يرجى إدخال سبب الخصم (5 أحرف على الأقل)');
        return;
      }
      
      console.log('📤 Sending deduction data:', createForm);
      const response = await api.post('/hr/deductions', createForm);
      if (response.data.success) {
        alert('تم إنشاء الخصم بنجاح');
        setShowCreateModal(false);
        resetCreateForm();
        loadData();
      }
    } catch (error: any) {
      console.error('Error creating deduction:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = error.response?.data?.error || 'حدث خطأ أثناء إنشاء الخصم';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors
          .map((err: any) => `${err.field}: ${err.message}`)
          .join('\n');
        errorMessage += '\n\nأخطاء التحقق:\n' + validationErrors;
      }
      
      alert(errorMessage);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('هل أنت متأكد من الموافقة على هذا الخصم؟')) return;

    try {
      const response = await api.post(`/hr/deductions/${id}/approve`);
      if (response.data.success) {
        alert('تمت الموافقة على الخصم بنجاح');
        loadData();
      }
    } catch (error: any) {
      console.error('Error approving deduction:', error);
      alert(error.response?.data?.error || 'حدث خطأ أثناء الموافقة');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('أدخل سبب الرفض:');
    if (!reason) return;

    try {
      const response = await api.post(`/hr/deductions/${id}/reject`, { reason });
      if (response.data.success) {
        alert('تم رفض الخصم بنجاح');
        loadData();
      }
    } catch (error: any) {
      console.error('Error rejecting deduction:', error);
      alert(error.response?.data?.error || 'حدث خطأ أثناء الرفض');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخصم؟')) return;

    try {
      const response = await api.delete(`/hr/deductions/${id}`);
      if (response.data.success) {
        alert('تم حذف الخصم بنجاح');
        loadData();
      }
    } catch (error: any) {
      console.error('Error deleting deduction:', error);
      alert(error.response?.data?.error || 'حدث خطأ أثناء الحذف');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      employeeId: '',
      type: 'OTHER',
      category: '',
      amount: '',
      reason: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      effectiveMonth: new Date().getMonth() + 1,
      effectiveYear: new Date().getFullYear(),
      notes: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400 ml-3" />
            إدارة الخصومات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة الخصومات اليدوية للموظفين
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة خصم جديد
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الخصومات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المبلغ</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(parseFloat(stats.totalAmount))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.find((s: any) => s.status === 'PENDING')?._count || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">موافق عليها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.find((s: any) => s.status === 'APPROVED')?._count || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              بحث
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن موظف أو سبب..."
                className="w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الحالة
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">الكل</option>
              <option value="PENDING">في الانتظار</option>
              <option value="APPROVED">موافق عليه</option>
              <option value="REJECTED">مرفوض</option>
              <option value="APPLIED">تم التطبيق</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              النوع
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">الكل</option>
              {Object.entries(DEDUCTION_TYPES).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الشهر
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">الكل</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              السنة
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">الكل</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Deductions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  الموظف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  السبب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  التاريخ الفعلي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDeductions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                    <p>لا توجد خصومات</p>
                  </td>
                </tr>
              ) : (
                filteredDeductions.map((deduction) => (
                  <tr key={deduction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {deduction.employee?.firstName} {deduction.employee?.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {deduction.employee?.employeeNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {DEDUCTION_TYPES[deduction.type as keyof typeof DEDUCTION_TYPES]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(deduction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {deduction.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {deduction.effectiveMonth}/{deduction.effectiveYear}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${DEDUCTION_STATUS[deduction.status as keyof typeof DEDUCTION_STATUS]?.color}`}>
                        {DEDUCTION_STATUS[deduction.status as keyof typeof DEDUCTION_STATUS]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedDeduction(deduction);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-5 w-5" />
                        </button>

                        {deduction.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(deduction.id)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400"
                              title="موافقة"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleReject(deduction.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title="رفض"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        )}

                        {!deduction.appliedToPayroll && (
                          <button
                            onClick={() => handleDelete(deduction.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                            title="حذف"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إضافة خصم جديد</h3>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الموظف *
                    </label>
                    <select
                      value={createForm.employeeId}
                      onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">اختر موظف</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      النوع *
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(DEDUCTION_TYPES).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      المبلغ *
                    </label>
                    <input
                      type="number"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      التصنيف الفرعي
                    </label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="مثال: مخالفة مرورية"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الشهر الفعلي *
                    </label>
                    <select
                      value={createForm.effectiveMonth}
                      onChange={(e) => setCreateForm({ ...createForm, effectiveMonth: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      السنة الفعلية *
                    </label>
                    <select
                      value={createForm.effectiveYear}
                      onChange={(e) => setCreateForm({ ...createForm, effectiveYear: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      السبب *
                    </label>
                    <input
                      type="text"
                      value={createForm.reason}
                      onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="سبب الخصم"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الوصف
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="تفاصيل إضافية..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ملاحظات
                    </label>
                    <textarea
                      value={createForm.notes}
                      onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="ملاحظات داخلية..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateDeduction}
                  disabled={!createForm.employeeId || !createForm.amount || !createForm.reason}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDeduction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">تفاصيل الخصم</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">الموظف</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDeduction.employee?.firstName} {selectedDeduction.employee?.lastName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">رقم الموظف</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDeduction.employee?.employeeNumber}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">النوع</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {DEDUCTION_TYPES[selectedDeduction.type as keyof typeof DEDUCTION_TYPES]}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">المبلغ</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedDeduction.amount)}
                    </p>
                  </div>

                  {selectedDeduction.category && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">التصنيف</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">
                        {selectedDeduction.category}
                      </p>
                    </div>
                  )}

                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">السبب</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDeduction.reason}
                    </p>
                  </div>

                  {selectedDeduction.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">الوصف</p>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedDeduction.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">التاريخ الفعلي</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDeduction.effectiveMonth}/{selectedDeduction.effectiveYear}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">الحالة</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${DEDUCTION_STATUS[selectedDeduction.status as keyof typeof DEDUCTION_STATUS]?.color}`}>
                      {DEDUCTION_STATUS[selectedDeduction.status as keyof typeof DEDUCTION_STATUS]?.label}
                    </span>
                  </div>

                  {selectedDeduction.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">سبب الرفض</p>
                      <p className="text-base text-red-600 dark:text-red-400">
                        {selectedDeduction.rejectionReason}
                      </p>
                    </div>
                  )}

                  {selectedDeduction.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">ملاحظات</p>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedDeduction.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deductions;
