import { apiClient } from './apiClient';
import { getApiUrl } from '../config/environment';

/**
 * 🛍️ Service لإدارة إعدادات واجهة المتجر (Storefront Features)
 */

export interface StorefrontSettings {
  id: string;
  companyId: string;

  // Quick View Settings
  quickViewEnabled: boolean;
  quickViewShowAddToCart: boolean;
  quickViewShowWishlist: boolean;

  // Product Comparison Settings
  comparisonEnabled: boolean;
  maxComparisonProducts: number;
  comparisonShowPrice: boolean;
  comparisonShowSpecs: boolean;

  // Wishlist Settings
  wishlistEnabled: boolean;
  wishlistRequireLogin: boolean;
  wishlistMaxItems: number;

  // Advanced Filters Settings
  advancedFiltersEnabled: boolean;
  filterByPrice: boolean;
  filterByRating: boolean;
  filterByBrand: boolean;
  filterByAttributes: boolean;

  // Reviews & Ratings Settings
  reviewsEnabled: boolean;
  reviewsRequirePurchase: boolean;
  reviewsModerationEnabled: boolean;
  reviewsShowRating: boolean;
  minRatingToDisplay: number;

  // Countdown Timer Settings
  countdownEnabled: boolean;
  countdownShowOnProduct: boolean;
  countdownShowOnListing: boolean;

  // Back in Stock Settings
  backInStockEnabled: boolean;
  backInStockNotifyEmail: boolean;
  backInStockNotifySMS: boolean;

  // Recently Viewed Settings
  recentlyViewedEnabled: boolean;
  recentlyViewedCount: number;
  recentlyViewedDays: number;

  // ==========================================
  // 🖼️ Product Image Gallery Settings (NEW)
  // ==========================================

  // Gallery Layout Settings
  galleryLayout?: 'bottom' | 'left' | 'right' | 'top' | 'grid';
  galleryStyle?: 'slider' | 'grid' | 'vertical-scroll';
  thumbnailSize?: 'small' | 'medium' | 'large';
  thumbnailsPerRow?: number;
  thumbnailSpacing?: number;
  thumbnailBorderRadius?: number;
  mainImageAspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | 'auto';

  // Slider/Carousel Settings
  sliderEnabled?: boolean;
  sliderAutoplay?: boolean;
  sliderAutoplaySpeed?: number;
  sliderShowArrows?: boolean;
  sliderShowDots?: boolean;
  sliderInfiniteLoop?: boolean;
  sliderTransitionEffect?: 'slide' | 'fade' | 'flip' | 'cube';
  sliderTransitionSpeed?: number;

  // Image Zoom Settings (Enhanced)
  imageZoomEnabled: boolean;
  imageZoomType: 'hover' | 'click' | 'both';
  zoomStyle?: 'lens' | 'side' | 'inner' | 'fullscreen';
  zoomLensShape?: 'circle' | 'square';
  zoomLensSize?: number;
  zoomLevel?: number;
  zoomWindowPosition?: 'right' | 'left' | 'top' | 'bottom';
  zoomWindowSize?: number;
  mouseWheelZoom?: boolean;

  // Lightbox Settings
  lightboxEnabled?: boolean;
  lightboxShowThumbnails?: boolean;
  lightboxShowArrows?: boolean;
  lightboxShowCounter?: boolean;
  lightboxZoomEnabled?: boolean;
  lightboxKeyboardNav?: boolean;
  lightboxBackgroundColor?: string;
  lightboxCloseOnOverlay?: boolean;

  // Product Videos Settings (Enhanced)
  productVideosEnabled: boolean;
  videoAutoplay: boolean;
  videoShowControls: boolean;
  videoSources?: string; // JSON array: ['youtube', 'vimeo', 'self-hosted']
  videoMuted?: boolean;
  videoPlayMode?: 'inline' | 'popup';
  videoPosition?: 'start' | 'end' | 'default';
  videoThumbnailIcon?: boolean;

  // Variation Images Settings
  variationImagesEnabled?: boolean;
  variationImagesBehavior?: 'replace' | 'add' | 'highlight';
  variationImagesAnimation?: 'fade' | 'slide' | 'none';

  // Mobile Gallery Settings
  mobileSwipeEnabled?: boolean;
  mobilePinchZoom?: boolean;
  mobileFullscreenOnTap?: boolean;
  mobileGalleryLayout?: 'slider' | 'vertical' | 'grid';
  mobileShowThumbnails?: boolean;

