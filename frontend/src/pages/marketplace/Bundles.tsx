import { useState, useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager';
import {
  Package,
  Check,
  Star,
  TrendingUp,
  Zap,
  Gift,
  DollarSign
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  discount: number;
  isActive: boolean;
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    monthlyPrice: number;
  }>;
}

export default function Bundles() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingBundle, setActivatingBundle] = useState<string | null>(null);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      if (!token) {
        navigate('/auth/login');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/v1/marketplace/bundles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // The public API returns bundles directly in data, possibly with different structure
        // Let's assume the controller returns { success: true, data: [...] }
        setBundles(response.data.data.filter((b: Bundle) => b.isActive));
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
      toast.error('خطأ في جلب الباقات');
    } finally {
      setLoading(false);
    }
  };

  const calculateOriginalPrice = (bundle: Bundle) => {
    return (bundle.apps || []).reduce((sum, app) => sum + parseFloat(app.monthlyPrice.toString()), 0);
  };

  const calculateSavings = (bundle: Bundle) => {
    const original = calculateOriginalPrice(bundle);
    const bundlePrice = parseFloat(bundle.monthlyPrice?.toString() || '0');
    return original - bundlePrice;
  };

  const handleActivateBundle = async (bundleSlug: string) => {
    try {
      setActivatingBundle(bundleSlug);
      const token = tokenManager.getAccessToken();

      const response = await axios.post(
        `${API_URL}/api/v1/marketplace/bundles/${bundleSlug}/subscribe`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh bundles to update UI if needed (though bundles usually don't change state immediately in this view)
        // Optionally navigate to dashboard or apps list
        setTimeout(() => {
          navigate('/marketplace/my-apps');
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error activating bundle:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('خطأ في تفعيل الباقة');
      }
    } finally {
      setActivatingBundle(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Gift size={48} className="text-yellow-300" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              الباقات المخفضة
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              وفّر المزيد مع باقاتنا المميزة! احصل على عدة أدوات بسعر مخفض
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">الباقات المتاحة</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {bundles.length}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <Package className="text-purple-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">متوسط التوفير</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {bundles.length > 0
                    ? Math.round(bundles.reduce((sum, b) => sum + parseFloat(b.discount.toString()), 0) / bundles.length)
                    : 0}%
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <TrendingUp className="text-green-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">أفضل عرض</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {bundles.length > 0
                    ? Math.max(...bundles.map(b => parseFloat(b.discount.toString())))
                    : 0}%
                </p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                <Star className="text-yellow-600" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Bundles Grid */}
        {bundles.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              لا توجد باقات متاحة حالياً
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              تابعنا للحصول على أفضل العروض قريباً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bundles.map((bundle) => {
              const originalPrice = calculateOriginalPrice(bundle);
              const savings = calculateSavings(bundle);
              const bundlePrice = parseFloat(bundle.monthlyPrice?.toString() || '0');

              return (
                <div
                  key={bundle.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Badge */}
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={24} />
                        <span className="font-bold text-lg">باقة</span>
                      </div>
                      <div className="bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-bold">
                        وفّر {parseFloat(bundle.discount.toString())}%
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {bundle.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {bundle.description}
                    </p>

                    {/* Pricing */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-bold text-purple-600">
                          {bundlePrice.toFixed(0)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">ج/شهر</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through">
                          {originalPrice.toFixed(0)} ج
                        </span>
                        <span className="text-green-600 font-semibold">
                          وفّر {savings.toFixed(0)} ج
                        </span>
                      </div>
                    </div>

                    {/* Apps Included */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-500" />
                        الأدوات المتضمنة:
                      </h4>
                      <div className="space-y-2">
                        {bundle.apps.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check size={16} className="text-green-600 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {app.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleActivateBundle(bundle.slug)}
                      disabled={activatingBundle === bundle.slug}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {activatingBundle === bundle.slug ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          جاري التفعيل...
                        </>
                      ) : (
                        <>
                          <DollarSign size={20} />
                          اشترك الآن
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Benefits Section */}
        <div className="mt-16 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            لماذا تختار الباقات؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                توفير مضمون
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                وفّر حتى 30% من تكلفة الأدوات الفردية
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                تفعيل فوري
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                جميع الأدوات تُفعّل مباشرة بعد الاشتراك
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                أفضل قيمة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                احصل على أكثر من أداة بسعر أداة واحدة
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
