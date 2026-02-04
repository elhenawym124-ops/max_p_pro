import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, FileText, AlertCircle, TrendingDown,
  Clock, CheckCircle, XCircle, Info, Loader2
} from 'lucide-react';
import api from '../../services/api';

interface Deduction {
  id: string;
  type: string;
  category?: string;
  amount: number;
  reason: string;
  description?: string;
  date: string;
  effectiveMonth: number;
  effectiveYear: number;
  status: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  appliedToPayroll: boolean;
  notes?: string;
  createdAt: string;
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
  PENDING: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  APPROVED: { label: 'موافق عليه', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  REJECTED: { label: 'مرفوض', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  APPLIED: { label: 'تم التطبيق', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
  CANCELLED: { label: 'ملغي', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XCircle }
};

const MyDeductions: React.FC = () => {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [filteredDeductions, setFilteredDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDeductions();
  }, [deductions, filterStatus, filterMonth, filterYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deductionsRes, statsRes] = await Promise.all([
        api.get('/employee/my-deductions'),
        api.get('/employee/my-deductions/stats')
      ]);

      if (deductionsRes.data.success) {
        setDeductions(deductionsRes.data.deductions);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('Error loading deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDeductions = () => {
    let filtered = [...deductions];

    if (filterStatus) {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (filterMonth && filterYear) {
      filtered = filtered.filter(d =>
        d.effectiveMonth === parseInt(filterMonth) &&
        d.effectiveYear === parseInt(filterYear)
      );
    }

    setFilteredDeductions(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400 ml-3" />
          خصوماتي
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          عرض وتتبع الخصومات المطبقة على راتبك
        </p>
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
              <DollarSign className="h-8 w-8 text-red-600" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">تم التطبيق</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.find((s: any) => s.status === 'APPLIED')?._count || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Deductions List */}
      <div className="space-y-4">
        {filteredDeductions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              لا توجد خصومات
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              لم يتم تسجيل أي خصومات حتى الآن
            </p>
          </div>
        ) : (
          filteredDeductions.map((deduction) => {
            const StatusIcon = DEDUCTION_STATUS[deduction.status as keyof typeof DEDUCTION_STATUS]?.icon || Info;
            
            return (
              <div
                key={deduction.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {DEDUCTION_TYPES[deduction.type as keyof typeof DEDUCTION_TYPES]}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${DEDUCTION_STATUS[deduction.status as keyof typeof DEDUCTION_STATUS]?.color}`}>
                          <StatusIcon className="h-3 w-3 inline ml-1" />
                          {DEDUCTION_STATUS[deduction.status as keyof typeof DEDUCTION_STATUS]?.label}
                        </span>
                        {deduction.category && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {deduction.category}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {deduction.reason}
                      </p>

                      <div className="flex items-center space-x-6 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 ml-1" />
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(deduction.amount)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 ml-1" />
                          <span>
                            {deduction.effectiveMonth}/{deduction.effectiveYear}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 ml-1" />
                          <span>{formatDate(deduction.date)}</span>
                        </div>
                      </div>

                      {deduction.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <p className="text-sm text-red-800 dark:text-red-400">
                            <strong>سبب الرفض:</strong> {deduction.rejectionReason}
                          </p>
                        </div>
                      )}

                      {deduction.appliedToPayroll && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          <p className="text-sm text-blue-800 dark:text-blue-400">
                            <CheckCircle className="h-4 w-4 inline ml-1" />
                            تم تطبيق هذا الخصم على الراتب
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDeduction(deduction);
                        setShowDetailsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">النوع</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {DEDUCTION_TYPES[selectedDeduction.type as keyof typeof DEDUCTION_TYPES]}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">المبلغ</p>
                    <p className="text-base font-medium text-red-600 dark:text-red-400">
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">التاريخ</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedDeduction.date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">التاريخ الفعلي</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDeduction.effectiveMonth}/{selectedDeduction.effectiveYear}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">الحالة</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${DEDUCTION_STATUS[selectedDeduction.status as keyof typeof DEDUCTION_STATUS]?.color}`}>
                      {DEDUCTION_STATUS[selectedDeduction.status as keyof typeof DEDUCTION_STATUS]?.label}
                    </span>
                  </div>

                  {selectedDeduction.approvedAt && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">تاريخ الموافقة</p>
                      <p className="text-base text-green-600 dark:text-green-400">
                        {formatDate(selectedDeduction.approvedAt)}
                      </p>
                    </div>
                  )}

                  {selectedDeduction.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">سبب الرفض</p>
                      <p className="text-base text-red-600 dark:text-red-400">
                        {selectedDeduction.rejectionReason}
                      </p>
                    </div>
                  )}

                  {selectedDeduction.appliedToPayroll && (
                    <div className="col-span-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                          <CheckCircle className="h-4 w-4 inline ml-1" />
                          تم تطبيق هذا الخصم على الراتب
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeductions;
