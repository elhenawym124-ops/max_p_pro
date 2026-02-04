import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingCartIcon, FunnelIcon, EyeIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import { updateSEO } from '../../utils/seo';
import { trackSearch, trackViewContent, trackAddToCart, trackAddToWishlist, trackCustom } from '../../utils/facebookPixel';
import analyticsService from '../../services/analyticsService';
import StorefrontNav from '../../components/StorefrontNav';
import QuickViewModal from '../../components/storefront/QuickViewModal';
import RecentlyViewed from '../../components/storefront/RecentlyViewed';
import AdvancedFilters, { FilterState } from '../../components/storefront/AdvancedFilters';
import ProductComparison, { addToComparison } from '../../components/storefront/ProductComparison';
import ProductBadges from '../../components/storefront/ProductBadges';
import CountdownTimer from '../../components/storefront/CountdownTimer';

interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  stock: number;
  saleStartDate?: string; // 📅 تاريخ بداية العرض
  saleEndDate?: string; // 📅 تاريخ انتهاء العرض
  category?: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  productsCount?: number;
  _count?: {
    products?: number;
  };
}

const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [comparisonProductIds, setComparisonProductIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [showFilters, setShowFilters] = useState(false);

  // Quick View
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);

  // Advanced Filters
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | undefined>();

  // التحقق من وجود companyId عند التحميل
  useEffect(() => {
    // قراءة companyId من URL أولاً (للدعم العكسي)
    let companyId = searchParams.get('companyId');

    // إذا لم يوجد في searchParams، جرب من window.location.search مباشرة
    if (!companyId) {
      const urlParams = new URLSearchParams(window.location.search);
      companyId = urlParams.get('companyId');
    }

    // إذا كان موجوداً في URL، احفظه في localStorage ثم أزلّه من URL
    if (companyId) {
      localStorage.setItem('storefront_companyId', companyId);
      // إزالة companyId من URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('companyId');
      if (newParams.toString() !== searchParams.toString()) {
        setSearchParams(newParams, { replace: true });
      }
    } else {
      // إذا لم يوجد في URL، جرب من getCompanyId (الذي يفحص localStorage/subdomain)
      companyId = getCompanyId();
    }

    // Debug logging (only once per session in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      const logKey = 'shop_companyId_logged';
      if (!sessionStorage.getItem(logKey)) {
        console.log('🔍 [Shop] Checking companyId...');
        console.log('🔍 [Shop] Final companyId:', companyId);
        sessionStorage.setItem(logKey, 'true');
      }
    }

    if (!companyId) {
      // عرض رسالة خطأ واضحة
      toast.error('⚠️ يجب زيارة المتجر من رابط صحيح يحتوي على معرف الشركة');
      console.error('❌ [Shop] No companyId found. Please visit with ?companyId=xxx or use subdomain');
    } else {
      // Track store visit
      analyticsService.trackStoreVisit(window.location.pathname);
      fetchStorefrontSettings();
    }
  }, [searchParams, setSearchParams]);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success && data.data) {
          // Only log in development and limit frequency
          const isDevelopment = process.env.NODE_ENV === 'development';
          if (isDevelopment) {
            const logKey = 'shop_settings_logged';
            const lastLog = sessionStorage.getItem(logKey);
            const now = Date.now();
            if (!lastLog || now - parseInt(lastLog) > 10000) { // Log at most once every 10 seconds
              console.log('✅ [Shop] Storefront settings loaded:', {
                quickViewEnabled: data.data.quickViewEnabled,
                quickViewShowAddToCart: data.data.quickViewShowAddToCart,
                quickViewShowWishlist: data.data.quickViewShowWishlist,
                comparisonEnabled: data.data.comparisonEnabled,
                wishlistEnabled: data.data.wishlistEnabled,
                advancedFiltersEnabled: data.data.advancedFiltersEnabled,
              });
              sessionStorage.setItem(logKey, now.toString());
            }
          }

          // Reset filters if advanced filters are disabled
          if (!data.data.advancedFiltersEnabled && activeFilters) {
            console.log('⚠️ [Shop] Advanced filters disabled, resetting active filters');
            setActiveFilters(null);
          }

          setStorefrontSettings(data.data);

          // Update SEO
          if (data.data.seoEnabled && data.data.seoMetaDescription) {
            updateSEO({
              title: 'المنتجات - متجرنا',
              description: 'تصفح مجموعتنا الكاملة من المنتجات',
              url: window.location.href
            });
          }
        } else {
          // Set to null to ensure features are hidden
          setStorefrontSettings(null);
        }
      }
    } catch (error: any) {
      // Handle errors gracefully - server might be having issues (500)
      const status = error?.status || error?.response?.status;
      const isDevelopment = process.env.NODE_ENV === 'development';

      // Only log non-500 errors in development (500 is server issue)
      if (status !== 500 && isDevelopment) {
        console.warn('⚠️ [Shop] Failed to load storefront settings, using disabled defaults');
      }

      // Set to null to ensure features are hidden
      setStorefrontSettings(null);
      console.error('❌ [Shop] Error fetching storefront settings:', error);
      // Set to null to ensure features are hidden on error
      setStorefrontSettings(null);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Reset filters when advanced filters are disabled
  useEffect(() => {
    if (storefrontSettings && !storefrontSettings.advancedFiltersEnabled && activeFilters) {
      console.log('⚠️ [Shop] Advanced filters disabled, clearing active filters');
      setActiveFilters(null);
    }
  }, [storefrontSettings?.advancedFiltersEnabled]);

  useEffect(() => {
    fetchProducts();

    // Track Facebook Pixel Search event when search query changes
    const searchQuery = searchParams.get('search');
    if (searchQuery && storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackSearch !== false) {
      try {
        trackSearch(searchQuery);
        console.log('✅ [Facebook Pixel] Search tracked:', searchQuery);
      } catch (error) {
        console.error('❌ [Facebook Pixel] Error tracking Search:', error);
      }
    }
  }, [searchParams, activeFilters, storefrontSettings?.advancedFiltersEnabled, storefrontSettings?.facebookPixelEnabled, storefrontSettings?.pixelTrackSearch]);

  useEffect(() => {
    // Listen for add to comparison events and update local state
    const handleAddToComparison = (e: CustomEvent) => {
      const product = e.detail;
      if (product?.id) {
        setComparisonProductIds(prev => new Set([...prev, product.id]));
      }
    };

    // Load existing comparison products from localStorage
    const stored = localStorage.getItem('product_comparison');
    if (stored) {
      try {
        const products = JSON.parse(stored);
        if (Array.isArray(products)) {
          setComparisonProductIds(new Set(products.map((p: Product) => p.id)));
        }
      } catch (e) {
        console.error('Error loading comparison products:', e);
      }
    }

    window.addEventListener('addToComparison', handleAddToComparison as EventListener);
    return () => window.removeEventListener('addToComparison', handleAddToComparison as EventListener);
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await storefrontApi.getCategories();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const category = searchParams.get('category') || '';
      const sort = searchParams.get('sortBy') || 'createdAt';

      const params: Record<string, string> = {
        page,
        limit: '12',
        sortBy: sort,
        sortOrder: 'desc'
      };

      if (search) params['search'] = search;
      if (category) params['category'] = category;

      // Add advanced filters - only if enabled in settings
      if (storefrontSettings?.advancedFiltersEnabled && activeFilters) {
        if (activeFilters.priceRange.min > 0) {
          params['minPrice'] = activeFilters.priceRange.min.toString();
        }
        if (activeFilters.priceRange.max < 10000) {
          params['maxPrice'] = activeFilters.priceRange.max.toString();
        }
        if (activeFilters.rating) {
          params['minRating'] = activeFilters.rating.toString();
        }
        if (activeFilters.inStock === true) {
          params['inStock'] = 'true';
        }
      }

      const data = await storefrontApi.getProducts(params);

      if (data.success) {
        // Handle both response formats: { data: { products: [...] } } or { data: [...] }
        let fetchedProducts = [];
        if (Array.isArray(data.data)) {
          fetchedProducts = data.data;
        } else if (data.data?.products && Array.isArray(data.data.products)) {
          fetchedProducts = data.data.products;
        } else if (data.data && Array.isArray(data.data)) {
          fetchedProducts = data.data;
        }

        setProducts(fetchedProducts);
        setPagination(data.data?.pagination || data.pagination || { page: 1, limit: 12, total: fetchedProducts.length, pages: Math.ceil(fetchedProducts.length / 12) });

        // Calculate price range from all products (first load only)
        if (!priceRange && fetchedProducts.length > 0) {
          const prices = fetchedProducts.map(p => p.price).filter(p => p != null);
          if (prices.length > 0) {
            setPriceRange({
              min: Math.floor(Math.min(...prices)),
              max: Math.ceil(Math.max(...prices))
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ في جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set('category', categoryId);

      // Track ViewCategory event
      if (storefrontSettings?.facebookPixelEnabled) {
        try {
          const category = categories.find(c => c.id === categoryId);
          trackCustom('ViewCategory', {
            content_category: category?.name || 'Unknown',
            content_category_id: categoryId
          });
          console.log('✅ [Facebook Pixel] ViewCategory tracked:', category?.name || categoryId);
        } catch (error) {
          console.error('❌ [Facebook Pixel] Error tracking ViewCategory:', error);
        }
      }
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = async (product: Product) => {
    console.log('🛒 [Shop] addToCart called', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      hasStorefrontSettings: !!storefrontSettings,
      facebookPixelEnabled: storefrontSettings?.facebookPixelEnabled,
      pixelTrackAddToCart: storefrontSettings?.pixelTrackAddToCart
    });

    // Ensure storefrontSettings is loaded before tracking
    if (!storefrontSettings) {
      console.warn('⚠️ [Shop] storefrontSettings not loaded yet, loading now...');
      try {
        const companyId = getCompanyId();
        if (companyId) {
          const data = await storefrontSettingsService.getPublicSettings(companyId);
          if (data.success && data.data) {
            setStorefrontSettings(data.data);
          }
        }
      } catch (error) {
        console.error('❌ [Shop] Error loading storefront settings:', error);
      }
    }

    try {
      let sessionId = localStorage.getItem('cart_session_id');

      const data = await storefrontApi.addToCart({
        ...(sessionId && { sessionId }),
        productId: product.id,
        quantity: 1
      });

      if (data.success) {
        // Backend returns cartId, save it as cart_session_id
        if (data.data?.cartId) {
          localStorage.setItem('cart_session_id', data.data.cartId);
        }

        // Track AddToCart event - MUST be called after successful add
        // Use current storefrontSettings or reload if needed
        const currentSettings = storefrontSettings || await (async () => {
          try {
            const companyId = getCompanyId();
            if (companyId) {
              const settingsData = await storefrontSettingsService.getPublicSettings(companyId);
              if (settingsData.success && settingsData.data) {
                setStorefrontSettings(settingsData.data);
                return settingsData.data;
              }
            }
          } catch (error) {
            console.error('❌ [Shop] Error loading settings for tracking:', error);
          }
          return null;
        })();

        if (currentSettings?.facebookPixelEnabled && currentSettings?.pixelTrackAddToCart !== false) {
          try {
            console.log('📊 [Shop] Tracking AddToCart event...', {
              productId: product.id,
              productName: product.name,
              price: product.price,
              pixelId: currentSettings.facebookPixelId
            });

            const eventId = trackAddToCart({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: 1
            });

            if (eventId) {
              console.log('✅ [Facebook Pixel] AddToCart tracked successfully (Shop page)', {
                productId: product.id,
                productName: product.name,
                eventId,
                url: `https://www.facebook.com/tr?id=${currentSettings?.facebookPixelId}&ev=AddToCart`
              });
            } else {
              console.warn('⚠️ [Facebook Pixel] AddToCart tracking failed - Pixel not ready', {
                productId: product.id
              });
            }
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking AddToCart:', error);
          }
        } else {
          console.log('ℹ️ [Shop] AddToCart tracking disabled', {
            hasSettings: !!currentSettings,
            facebookPixelEnabled: currentSettings?.facebookPixelEnabled,
            pixelTrackAddToCart: currentSettings?.pixelTrackAddToCart
          });
        }

        // Track analytics add to cart
        analyticsService.trackAddToCart(product.id, product.price);

        toast.success('تمت إضافة المنتج للسلة');

        // تحديث عدد المنتجات في الـ header
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        toast.error(data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ في إضافة المنتج');
    }
  };

  return (
    <>
      <StorefrontNav />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">المنتجات</h1>

          <div className="flex items-center gap-4">
            {/* Advanced Filters */}
            {storefrontSettings?.advancedFiltersEnabled && (
              <AdvancedFilters
                enabled={storefrontSettings.advancedFiltersEnabled}
                settings={{
                  filterByPrice: storefrontSettings.filterByPrice,
                  filterByRating: storefrontSettings.filterByRating,
                  filterByBrand: storefrontSettings.filterByBrand,
                  filterByAttributes: storefrontSettings.filterByAttributes
                }}
                onApply={(filters) => {
                  setActiveFilters(filters);

                  // Track Filter event
                  if (storefrontSettings?.facebookPixelEnabled) {
                    try {
                      const filterData: Record<string, any> = {};
                      if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) {
                        filterData.price_min = filters.priceRange.min;
                        filterData.price_max = filters.priceRange.max;
                      }
                      if (filters.rating) {
                        filterData.rating = filters.rating;
                      }
                      if (filters.brand) {
                        filterData.brand = filters.brand;
                      }
                      if (filters.inStock !== null) {
                        filterData.in_stock = filters.inStock;
                      }
                      if (filters.attributes.length > 0) {
                        filterData.attributes = filters.attributes;
                      }

                      if (Object.keys(filterData).length > 0) {
                        trackCustom('Filter', filterData);
                        console.log('✅ [Facebook Pixel] Filter tracked:', filterData);
                      }
                    } catch (error) {
                      console.error('❌ [Facebook Pixel] Error tracking Filter:', error);
                    }
                  }
                }}
                onReset={() => setActiveFilters(null)}
                priceRange={priceRange}
                resultsCount={pagination.total}
                brands={[]} // TODO: Extract from products
                attributes={[]} // TODO: Extract from products
              />
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">الأحدث</option>
              <option value="price">السعر: من الأقل للأعلى</option>
              <option value="name">الاسم</option>
            </select>

            {/* Filter Button - Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>فلترة</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className={`md:w-64 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">الفئات</h2>

              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`w-full text-right px-3 py-2 rounded-lg transition-colors ${!selectedCategory
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  الكل
                </button>

                {Array.isArray(categories) && categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-right px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span>{category.name}</span>
                    <span className="text-sm text-gray-500">
                      ({category.productsCount ?? category._count?.products ?? 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!Array.isArray(products) || products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">لا توجد منتجات</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.isArray(products) ? products.map((product) => {
                        const companyId = getCompanyId();
                        // Parse images from JSON string
                        let productImages: string[] = [];
                        try {
                          if (product.images && typeof product.images === 'string') {
                            productImages = JSON.parse(product.images);
                          } else if (Array.isArray(product.images)) {
                            productImages = product.images;
                          }
                        } catch (e) {
                          console.error('Error parsing product images:', e);
                        }

                        return (
                          <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow relative group">
                            <Link to={`/shop/products/${product.slug || product.id}`} onClick={() => {
                              // حفظ companyId في localStorage قبل الانتقال
                              if (companyId) {
                                localStorage.setItem('storefront_companyId', companyId);
                              }
                            }}>
                              <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                                {productImages.length > 0 && productImages[0] ? (
                                  <img
                                    src={productImages[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-4xl">📦</span></div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <span className="text-4xl">📦</span>
                                  </div>
                                )}

                                {/* Product Badges */}
                                {storefrontSettings?.badgesEnabled && (
                                  <ProductBadges
                                    enabled={storefrontSettings.badgesEnabled}
                                    product={{
                                      id: product.id,
                                      createdAt: product.createdAt || new Date().toISOString(),
                                      stock: product.stock,
                                      comparePrice: product.comparePrice,
                                      price: product.price,
                                      isFeatured: product.isFeatured
                                    }}
                                    settings={{
                                      badgeNew: storefrontSettings.badgeNew,
                                      badgeBestSeller: storefrontSettings.badgeBestSeller,
                                      badgeOnSale: storefrontSettings.badgeOnSale,
                                      badgeOutOfStock: storefrontSettings.badgeOutOfStock
                                    }}
                                  />
                                )}

                                {/* Countdown Timer on Product Card */}
                                {(() => {
                                  const countdownEnabled = storefrontSettings?.countdownEnabled;
                                  const showOnListing = storefrontSettings?.countdownShowOnListing;
                                  const hasComparePrice = product.comparePrice && product.comparePrice > product.price;
                                  const hasSaleEndDate = product.saleEndDate;
                                  const saleEndDateValid = hasSaleEndDate && new Date(product.saleEndDate) > new Date();

                                  if (Array.isArray(products) && products.length > 0 && product.id === products[0]?.id) { // Log only for first product to avoid spam
                                    console.log('🔍 [Shop] Countdown Timer Debug:', {
                                      countdownEnabled,
                                      showOnListing,
                                      hasComparePrice,
                                      comparePrice: product.comparePrice,
                                      price: product.price,
                                      hasSaleEndDate,
                                      saleEndDate: product.saleEndDate,
                                      saleEndDateValid,
                                      willShow: countdownEnabled && showOnListing && hasComparePrice && saleEndDateValid
                                    });
                                  }

                                  return countdownEnabled && showOnListing && hasComparePrice && saleEndDateValid ? (
                                    <div className="absolute bottom-2 right-2 left-2">
                                      <CountdownTimer
                                        endDate={product.saleEndDate}
                                        enabled={storefrontSettings.countdownEnabled}
                                        className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs"
                                      />
                                    </div>
                                  ) : null;
                                })()}

                                {/* Quick View Button */}
                                {storefrontSettings?.quickViewEnabled && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('🔍 [Shop] Quick View button clicked for product:', product.id);

                                      // Track ViewContent event
                                      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackViewContent !== false) {
                                        try {
                                          const eventId = trackViewContent({
                                            id: product.id,
                                            name: product.name,
                                            price: product.price,
                                            category: product.category?.name
                                          });
                                          if (eventId) {
                                            console.log('✅ [Facebook Pixel] ViewContent tracked (QuickView)', { productId: product.id, eventId });
                                          } else {
                                            console.warn('⚠️ [Facebook Pixel] ViewContent tracking failed - Pixel not ready');
                                          }
                                        } catch (error) {
                                          console.error('❌ [Facebook Pixel] Error tracking ViewContent:', error);
                                        }
                                      }

                                      setQuickViewProductId(product.id);
                                    }}
                                    className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg opacity-100 group-hover:opacity-100 transition-opacity z-10"
                                    title="معاينة سريعة"
                                    aria-label="معاينة سريعة"
                                  >
                                    <EyeIcon className="h-5 w-5 text-gray-700" />
                                  </button>
                                )}
                              </div>
                            </Link>

                            <div className="p-4">
                              <Link
                                to={`/shop/products/${product.slug || product.id}`}
                                onClick={() => {
                                  // حفظ companyId في localStorage قبل الانتقال
                                  if (companyId) {
                                    localStorage.setItem('storefront_companyId', companyId);
                                  }
                                  // Track ViewContent event when clicking on product
                                  if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackViewContent !== false) {
                                    try {
                                      const eventId = trackViewContent({
                                        id: product.id,
                                        name: product.name,
                                        price: product.price,
                                        category: product.category?.name
                                      });
                                      if (eventId) {
                                        console.log('✅ [Facebook Pixel] ViewContent tracked (product click)', { productId: product.id, eventId });
                                      } else {
                                        console.warn('⚠️ [Facebook Pixel] ViewContent tracking failed - Pixel not ready');
                                      }
                                    } catch (error) {
                                      console.error('❌ [Facebook Pixel] Error tracking ViewContent:', error);
                                    }
                                  }
                                }}
                              >
                                <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                                  {product.name}
                                </h3>
                              </Link>

                              {product.category && (
                                <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>
                              )}

                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <span className="text-xl font-bold text-gray-900">
                                    {product.price} جنيه
                                  </span>
                                  {product.comparePrice && product.comparePrice > product.price && (
                                    <span className="text-sm text-gray-500 line-through mr-2">
                                      {product.comparePrice} جنيه
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {storefrontSettings?.comparisonEnabled && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      addToComparison({
                                        id: product.id,
                                        name: product.name,
                                        price: product.price,
                                        comparePrice: product.comparePrice,
                                        images: productImages,
                                        stock: product.stock,
                                        description: product.description,
                                        category: product.category
                                      });
                                    }}
                                    className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 active:scale-95 font-medium text-sm ${comparisonProductIds.has(product.id)
                                        ? 'bg-indigo-600 text-white border-2 border-indigo-600 hover:bg-indigo-700 shadow-md'
                                        : 'border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-600 hover:shadow-md'
                                      }`}
                                    title={comparisonProductIds.has(product.id) ? 'تمت الإضافة للمقارنة' : 'أضف للمقارنة'}
                                  >
                                    <ArrowsRightLeftIcon className={`h-5 w-5 transition-transform duration-300 ${comparisonProductIds.has(product.id)
                                        ? 'rotate-180'
                                        : 'group-hover:rotate-180'
                                      }`} />
                                    <span className="hidden sm:inline font-semibold">
                                      {comparisonProductIds.has(product.id) ? 'مضاف' : 'مقارنة'}
                                    </span>
                                    <span className="sm:hidden font-semibold">
                                      {comparisonProductIds.has(product.id) ? '✓' : 'مقارنة'}
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={() => addToCart(product)}
                                  disabled={product.stock === 0}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 ${product.stock === 0
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    }`}
                                >
                                  <ShoppingCartIcon className="h-5 w-5" />
                                  <span>{product.stock === 0 ? 'غير متوفر' : 'أضف للسلة'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }) : null}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          السابق
                        </button>

                        <span className="px-4 py-2 text-gray-700">
                          صفحة {pagination.page} من {pagination.pages}
                        </span>

                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProductId && storefrontSettings?.quickViewEnabled && (
        <QuickViewModal
          productId={quickViewProductId}
          isOpen={!!quickViewProductId}
          onClose={() => setQuickViewProductId(null)}
          showAddToCart={storefrontSettings?.quickViewShowAddToCart}
          showWishlist={storefrontSettings?.quickViewShowWishlist}
          onAddToCart={() => {
            window.dispatchEvent(new Event('cartUpdated'));
          }}
        />
      )}

      {/* Recently Viewed */}
      {storefrontSettings?.recentlyViewedEnabled && (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <RecentlyViewed
            enabled={storefrontSettings.recentlyViewedEnabled}
            count={storefrontSettings.recentlyViewedCount}
          />
        </div>
      )}

      {/* Product Comparison */}
      {storefrontSettings?.comparisonEnabled && (
        <ProductComparison
          enabled={storefrontSettings.comparisonEnabled}
          maxProducts={storefrontSettings.maxComparisonProducts}
          showPrice={storefrontSettings.comparisonShowPrice}
          showSpecs={storefrontSettings.comparisonShowSpecs}
        />
      )}
    </>
  );
};

export default Shop;