  // 360° View Settings
  view360Enabled?: boolean;
  view360AutoRotate?: boolean;
  view360RotateSpeed?: number;
  view360ShowControls?: boolean;

  // Visual Effects Settings
  imageHoverEffect?: 'none' | 'zoom' | 'brightness' | 'shadow';
  imageBorderRadius?: number;
  imageShadow?: boolean;
  imageLoadingEffect?: 'blur' | 'skeleton' | 'spinner';
  imagePlaceholder?: string;

  // Size Guide Settings
  sizeGuideEnabled: boolean;
  sizeGuideShowOnProduct: boolean;

  // Social Sharing Settings
  socialSharingEnabled: boolean;
  shareFacebook: boolean;
  shareTwitter: boolean;
  shareWhatsApp: boolean;
  shareTelegram: boolean;

  // Product Badges Settings
  badgesEnabled: boolean;
  badgeNew: boolean;
  badgeBestSeller: boolean;
  badgeOnSale: boolean;
  badgeOutOfStock: boolean;

  // Product Tabs Settings
  tabsEnabled: boolean;
  tabDescription: boolean;
  tabSpecifications: boolean;
  tabReviews: boolean;
  tabShipping: boolean;

  // Sticky Add to Cart Settings
  stickyAddToCartEnabled: boolean;
  stickyShowOnMobile: boolean;
  stickyShowOnDesktop: boolean;
  stickyScrollThreshold?: number;
  stickyShowBuyNow?: boolean;
  stickyShowAddToCartButton?: boolean;
  stickyShowQuantity?: boolean;
  stickyShowProductImage?: boolean;
  stickyShowProductName?: boolean;
  stickyTrackAnalytics?: boolean;
  stickyAutoScrollToCheckout?: boolean;

  // Product Navigation Settings
  navigationEnabled?: boolean;
  navigationType?: 'sameCategory' | 'allProducts';
  showNavigationButtons?: boolean;
  keyboardShortcuts?: boolean;

  // Sold Number Display Settings
  soldNumberEnabled?: boolean;
  soldNumberType?: 'real' | 'fake';
  soldNumberMin?: number;
  soldNumberMax?: number;
  soldNumberText?: string;

  // Variant Styles Settings
  variantColorStyle?: 'buttons' | 'circles' | 'thumbnails' | 'dropdown' | 'swatches';
  variantColorShowName?: boolean;
  variantColorSize?: 'small' | 'medium' | 'large';
  variantSizeStyle?: 'buttons' | 'table' | 'dropdown' | 'grid';
  variantSizeShowGuide?: boolean;
  variantSizeShowStock?: boolean;

  // Stock Progress Bar Settings
  stockProgressEnabled?: boolean;
  stockProgressType?: 'percentage' | 'count' | 'text';
  stockProgressLowColor?: string;
  stockProgressMediumColor?: string;
  stockProgressHighColor?: string;
  stockProgressThreshold?: number;

  // Security Badges Settings
  securityBadgesEnabled?: boolean;
  badgeSecurePayment?: boolean;
  badgeFreeShipping?: boolean;
  badgeQualityGuarantee?: boolean;
  badgeCashOnDelivery?: boolean;
  badgeBuyerProtection?: boolean;
  badgeHighRating?: boolean;
  badgeCustom1?: boolean;
  badgeCustom1Text?: string;
  badgeCustom2?: boolean;
  badgeCustom2Text?: string;
  badgeLayout?: 'horizontal' | 'vertical';

  // Reasons to Purchase Settings
  reasonsToPurchaseEnabled?: boolean;
  reasonsToPurchaseType?: 'global' | 'perProduct';
  reasonsToPurchaseList?: string; // JSON array
  reasonsToPurchaseMaxItems?: number;
  reasonsToPurchaseStyle?: 'list' | 'icons';

  // Online Visitors Count Settings
  onlineVisitorsEnabled?: boolean;
  onlineVisitorsType?: 'real' | 'fake';
  onlineVisitorsMin?: number;
  onlineVisitorsMax?: number;
  onlineVisitorsUpdateInterval?: number;
  onlineVisitorsText?: string;

  // Estimated Delivery Time Settings
  estimatedDeliveryEnabled?: boolean;
  estimatedDeliveryShowOnProduct?: boolean;
  estimatedDeliveryDefaultText?: string;

