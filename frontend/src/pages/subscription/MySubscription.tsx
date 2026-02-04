import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  DollarSign,
  Package
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface PlatformSubscription {
  id: string;
  plan: string;
  monthlyFee: number;
  status: string;
  billingDay: number;
  nextBillingDate: string;
  lastBillingDate?: string;
  failedAttempts: number;
  createdAt: string;
  company: {
    name: string;
    plan: string;
  };
}

interface BillingHistoryItem {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export default function MySubscription() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchBillingHistory();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        navigate('/auth/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/v1/platform-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSubscription(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('لا يوجد اشتراك نشط');
      } else {
        console.error('Error fetching subscription:', error);
        toast.error('خطأ في جلب بيانات الاشتراك');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/api/v1/platform-subscription/billing-history?type=PLATFORM_FEE&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setBillingHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    }
  };

  const handleCancelSubscription = async () => {
    const token = tokenManager.getAccessToken();
    if (!token) return;

    try {
      setCancelling(true);
      const response = await axios.post(
        `${API_URL}/api/v1/platform-subscription/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('تم إلغاء الاشتراك بنجاح');
        setShowCancelModal(false);
        fetchSubscription();
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.response?.data?.message || 'خطأ في إلغاء الاشتراك');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, text: 'نشط' },
      SUSPENDED: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle, text: 'معلق' },
      CANCELLED: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, text: 'ملغي' },
      PAST_DUE: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, text: 'متأخر' }
    };

    const defaultBadge = { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: AlertCircle, text: 'غير معروف' };
    const badge = badges[status] || defaultBadge;
    const Icon = badge.icon;

    return (
      <span className={`${badge.color} px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit`}>
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      BASIC: 'الخطة الأساسية',
      PRO: 'الخطة الاحترافية',
      ENTERPRISE: 'خطة المؤسسات'
    };
    return names[plan] || plan;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PLATFORM_FEE: 'رسوم المنصة',
      APP_SUBSCRIPTION: 'اشتراك أداة',
      APP_USAGE: 'استخدام أداة',
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

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md text-center">
          <Package className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            لا يوجد اشتراك نشط
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            اختر خطة مناسبة لبدء استخدام المنصة
          </p>
          <button
            onClick={() => navigate('/subscription/plans')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            عرض الخطط المتاحة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">اشتراكي في المنصة</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            إدارة اشتراكك وعرض سجل الفواتير
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{getPlanName(subscription.plan)}</h2>
              {getStatusBadge(subscription.status)}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{subscription.monthlyFee} ج</div>
              <div className="text-blue-100">شهرياً</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <Calendar size={20} />
                <span className="text-sm">الفاتورة القادمة</span>
              </div>
              <div className="text-xl font-bold">
                {new Date(subscription.nextBillingDate).toLocaleDateString('ar-EG')}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <Clock size={20} />
                <span className="text-sm">يوم الخصم</span>
              </div>
              <div className="text-xl font-bold">
                اليوم {subscription.billingDay} من كل شهر
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <CreditCard size={20} />
                <span className="text-sm">آخر فاتورة</span>
              </div>
              <div className="text-xl font-bold">
                {subscription.lastBillingDate 
                  ? new Date(subscription.lastBillingDate).toLocaleDateString('ar-EG')
                  : 'لا توجد'}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate('/subscription/plans')}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <TrendingUp size={20} />
              ترقية الخطة
            </button>
            <button
              onClick={() => navigate('/subscription/usage')}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              عرض الاستخدام
            </button>
            {subscription.status === 'ACTIVE' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="bg-red-500/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-500/30 transition-colors"
              >
                إلغاء الاشتراك
              </button>
            )}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DollarSign size={24} />
            سجل الفواتير
          </h2>

          {billingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد فواتير بعد
            </div>
          ) : (
            <div className="space-y-4">
              {billingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      item.status === 'SUCCESS' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    }`}>
                      {item.status === 'SUCCESS' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {item.description}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getTypeLabel(item.type)} • {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    item.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.amount} ج
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              تأكيد إلغاء الاشتراك
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              هل أنت متأكد من إلغاء اشتراكك؟ سيتم إيقاف الخدمة في نهاية الفترة المدفوعة.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-red-400"
              >
                {cancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
