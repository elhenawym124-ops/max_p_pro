import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  ArrowLeft, 
  Star, 
  Check, 
  Download,
  Users,
  Calendar,
  Shield,
  Zap,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  descriptionEn?: string;
  icon?: string;
  coverImage?: string;
  screenshots?: any;
  pricingModel: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  setupFee?: number;
  trialDays: number;
  features: any;
  limitations?: any;
  requiredApps?: any;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  installCount: number;
  rating?: number;
  reviewCount: number;
  reviews?: any[];
  pricingRules?: any[];
  _count?: {
    installations: number;
    reviews: number;
  };
}

export default function AppDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<MarketplaceApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchAppDetails();
    }
  }, [slug]);

  const fetchAppDetails = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${API_URL}/api/v1/marketplace/apps/${slug}`,
        { headers }
      );

      setApp(response.data.data);
    } catch (error) {
      console.error('Error fetching app details:', error);
      toast.error('خطأ في جلب تفاصيل الأداة');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      toast.error('يرجى تسجيل الدخول أولاً');
      navigate('/auth/login');
      return;
    }

    try {
      setInstalling(true);
      const response = await axios.post(
        `${API_URL}/api/v1/marketplace/apps/${slug}/install`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || 'تم تفعيل الأداة بنجاح! 🎉');
      navigate('/my-apps');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'خطأ في تفعيل الأداة';
      toast.error(errorMsg);

      if (error.response?.data?.requiredApps) {
        const required = error.response.data.requiredApps;
        toast.error(`يتطلب تفعيل: ${required.map((a: any) => a.name).join('، ')}`);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">الأداة غير موجودة</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            العودة إلى Marketplace
          </button>
        </div>
      </div>
    );
  }

  const features = typeof app.features === 'string' ? JSON.parse(app.features) : app.features;
  const limitations = app.limitations ? (typeof app.limitations === 'string' ? JSON.parse(app.limitations) : app.limitations) : null;
  const requiredApps = app.requiredApps ? (typeof app.requiredApps === 'string' ? JSON.parse(app.requiredApps) : app.requiredApps) : null;

  const getPriceDisplay = () => {
    if (app.pricingModel === 'FREE') return 'مجاني';
    if (app.pricingModel === 'PAY_PER_USE') return 'حسب الاستخدام';
    if (app.monthlyPrice) return `${app.monthlyPrice} ج/شهر`;
    return 'اتصل بنا';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            العودة إلى Marketplace
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
                {app.icon || '📦'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {app.name}
                  </h1>
                  {app.isFeatured && (
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Sparkles size={14} />
                      مميز
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-3">
                  {app.description}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  {app.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{app.rating.toFixed(1)}</span>
                      <span>({app.reviewCount} تقييم)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Download size={16} />
                    <span>{app.installCount.toLocaleString('ar-EG')} تثبيت</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>تجربة مجانية {app.trialDays} يوم</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 min-w-[280px]">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {getPriceDisplay()}
                </div>
                {app.trialDays > 0 && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✨ تجربة مجانية {app.trialDays} يوم
                  </div>
                )}
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {installing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري التفعيل...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    تفعيل الآن
                  </>
                )}
              </button>
              {app.setupFee && app.setupFee > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  + رسوم إعداد لمرة واحدة: {app.setupFee} ج
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Features */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Check className="text-green-500" size={24} />
                الميزات
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.isArray(features) && features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Details */}
            {app.pricingRules && app.pricingRules.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  💰 تفاصيل التسعير
                </h2>
                <div className="space-y-3">
                  {app.pricingRules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {rule.name}
                        </div>
                        {rule.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {rule.description}
                          </div>
                        )}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {rule.price} ج
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {app.reviews && app.reviews.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ⭐ التقييمات
                </h2>
                <div className="space-y-4">
                  {app.reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                        {review.isVerified && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded">
                            موثق
                          </span>
                        )}
                      </div>
                      {review.title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {review.title}
                        </h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requirements */}
            {requiredApps && requiredApps.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-600" />
                  متطلبات التشغيل
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  هذه الأداة تتطلب تفعيل الأدوات التالية أولاً:
                </p>
                <ul className="space-y-2">
                  {requiredApps.map((reqApp: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                      {reqApp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Limitations */}
            {limitations && Object.keys(limitations).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield size={20} />
                  القيود
                </h3>
                <ul className="space-y-2">
                  {Object.entries(limitations).map(([key, value]) => (
                    <li key={key} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{key}:</span> {String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Support */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                الدعم
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                هل تحتاج مساعدة؟ فريق الدعم جاهز لمساعدتك
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                تواصل مع الدعم
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