  // FOMO Popup Settings
  fomoEnabled?: boolean;
  fomoType?: 'soldCount' | 'visitors' | 'stock' | 'countdown';
  fomoTrigger?: 'time' | 'scroll' | 'exit';
  fomoDelay?: number;
  fomoShowOncePerSession?: boolean;
  fomoMessage?: string;

  // SEO Settings
  seoEnabled: boolean;
  facebookPixelEnabled?: boolean;
  facebookPixelId?: string;
  pixelTrackPageView?: boolean;
  pixelTrackViewContent?: boolean;
  pixelTrackAddToCart?: boolean;
  pixelTrackInitiateCheckout?: boolean;
  pixelTrackPurchase?: boolean;
  pixelTrackSearch?: boolean;
  pixelTrackAddToWishlist?: boolean;

  // Mobile Bottom Navbar Settings
  mobileBottomNavbarEnabled?: boolean;
  mobileBottomNavbarShowHome?: boolean;
  mobileBottomNavbarShowShop?: boolean;
  mobileBottomNavbarShowWishlist?: boolean;
  mobileBottomNavbarShowAccount?: boolean;
  mobileBottomNavbarShowCompare?: boolean;
  mobileBottomNavbarShowSearch?: boolean;
  mobileBottomNavbarShowCart?: boolean;

  // Facebook Conversions API Settings
  facebookConvApiEnabled?: boolean;
  facebookConvApiToken?: string;
  facebookConvApiTestCode?: string;
  capiTrackPageView?: boolean;
  capiTrackViewContent?: boolean;
  capiTrackAddToCart?: boolean;
  capiTrackInitiateCheckout?: boolean;
  capiTrackPurchase?: boolean;
  capiTrackSearch?: boolean;

  // Advanced Settings
  eventDeduplicationEnabled?: boolean;
  eventMatchQualityTarget?: number;
  gdprCompliant?: boolean;
  hashUserData?: boolean;
  lastPixelTest?: string;
  lastCapiTest?: string;
  pixelStatus?: string;
  capiStatus?: string;

  // Product Page Layout Order Settings
  productPageLayoutEnabled?: boolean;
  productPageOrder?: string; // JSON array of element IDs in order
  productPageShowTitle?: boolean;
  productPageShowCategory?: boolean;
  productPageShowSocialSharing?: boolean;
  productPageShowBadges?: boolean;
  productPageShowPrice?: boolean;
  productPageShowCountdown?: boolean;
  productPageShowStockStatus?: boolean;
  productPageShowStockProgress?: boolean;
  productPageShowBackInStock?: boolean;
  productPageShowSecurityBadges?: boolean;
  productPageShowSoldNumber?: boolean;
  productPageShowOnlineVisitors?: boolean;
  productPageShowEstimatedDelivery?: boolean;
  productPageShowFreeShipping?: boolean;
  productPageShowPreOrder?: boolean;
  productPageShowVariants?: boolean;
  productPageShowSizeGuide?: boolean;
  productPageShowQuantity?: boolean;
  productPageShowVolumeDiscounts?: boolean;
  productPageShowReasonsToPurchase?: boolean;
  productPageShowActions?: boolean;
  productPageShowTabs?: boolean;
  productPageShowDescription?: boolean;
  productPageShowSKU?: boolean;
  productPageShowCheckoutForm?: boolean;

  createdAt: string;
  updatedAt: string;
}

export type StorefrontSettingsUpdate = Partial<Omit<StorefrontSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;

