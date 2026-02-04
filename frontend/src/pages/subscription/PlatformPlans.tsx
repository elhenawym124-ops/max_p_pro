import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Check, 
  Crown, 
  Zap,
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  Brain,
  TrendingUp,
  Shield
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface PlanLimit {
  id: string;
  plan: string;
  maxEmployees: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxCustomers: number;
  maxStorageGB: number;
  maxMessagesPerMonth: number;
  maxAIChatsPerMonth: number;
  hasAdvancedReports: boolean;
  hasAPIAccess: boolean;
  hasPrioritySupport: boolean;
  hasWhiteLabel: boolean;
  hasCustomDomain: boolean;
  monthlyFee: number;
  features: string[];
}

export default function PlatformPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('BASIC');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = tokenManager.getAccessToken();
      const response = await axios.get(`${API_URL}/api/v1/platform-subscription/plans`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setPlans(response.data.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('خطأ في جلب الخطط');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/v1/platform-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCurrentPlan(response.data.data.plan);
      }
    } catch (error) {
      // Subscription might not exist yet
      console.log('No active subscription');
    }
  };

  const handleUpgrade = async (planName: string) => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      toast.error('يرجى تسجيل الدخول أولاً');
      navigate('/auth/login');
      return;
    }

    if (planName === currentPlan) {
      toast.error('أنت مشترك بالفعل في هذه الخطة');
      return;
    }

    try {
      setUpgrading(planName);
      const response = await axios.post(
        `${API_URL}/api/v1/platform-subscription/upgrade`,
        { newPlan: planName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('تم ترقية الخطة بنجاح!');
        setCurrentPlan(planName);
        fetchCurrentSubscription();
      }
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      toast.error(error.response?.data?.message || 'خطأ في ترقية الخطة');
    } finally {
      setUpgrading(null);
    }
  };

  const getPlanIcon = (plan: string) => {
    if (plan === 'BASIC') return <Package className="w-8 h-8" />;
    if (plan === 'PRO') return <Zap className="w-8 h-8" />;
    return <Crown className="w-8 h-8" />;
  };

  const getPlanColor = (plan: string) => {
    if (plan === 'BASIC') return 'from-blue-500 to-blue-600';
    if (plan === 'PRO') return 'from-purple-500 to-purple-600';
    return 'from-yellow-500 to-yellow-600';
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'غير محدود' : value.toLocaleString('ar-EG');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">اختر الخطة المناسبة لك</h1>
          <p className="text-xl text-blue-100">
            خطط مرنة تناسب جميع أحجام الأعمال
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = plan.plan === currentPlan;
            const isUpgrading = upgrading === plan.plan;

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                  isCurrentPlan ? 'ring-4 ring-green-500' : ''
                }`}
              >
                {/* Plan Header */}
                <div className={`bg-gradient-to-r ${getPlanColor(plan.plan)} text-white p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    {getPlanIcon(plan.plan)}
                    {isCurrentPlan && (
                      <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-semibold">
                        الخطة الحالية
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {plan.plan === 'BASIC' && 'الخطة الأساسية'}
                    {plan.plan === 'PRO' && 'الخطة الاحترافية'}
                    {plan.plan === 'ENTERPRISE' && 'خطة المؤسسات'}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.monthlyFee}</span>
                    <span className="text-xl">ج / شهر</span>
                  </div>
                </div>

                {/* Plan Features */}
                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    {/* Limits */}
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <Users size={20} className="text-blue-600" />
                      <span>حتى {formatLimit(plan.maxEmployees)} موظف</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <Package size={20} className="text-purple-600" />
                      <span>حتى {formatLimit(plan.maxProducts)} منتج</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <ShoppingCart size={20} className="text-green-600" />
                      <span>حتى {formatLimit(plan.maxOrdersPerMonth)} طلب/شهر</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <MessageSquare size={20} className="text-yellow-600" />
                      <span>حتى {formatLimit(plan.maxMessagesPerMonth)} رسالة/شهر</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <Brain size={20} className="text-pink-600" />
                      <span>حتى {formatLimit(plan.maxAIChatsPerMonth)} محادثة AI/شهر</span>
                    </div>
                  </div>

                  {/* Additional Features */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(plan.plan)}
                    disabled={isCurrentPlan || isUpgrading}
                    className={`w-full mt-6 py-3 px-6 rounded-xl font-semibold transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isUpgrading
                        ? 'bg-blue-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {isCurrentPlan ? 'الخطة الحالية' : isUpgrading ? 'جاري الترقية...' : 'ترقية الآن'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8">
          <div className="flex items-start gap-4">
            <Shield className="text-blue-600 flex-shrink-0" size={32} />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                ضمان استرداد الأموال لمدة 30 يوماً
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                جرب أي خطة بدون مخاطر. إذا لم تكن راضياً، سنسترد أموالك بالكامل خلال 30 يوماً.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            الأسئلة الشائعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                هل يمكنني تغيير الخطة في أي وقت؟
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                نعم، يمكنك الترقية أو التخفيض في أي وقت. سيتم احتساب الفرق بشكل تناسبي.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                ماذا يحدث إذا تجاوزت الحدود؟
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                سيتم تنبيهك عند الاقتراب من الحدود. يمكنك الترقية للحصول على حدود أعلى.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                هل الأسعار شاملة الضرائب؟
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                نعم، جميع الأسعار المعروضة شاملة ضريبة القيمة المضافة.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                هل يوجد دعم فني؟
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                نعم، جميع الخطط تشمل دعم فني. خطة PRO و ENTERPRISE تحصل على دعم أولوية.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
