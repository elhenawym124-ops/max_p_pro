import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Store, 
  Users, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Zap,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Star,
  Package,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  icon?: string;
  coverImage?: string;
  pricingModel: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays: number;
  features: any;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  installCount: number;
  rating?: number;
  reviewCount: number;
  _count?: {
    installations: number;
    reviews: number;
  };
}

interface Category {
  category: string;
  name: string;
  nameEn: string;
  icon: string;
  count: number;
}

interface Bundle {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  discount: number;
  isFeatured: boolean;
}

const categoryIcons: Record<string, any> = {
  ECOMMERCE: Store,
  HR: Users,
  AI: Brain,
  COMMUNICATION: MessageSquare,
  CRM: BarChart3,
  ANALYTICS: TrendingUp,
  INTEGRATION: Zap,
  PRODUCTIVITY: Package,
  FINANCE: DollarSign,
  MARKETING: Sparkles
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    fetchData();
  }, [selectedCategory, searchQuery, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (sortBy) params.sort = sortBy;

      const [appsRes, categoriesRes, bundlesRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/marketplace/apps`, { params, headers }),
        axios.get(`${API_URL}/api/v1/marketplace/categories`, { headers }),
        axios.get(`${API_URL}/api/v1/marketplace/bundles`, { headers })
      ]);

      setApps(appsRes.data.data);
      setCategories(categoriesRes.data.data);
      setBundles(bundlesRes.data.data);
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallApp = (slug: string) => {
    navigate(`/marketplace/${slug}`);
  };

  const getPriceDisplay = (app: MarketplaceApp) => {
    if (app.pricingModel === 'FREE') {
      return 'مجاني';
    }
    if (app.pricingModel === 'PAY_PER_USE') {
      return 'حسب الاستخدام';
    }
    if (app.monthlyPrice) {
      return `${app.monthlyPrice} ج/شهر`;
    }
    return 'اتصل بنا';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              🏪 Marketplace
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              اختر الأدوات المناسبة لعملك وادفع فقط لما تستخدمه
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث عن أداة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Bundles */}
        {bundles.filter(b => b.isFeatured).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              💡 باقات موصى بها
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bundles.filter(b => b.isFeatured).map((bundle) => (
                <div
                  key={bundle.id}
                  className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/marketplace/bundle/${bundle.slug}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {bundle.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {bundle.description}
                      </p>
                    </div>
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                      وفر {bundle.discount}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {bundle.monthlyPrice} ج
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">/شهر</span>
                    </div>
                    <button className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                      عرض التفاصيل
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">الفئات:</span>
          </div>
          
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            الكل
          </button>

          {categories.map((cat) => {
            const Icon = categoryIcons[cat.category] || Package;
            return (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={18} />
                {cat.name}
                <span className="text-xs opacity-75">({cat.count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-gray-700 dark:text-gray-300 font-medium">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="featured">مميز</option>
            <option value="popular">الأكثر شعبية</option>
            <option value="price_low">السعر: من الأقل للأعلى</option>
            <option value="price_high">السعر: من الأعلى للأقل</option>
            <option value="newest">الأحدث</option>
          </select>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">جاري التحميل...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا توجد أدوات متاحة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => {
              const Icon = categoryIcons[app.category] || Package;
              const features = typeof app.features === 'string' 
                ? JSON.parse(app.features) 
                : app.features;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                  onClick={() => handleInstallApp(app.slug)}
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-2xl">
                          {app.icon || <Icon size={24} className="text-blue-600" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {app.name}
                          </h3>
                          {app.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star size={14} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {app.rating.toFixed(1)} ({app.reviewCount})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {app.isFeatured && (
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                          مميز
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                      {app.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <ul className="space-y-2">
                      {Array.isArray(features) && features.slice(0, 3).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {getPriceDisplay(app)}
                        </div>
                        {app.trialDays > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            تجربة مجانية {app.trialDays} يوم
                          </div>
                        )}
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
                        عرض التفاصيل
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Install Count */}
                  {app.installCount > 0 && (
                    <div className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-center text-xs text-gray-600 dark:text-gray-400">
                      {app.installCount.toLocaleString('ar-EG')} تثبيت نشط
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