export const storefrontSettingsService = {
  /**
   * جلب إعدادات واجهة المتجر للشركة (محمي)
   */
  getSettings: async (): Promise<{ data: StorefrontSettings }> => {
    return apiClient.get('/storefront-settings');
  },

  /**
   * تحديث إعدادات واجهة المتجر (محمي)
   */
  updateSettings: async (data: StorefrontSettingsUpdate): Promise<{ data: StorefrontSettings }> => {
    return apiClient.put('/storefront-settings', data);
  },

  /**
   * إعادة تعيين الإعدادات للقيم الافتراضية (محمي)
   */
  resetSettings: async (): Promise<{ data: StorefrontSettings }> => {
    return apiClient.post('/storefront-settings/reset', {});
  },

  /**
   * اختبار Facebook Pixel
   */
  testFacebookPixel: async () => {
    const response = await apiClient.post('/storefront-settings/test-facebook-pixel', {});
    return response.data;
  },

  /**
   * اختبار اتصال Facebook Conversions API
   */
  testFacebookCapi: async () => {
    const response = await apiClient.post('/storefront-settings/test-facebook-capi', {});
    return response.data;
  },

  /**
   * التحقق من صحة Pixel ID
   */
  validatePixelId: async (pixelId: string) => {
    const response = await apiClient.post('/storefront-settings/validate-pixel-id', { pixelId });
    return response.data;
  },

  /**
   * جلب إعدادات واجهة المتجر للواجهة العامة (عام - بدون مصادقة)
   * يستخدم Cache مع expiration لتحسين الأداء
   */
  getPublicSettings: async (companyId: string, forceRefresh: boolean = false): Promise<{ success: boolean; data: StorefrontSettings }> => {
    const CACHE_KEY = `storefront_settings_${companyId}`;
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 دقائق
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

    // محاولة جلب البيانات من Cache أولاً (إلا إذا كان forceRefresh = true)
    // لكن نتخطى الـ cache للـ Facebook Pixel settings للتأكد من الحصول على أحدث البيانات
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();

          // التحقق من أن الـ cache لم ينتهِ
          if (now - timestamp < CACHE_EXPIRY) {
            // التحقق من أن الـ cache يحتوي على جميع الحقول المطلوبة
            // إذا كان `recentlyViewedEnabled` غير موجود، نعتبر الـ cache قديماً
            const hasRecentlyViewed = 'recentlyViewedEnabled' in data && data.recentlyViewedEnabled !== undefined;

            // التحقق من أن Facebook Pixel settings موجودة وصحيحة
            const hasValidPixelSettings = 'facebookPixelEnabled' in data && 'facebookPixelId' in data;

            if (!hasRecentlyViewed || !hasValidPixelSettings) {
              console.warn('⚠️ [STOREFRONT-SETTINGS] Cache missing required fields, fetching fresh data', {
                hasRecentlyViewed,
                hasValidPixelSettings,
                facebookPixelEnabled: data.facebookPixelEnabled,
                facebookPixelId: data.facebookPixelId
              });
              // نتابع لجلب بيانات جديدة - لا نرجع الـ cache
            } else {
              console.log('✅ [STOREFRONT-SETTINGS] Using cached settings', {
                recentlyViewedEnabled: data.recentlyViewedEnabled,
                facebookPixelEnabled: data.facebookPixelEnabled,
                facebookPixelId: data.facebookPixelId
              });
              return {
                success: true,
                data: data as StorefrontSettings
              };
            }
          } else {
            // Cache منتهي - سيتم جلب بيانات جديدة
            console.log('⏰ [STOREFRONT-SETTINGS] Cache expired, fetching fresh data');
          }
        }
      } catch (error) {
        // في حالة خطأ في قراءة الـ cache، نتابع لجلب بيانات جديدة
        console.warn('⚠️ [STOREFRONT-SETTINGS] Cache read error, fetching fresh data');
      }
    } else {
      console.log('🔄 [STOREFRONT-SETTINGS] Force refresh requested, skipping cache');
    }

    // جلب البيانات من API
    try {
      const apiUrl = getApiUrl();
      const settingsUrl = `${apiUrl}/public/storefront-settings/${companyId}?companyId=${companyId}`;
      console.log('📡 [STOREFRONT-SETTINGS] Fetching settings from API:', {
        companyId,
        url: settingsUrl
      });

      const response = await fetch(settingsUrl);

      if (!response.ok) {
        // Handle 500 errors gracefully - server might be having issues
        if (response.status === 500) {
          // محاولة استخدام الـ cache القديم في حالة خطأ السيرفر
          try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
              const { data } = JSON.parse(cached);
              if (isDevelopment) {
                console.warn('⚠️ [STOREFRONT-SETTINGS] Server error, using stale cache');
              }
              return {
                success: true,
                data: data as StorefrontSettings
              };
            }
          } catch (e) {
            // لا يوجد cache - نستخدم القيم الافتراضية
          }

          // Return default disabled settings for server errors
          return {
            success: true,
            data: {
              quickViewEnabled: false,
              comparisonEnabled: false,
              wishlistEnabled: false,
              reviewsEnabled: false,
              advancedFiltersEnabled: false,
              seoEnabled: false,
              recentlyViewedEnabled: false,
              recentlyViewedCount: 8,
              recentlyViewedDays: 30,
            } as StorefrontSettings
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('📡 [STOREFRONT-SETTINGS] API response received:', {
        success: data.success,
        hasData: !!data.data,
        facebookPixelEnabled: data.data?.facebookPixelEnabled,
        facebookPixelId: data.data?.facebookPixelId ? `Set (${data.data.facebookPixelId})` : 'Not set',
        facebookConvApiEnabled: data.data?.facebookConvApiEnabled,
        hasConvApiToken: !!data.data?.facebookConvApiToken
      });

      // التحقق من أن البيانات موجودة وصحيحة
      if (data.success && data.data) {
        // Debug logging for Facebook Pixel
        console.log('📊 [STOREFRONT-SETTINGS] Raw response data:', {
          facebookPixelEnabled: data.data.facebookPixelEnabled,
          facebookPixelId: data.data.facebookPixelId,
          pixelStatus: data.data.pixelStatus,
          pixelTrackPageView: data.data.pixelTrackPageView
        });

        // حفظ البيانات في Cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.data,
            timestamp: Date.now()
          }));
          if (isDevelopment) {
            console.log('✅ [STOREFRONT-SETTINGS] Settings cached successfully');
          }
        } catch (cacheError) {
          // في حالة فشل حفظ الـ cache، نتابع بدون مشكلة
          if (isDevelopment) {
            console.warn('⚠️ [STOREFRONT-SETTINGS] Failed to cache settings');
          }
        }

        if (isDevelopment) {
          console.log('✅ [STOREFRONT-SETTINGS] Settings loaded successfully:', {
            quickViewEnabled: data.data.quickViewEnabled,
            comparisonEnabled: data.data.comparisonEnabled,
            wishlistEnabled: data.data.wishlistEnabled,
            recentlyViewedEnabled: data.data.recentlyViewedEnabled,
            recentlyViewedCount: data.data.recentlyViewedCount,
            facebookPixelEnabled: data.data.facebookPixelEnabled,
            facebookPixelId: data.data.facebookPixelId
          });
        }
        return data;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      // Only log non-500 errors (500 is server issue, expected)
      const status = error?.status || error?.response?.status;

      // محاولة استخدام الـ cache القديم في حالة خطأ
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (isDevelopment) {
            console.warn('⚠️ [STOREFRONT-SETTINGS] Error fetching, using stale cache');
          }
          return {
            success: true,
            data: data as StorefrontSettings
          };
        }
      } catch (e) {
        // لا يوجد cache
      }

      if (status !== 500 && isDevelopment) {
        console.error('❌ [STOREFRONT-SETTINGS] Error fetching public storefront settings:', error);
      }

      // إرجاع القيم الافتراضية (كلها false) في حالة الخطأ لتجنب عرض المزايا عند فشل الجلب
      // هذا يضمن أن المزايا لن تظهر إذا فشل جلب الإعدادات
      return {
        success: false,
        data: {
          id: '',
          companyId,
          quickViewEnabled: false,
          quickViewShowAddToCart: false,
          quickViewShowWishlist: false,
          comparisonEnabled: false,
          maxComparisonProducts: 4,
          comparisonShowPrice: false,
          comparisonShowSpecs: false,
          wishlistEnabled: false,
          wishlistRequireLogin: false,
          wishlistMaxItems: 100,
          advancedFiltersEnabled: false,
          filterByPrice: false,
          filterByRating: false,
          filterByBrand: false,
          filterByAttributes: false,
          reviewsEnabled: false,
          reviewsRequirePurchase: false,
          reviewsModerationEnabled: false,
          reviewsShowRating: false,
          minRatingToDisplay: 1,
          countdownEnabled: false,
          countdownShowOnProduct: false,
          countdownShowOnListing: false,
          backInStockEnabled: false,
          backInStockNotifyEmail: false,
          backInStockNotifySMS: false,
          recentlyViewedEnabled: false,
          recentlyViewedCount: 8,
          recentlyViewedDays: 30,
          // Gallery Layout Defaults
          galleryLayout: 'bottom',
          galleryStyle: 'slider',
          thumbnailSize: 'medium',
          thumbnailsPerRow: 4,
          thumbnailSpacing: 8,
          thumbnailBorderRadius: 8,
          mainImageAspectRatio: '1:1',
          // Slider Defaults
          sliderEnabled: true,
          sliderAutoplay: false,
          sliderAutoplaySpeed: 3000,
          sliderShowArrows: true,
          sliderShowDots: false,
          sliderInfiniteLoop: true,
          sliderTransitionEffect: 'slide',
          sliderTransitionSpeed: 300,
          // Image Zoom Defaults
          imageZoomEnabled: false,
          imageZoomType: 'hover',
          zoomStyle: 'side',
          zoomLensShape: 'square',
          zoomLensSize: 150,
          zoomLevel: 2.5,
          zoomWindowPosition: 'right',
          zoomWindowSize: 400,
          mouseWheelZoom: false,
          // Lightbox Defaults
          lightboxEnabled: true,
          lightboxShowThumbnails: true,
          lightboxShowArrows: true,
          lightboxShowCounter: true,
          lightboxZoomEnabled: true,
          lightboxKeyboardNav: true,
          lightboxBackgroundColor: 'rgba(0,0,0,0.9)',
          lightboxCloseOnOverlay: true,
          // Video Defaults
          productVideosEnabled: false,
          videoAutoplay: false,
          videoShowControls: true,
          videoSources: '["youtube", "vimeo", "self-hosted"]',
          videoMuted: true,
          videoPlayMode: 'inline',
          videoPosition: 'end',
          videoThumbnailIcon: true,
          // Variation Images Defaults
          variationImagesEnabled: true,
          variationImagesBehavior: 'replace',
          variationImagesAnimation: 'fade',
          // Mobile Defaults
          mobileSwipeEnabled: true,
          mobilePinchZoom: true,
          mobileFullscreenOnTap: true,
          mobileGalleryLayout: 'slider',
          mobileShowThumbnails: false,
          // 360 View Defaults
          view360Enabled: false,
          view360AutoRotate: true,
          view360RotateSpeed: 5,
          view360ShowControls: true,
          // Visual Effects Defaults
          imageHoverEffect: 'zoom',
          imageBorderRadius: 8,
          imageShadow: true,
          imageLoadingEffect: 'skeleton',
          imagePlaceholder: '📦',
          sizeGuideEnabled: false,
          sizeGuideShowOnProduct: false,
          socialSharingEnabled: false,
          shareFacebook: false,
          shareTwitter: false,
          shareWhatsApp: false,
          shareTelegram: false,
          badgesEnabled: false,
          badgeNew: false,
          badgeBestSeller: false,
          badgeOnSale: false,
          badgeOutOfStock: false,
          tabsEnabled: false,
          tabDescription: false,
          tabSpecifications: false,
          tabReviews: false,
          tabShipping: false,
          stickyAddToCartEnabled: false,
          stickyShowOnMobile: false,
          stickyShowOnDesktop: false,
          stickyScrollThreshold: 300,
          stickyShowBuyNow: true,
          stickyShowAddToCartButton: true,
          stickyShowQuantity: true,
          stickyShowProductImage: true,
          stickyShowProductName: true,
          stickyTrackAnalytics: true,
          stickyAutoScrollToCheckout: false,
          // Product Navigation
          navigationEnabled: false,
          navigationType: 'sameCategory',
          showNavigationButtons: true,
          keyboardShortcuts: true,
          // Sold Number Display
          soldNumberEnabled: false,
          soldNumberType: 'real',
          soldNumberMin: 10,
          soldNumberMax: 500,
          soldNumberText: 'تم بيع {count} قطعة',
          // Variant Styles
          variantColorStyle: 'buttons',
          variantColorShowName: true,
          variantColorSize: 'medium',
          variantSizeStyle: 'buttons',
          variantSizeShowGuide: false,
          variantSizeShowStock: true,
          // Stock Progress Bar
          stockProgressEnabled: false,
          stockProgressType: 'percentage',
          stockProgressLowColor: '#ef4444',
          stockProgressMediumColor: '#f59e0b',
          stockProgressHighColor: '#10b981',
          stockProgressThreshold: 10,
          // Security Badges
          securityBadgesEnabled: false,
          badgeSecurePayment: true,
          badgeFreeShipping: true,
          badgeQualityGuarantee: true,
          badgeCashOnDelivery: true,
          badgeBuyerProtection: true,
          badgeHighRating: true,
          badgeCustom1: false,
          badgeCustom1Text: '',
          badgeCustom2: false,
          badgeCustom2Text: '',
          badgeLayout: 'horizontal',
          // Reasons to Purchase
          reasonsToPurchaseEnabled: false,
          reasonsToPurchaseType: 'global',
          reasonsToPurchaseList: '',
          reasonsToPurchaseMaxItems: 4,
          reasonsToPurchaseStyle: 'list',
          // Online Visitors Count
          onlineVisitorsEnabled: false,
          onlineVisitorsType: 'fake',
          onlineVisitorsMin: 5,
          onlineVisitorsMax: 50,
          onlineVisitorsUpdateInterval: 30,
          onlineVisitorsText: '{count} شخص يشاهدون هذا المنتج الآن',
          estimatedDeliveryEnabled: false,
          estimatedDeliveryShowOnProduct: true,
          estimatedDeliveryDefaultText: 'التوصيل خلال {time}',
          fomoEnabled: false,
          fomoType: 'soldCount',
          fomoTrigger: 'time',
          fomoDelay: 30,
          fomoShowOncePerSession: true,
          fomoMessage: '',
          seoEnabled: false,
          seoMetaDescription: false,
          seoStructuredData: false,
          seoSitemap: false,
          seoOpenGraph: false,
          multiLanguageEnabled: false,
          defaultLanguage: 'ar',
          supportedLanguages: ['ar'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as StorefrontSettings
      };
    }
  },

  /**
   * مسح Cache للإعدادات (مفيد عند تحديث الإعدادات)
   */
  clearCache: (companyId: string) => {
    const CACHE_KEY = `storefront_settings_${companyId}`;
    localStorage.removeItem(CACHE_KEY);
  },

  // ============================================
  // 🔧 DIAGNOSTICS & TROUBLESHOOTING
  // ============================================

  /**
   * تشخيص شامل لاتصال Facebook Pixel و CAPI
   */
  getPixelDiagnostics: async () => {
    const response = await apiClient.get('/storefront-settings/pixel-diagnostics');
    return response.data;
  },

  /**
   * فحص صلاحيات Access Token
   */
  checkTokenPermissions: async () => {
    const response = await apiClient.post('/storefront-settings/check-token-permissions', {});
    return response.data;
  },

  /**
   * التحقق من صحة البيانات المُرسلة
   */
  validateEventData: async (eventName: string, eventData: any) => {
    const response = await apiClient.post('/storefront-settings/validate-event-data', { eventName, eventData });
    return response.data;
  },

  // ============================================
  // 🎯 MULTIPLE PIXELS SUPPORT
  // ============================================

  /**
   * جلب جميع Pixels للشركة
   */
  getPixels: async () => {
    const response = await apiClient.get('/storefront-settings/pixels');
    return response.data;
  },

  /**
   * إضافة Pixel جديد
   */
  addPixel: async (pixelData: {
    pixelId: string;
    pixelName: string;
    accessToken?: string;
    isPrimary?: boolean;
    trackPageView?: boolean;
    trackViewContent?: boolean;
    trackAddToCart?: boolean;
    trackInitiateCheckout?: boolean;
    trackPurchase?: boolean;
    trackSearch?: boolean;
    trackAddToWishlist?: boolean;
    trackLead?: boolean;
    trackCompleteRegistration?: boolean;
  }) => {
    const response = await apiClient.post('/storefront-settings/pixels', pixelData);
    return response.data;
  },

  /**
   * تحديث Pixel
   */
  updatePixel: async (id: string, pixelData: any) => {
    const response = await apiClient.put(`/storefront-settings/pixels/${id}`, pixelData);
    return response.data;
  },

  /**
   * حذف Pixel
   */
  deletePixel: async (id: string) => {
    const response = await apiClient.delete(`/storefront-settings/pixels/${id}`);
    return response.data;
  },

  /**
   * اختبار Pixel محدد
   */
  testPixelById: async (id: string) => {
    const response = await apiClient.post(`/storefront-settings/pixels/${id}/test`, {});
    return response.data;
  },

  /**
   * 🆕 إنشاء Pixel جديد على Facebook
   */
  createFacebookPixel: async (pixelName: string, businessId?: string) => {
    const response = await apiClient.post('/storefront-settings/create-pixel', {
      pixelName,
      businessId
    });
    return response.data;
  },

  /**
   * 🏢 جلب Business Accounts المتاحة
   */
  getBusinessAccounts: async () => {
    const response = await apiClient.get('/storefront-settings/business-accounts');
    return response.data;
  }
};

