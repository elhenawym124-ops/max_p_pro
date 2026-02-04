import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  Brain,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface UsageData {
  current: number;
  limit: number;
  percentage: number;
}

interface UsageStats {
  plan: string;
  subscription: any;
  limits: any;
  usage: {
    employees: UsageData;
    products: UsageData;
    ordersThisMonth: UsageData;
    customers: UsageData;
  };
}

export default function UsageStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        navigate('/auth/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/v1/platform-subscription/usage-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      toast.error('خطأ في جلب إحصائيات الاستخدام');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'غير محدود' : value.toLocaleString('ar-EG');
  };

  const UsageCard = ({ 
    title, 
    icon: Icon, 
    usage, 
    iconColor 
  }: { 
    title: string; 
    icon: any; 
    usage: UsageData; 
    iconColor: string;
  }) => {
    const isUnlimited = usage.limit === -1;
    const percentage = isUnlimited ? 0 : usage.percentage;
    const isNearLimit = percentage >= 75 && !isUnlimited;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${iconColor}`}>
              <Icon size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          {isNearLimit && (
            <AlertTriangle className="text-yellow-600" size={24} />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {usage.current.toLocaleString('ar-EG')}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              من {formatLimit(usage.limit)}
            </span>
          </div>

          {!isUnlimited && (
            <>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={`font-semibold px-2 py-1 rounded ${getUsageColor(percentage)}`}>
                  {percentage.toFixed(1)}% مستخدم
                </span>
                {isNearLimit && (
                  <span className="text-yellow-600 font-semibold">
                    قريب من الحد الأقصى
                  </span>
                )}
              </div>
            </>
          )}

          {isUnlimited && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-semibold">استخدام غير محدود</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            لا توجد بيانات استخدام
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            تأكد من وجود اشتراك نشط
          </p>
          <button
            onClick={() => navigate('/subscription/plans')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            عرض الخطط
          </button>
        </div>
      </div>
    );
  }

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      BASIC: 'الخطة الأساسية',
      PRO: 'الخطة الاحترافية',
      ENTERPRISE: 'خطة المؤسسات'
    };
    return names[plan] || plan;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إحصائيات الاستخدام</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {getPlanName(stats.plan)} • تتبع استخدامك مقابل حدود الخطة
              </p>
            </div>
            <button
              onClick={() => navigate('/subscription/plans')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <TrendingUp size={20} />
              ترقية الخطة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <UsageCard
            title="الموظفين"
            icon={Users}
            usage={stats.usage.employees}
            iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          />
          <UsageCard
            title="المنتجات"
            icon={Package}
            usage={stats.usage.products}
            iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600"
          />
          <UsageCard
            title="الطلبات هذا الشهر"
            icon={ShoppingCart}
            usage={stats.usage.ordersThisMonth}
            iconColor="bg-green-100 dark:bg-green-900/30 text-green-600"
          />
          <UsageCard
            title="العملاء"
            icon={Users}
            usage={stats.usage.customers}
            iconColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
          />
        </div>

        {/* Plan Limits Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            حدود الخطة الحالية
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-blue-600" size={20} />
                  <span className="text-gray-900 dark:text-white">الرسائل الشهرية</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatLimit(stats.limits.maxMessagesPerMonth)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="text-purple-600" size={20} />
                  <span className="text-gray-900 dark:text-white">محادثات AI الشهرية</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatLimit(stats.limits.maxAIChatsPerMonth)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <HardDrive className="text-green-600" size={20} />
                  <span className="text-gray-900 dark:text-white">مساحة التخزين</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatLimit(stats.limits.maxStorageGB)} GB
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">الميزات المتاحة</h3>
                <div className="space-y-2">
                  {stats.limits.hasAdvancedReports && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-green-600" />
                      <span>تقارير متقدمة</span>
                    </div>
                  )}
                  {stats.limits.hasAPIAccess && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-green-600" />
                      <span>API Access</span>
                    </div>
                  )}
                  {stats.limits.hasPrioritySupport && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-green-600" />
                      <span>دعم أولوية</span>
                    </div>
                  )}
                  {stats.limits.hasWhiteLabel && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-green-600" />
                      <span>White Label</span>
                    </div>
                  )}
                  {stats.limits.hasCustomDomain && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-green-600" />
                      <span>نطاق مخصص</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {stats.plan !== 'ENTERPRISE' && (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">هل تحتاج المزيد؟</h2>
            <p className="text-blue-100 mb-6">
              قم بترقية خطتك للحصول على حدود أعلى وميزات إضافية
            </p>
            <button
              onClick={() => navigate('/subscription/plans')}
              className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
            >
              <TrendingUp size={20} />
              عرض خطط الترقية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
