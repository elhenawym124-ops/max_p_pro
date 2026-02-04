import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';
import {
  Award,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://maxp-ai.pro/api/v1';

interface RewardDetails {
  id: string;
  rewardName: string;
  rewardCategory: string;
  calculatedValue: number;
  calculationDetails?: string;
  status: string;
  appliedMonth: number;
  appliedYear: number;
  periodStart: string;
  periodEnd: string;
  reason?: string;
  eligibilityMet?: string;
  isIncludedInPayroll: boolean;
  isLocked: boolean;
  approvedBy?: string;
  approvedAt?: string;
  appliedAt?: string;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    phone?: string;
    departmentRelation?: { name: string };
    positionRelation?: { title: string };
  };
  rewardType: {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: string;
    calculationMethod: string;
    value: number;
    frequency: string;
    triggerType: string;
  };
}

const RewardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<RewardDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRewardDetails();
    }
  }, [id]);

  const fetchRewardDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/hr/rewards/records/${id}`);

      if (response.data.success) {
        setReward(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching reward details:', err);
      setError(err.response?.data?.message || 'فشل في تحميل تفاصيل المكافأة');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('هل أنت متأكد من اعتماد هذه المكافأة؟')) return;

    try {
      setActionLoading(true);
      await apiClient.patch(`/hr/rewards/approve/${id}`, {});

      alert('تم اعتماد المكافأة بنجاح');
      fetchRewardDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل في اعتماد المكافأة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('أدخل سبب الرفض:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await apiClient.patch(`/hr/rewards/reject/${id}`, { reason });

      alert('تم رفض المكافأة');
      fetchRewardDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل في رفض المكافأة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه المكافأة؟')) return;

    try {
      setActionLoading(true);
      await apiClient.delete(`/hr/rewards/records/${id}`);

      alert('تم حذف المكافأة بنجاح');
      navigate('/hr/rewards');
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل في حذف المكافأة');
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      PENDING: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      APPROVED: { label: 'معتمد', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      APPLIED: { label: 'مطبق', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      VOIDED: { label: 'ملغي', className: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${config.className}`}>
        <Icon className="w-5 h-5" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">جاري تحميل التفاصيل...</p>
        </div>
      </div>
    );
  }

  if (error || !reward) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">حدث خطأ</h3>
          <p className="text-gray-600 mb-4">{error || 'المكافأة غير موجودة'}</p>
          <button
            onClick={() => navigate('/hr/rewards')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hr/rewards')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-8 h-8 text-blue-600" />
              تفاصيل المكافأة
            </h1>
            <p className="text-gray-600 mt-1">عرض كامل تفاصيل المكافأة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reward.status === 'PENDING' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                اعتماد
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                رفض
              </button>
              <button
                onClick={() => navigate(`/hr/rewards/edit/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-5 h-5" />
                تعديل
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                حذف
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">حالة المكافأة</h2>
            {getStatusBadge(reward.status)}
          </div>
          {reward.isIncludedInPayroll && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-800 font-medium">مدرجة في كشف الرواتب</p>
            </div>
          )}
          {reward.isLocked && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-800 font-medium">مقفلة - لا يمكن التعديل</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              معلومات الموظف
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">الاسم</p>
                <p className="text-base font-medium text-gray-900">
                  {reward.user.firstName} {reward.user.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">رقم الموظف</p>
                <p className="text-base font-medium text-gray-900">{reward.user.employeeNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                <p className="text-base font-medium text-gray-900">{reward.user.email}</p>
              </div>
              {reward.user.departmentRelation && (
                <div>
                  <p className="text-sm text-gray-600">القسم</p>
                  <p className="text-base font-medium text-gray-900">{reward.user.departmentRelation.name}</p>
                </div>
              )}
              {reward.user.positionRelation && (
                <div>
                  <p className="text-sm text-gray-600">المنصب</p>
                  <p className="text-base font-medium text-gray-900">{reward.user.positionRelation.title}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reward Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              تفاصيل المكافأة
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">اسم المكافأة</p>
                <p className="text-base font-medium text-gray-900">{reward.rewardName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">التصنيف</p>
                <p className="text-base font-medium text-gray-900">{reward.rewardCategory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">القيمة المحسوبة</p>
                <p className="text-2xl font-bold text-green-600">
                  {reward.calculatedValue.toLocaleString()} ج.م
                </p>
              </div>
              {reward.reason && (
                <div>
                  <p className="text-sm text-gray-600">السبب</p>
                  <p className="text-base text-gray-900">{reward.reason}</p>
                </div>
              )}
              {reward.calculationDetails && (
                <div>
                  <p className="text-sm text-gray-600">تفاصيل الحساب</p>
                  <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(JSON.parse(reward.calculationDetails), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              الفترة الزمنية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">تاريخ البداية</p>
                <p className="text-base font-medium text-gray-900">
                  {new Date(reward.periodStart).toLocaleDateString('ar-EG')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">تاريخ النهاية</p>
                <p className="text-base font-medium text-gray-900">
                  {new Date(reward.periodEnd).toLocaleDateString('ar-EG')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الشهر المطبق</p>
                <p className="text-base font-medium text-gray-900">
                  {reward.appliedMonth}/{reward.appliedYear}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reward Type Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              نوع المكافأة
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">الاسم</p>
                <p className="text-base font-medium text-gray-900">{reward.rewardType.name}</p>
              </div>
              {reward.rewardType.nameAr && (
                <div>
                  <p className="text-sm text-gray-600">الاسم بالعربية</p>
                  <p className="text-base font-medium text-gray-900">{reward.rewardType.nameAr}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">طريقة الحساب</p>
                <p className="text-base font-medium text-gray-900">{reward.rewardType.calculationMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">التكرار</p>
                <p className="text-base font-medium text-gray-900">{reward.rewardType.frequency}</p>
              </div>
              {reward.rewardType.description && (
                <div>
                  <p className="text-sm text-gray-600">الوصف</p>
                  <p className="text-sm text-gray-700">{reward.rewardType.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">السجل الزمني</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">تم الإنشاء</p>
                  <p className="text-xs text-gray-600">
                    {new Date(reward.createdAt).toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>

              {reward.approvedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">تم الاعتماد</p>
                    <p className="text-xs text-gray-600">
                      {new Date(reward.approvedAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
              )}

              {reward.appliedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">تم التطبيق</p>
                    <p className="text-xs text-gray-600">
                      {new Date(reward.appliedAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
              )}

              {reward.voidedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">تم الإلغاء</p>
                    <p className="text-xs text-gray-600">
                      {new Date(reward.voidedAt).toLocaleString('ar-EG')}
                    </p>
                    {reward.voidReason && (
                      <p className="text-xs text-gray-600 mt-1">السبب: {reward.voidReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardDetails;
