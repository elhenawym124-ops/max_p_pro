const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * 🛍️ Controller لإدارة إعدادات واجهة المتجر (Storefront Features)
 */

/**
 * جلب إعدادات واجهة المتجر للشركة
 * GET /api/v1/storefront-settings
 */
exports.getStorefrontSettings = async (req, res) => {
  try {
    // Debug: Log request details
    console.log('🔍 [STOREFRONT-SETTINGS] ===== Request received =====');
    console.log('🔍 [STOREFRONT-SETTINGS] Method:', req.method);
    console.log('🔍 [STOREFRONT-SETTINGS] Path:', req.path);
    console.log('🔍 [STOREFRONT-SETTINGS] req.user exists:', !!req.user);

    if (req.user) {
      console.log('🔍 [STOREFRONT-SETTINGS] req.user.id:', req.user.id);
      console.log('🔍 [STOREFRONT-SETTINGS] req.user.email:', req.user.email);
      console.log('🔍 [STOREFRONT-SETTINGS] req.user.companyId:', req.user.companyId);
      console.log('🔍 [STOREFRONT-SETTINGS] req.user.role:', req.user.role);
    } else {
      console.error('❌ [STOREFRONT-SETTINGS] req.user is MISSING!');
      console.error('❌ [STOREFRONT-SETTINGS] This should not happen if requireAuth middleware is working');
      console.error('❌ [STOREFRONT-SETTINGS] req.headers.authorization:', req.headers.authorization ? 'exists' : 'missing');
    }

    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [STOREFRONT-SETTINGS] Getting settings for company:', companyId);

    if (!companyId) {
      console.error('❌ [STOREFRONT-SETTINGS] Company ID missing.');
      console.error('❌ [STOREFRONT-SETTINGS] req.user:', req.user);
      console.error('❌ [STOREFRONT-SETTINGS] req.user?.companyId:', req.user?.companyId);
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        error: 'Company ID is required. User may not be authenticated properly.',
        debug: {
          hasUser: !!req.user,
          userCompanyId: req.user?.companyId,
          authHeader: !!req.headers.authorization
        }
      });
    }

    // البحث عن الإعدادات
    let settings = null;
    try {
      console.log('🔍 [STOREFRONT-SETTINGS] Searching for settings with companyId:', companyId);
      settings = await prisma.storefrontSettings.findUnique({
        where: { companyId }
      });
      console.log('📊 [STOREFRONT-SETTINGS] Query result:', settings ? 'Found' : 'Not found');
    } catch (findError) {
      console.error('❌ [STOREFRONT-SETTINGS] Error finding settings:', findError);
      console.error('❌ [STOREFRONT-SETTINGS] Error message:', findError.message);
      console.error('❌ [STOREFRONT-SETTINGS] Error stack:', findError.stack);
      // لا نرمي الخطأ هنا، بل نحاول إنشاء إعدادات جديدة
    }

    console.log('📊 [STOREFRONT-SETTINGS] Found settings:', settings ? 'Yes' : 'No');

    // إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
    if (!settings) {
      console.log('🔨 [STOREFRONT-SETTINGS] Creating default settings for companyId:', companyId);
      try {
        settings = await prisma.storefrontSettings.create({
          data: {
            companyId,
            // جميع القيم الافتراضية موجودة في Schema
            // لكن يجب توفير supportedLanguages لأنه Json field (required)
            supportedLanguages: ["ar"] // القيمة الافتراضية - يجب أن يكون array
          }
        });
        console.log('✅ [STOREFRONT-SETTINGS] Settings created successfully with supportedLanguages:', settings.supportedLanguages);
        console.log('✅ [STOREFRONT-SETTINGS] Created settings:', settings.id);
      } catch (createError) {
        console.error('❌ [STOREFRONT-SETTINGS] Error creating settings:', createError);
        console.error('❌ [STOREFRONT-SETTINGS] Error code:', createError.code);
        console.error('❌ [STOREFRONT-SETTINGS] Error message:', createError.message);
        console.error('❌ [STOREFRONT-SETTINGS] Error meta:', createError.meta);

        // إذا فشل الإنشاء، قد يكون بسبب أن السجل موجود بالفعل (race condition)
        // أو مشكلة في قاعدة البيانات
        if (createError.code === 'P2002') {
          // Unique constraint violation - السجل موجود بالفعل
          console.log('⚠️ [STOREFRONT-SETTINGS] Settings already exist (race condition), fetching...');
          try {
            settings = await prisma.storefrontSettings.findUnique({
              where: { companyId }
            });
            if (settings) {
              console.log('✅ [STOREFRONT-SETTINGS] Found existing settings after race condition');
            }
          } catch (retryError) {
            console.error('❌ [STOREFRONT-SETTINGS] Error on retry:', retryError);
            throw createError; // رمي الخطأ الأصلي
          }
        } else {
          // خطأ آخر - رمي الخطأ
          throw createError;
        }
      }
    }

    if (!settings) {
      console.error('❌ [STOREFRONT-SETTINGS] Settings is still null after all attempts');
      return res.status(500).json({
        success: false,
        message: 'فشل في إنشاء أو جلب الإعدادات',
        error: 'Unable to create or retrieve storefront settings'
      });
    }

    // Ensure boolean values are properly serialized (MySQL may return 0/1 instead of true/false)
    const serializedSettings = {
      ...settings,
      // Convert any potential numeric booleans (0/1) or string booleans to actual booleans
      quickViewEnabled: Boolean(settings.quickViewEnabled),
      quickViewShowAddToCart: Boolean(settings.quickViewShowAddToCart),
      quickViewShowWishlist: Boolean(settings.quickViewShowWishlist),
      comparisonEnabled: Boolean(settings.comparisonEnabled),
      comparisonShowPrice: Boolean(settings.comparisonShowPrice),
      comparisonShowSpecs: Boolean(settings.comparisonShowSpecs),
      wishlistEnabled: Boolean(settings.wishlistEnabled),
      wishlistRequireLogin: Boolean(settings.wishlistRequireLogin),
      advancedFiltersEnabled: Boolean(settings.advancedFiltersEnabled),
      filterByPrice: Boolean(settings.filterByPrice),
      filterByRating: Boolean(settings.filterByRating),
      filterByBrand: Boolean(settings.filterByBrand),
      filterByAttributes: Boolean(settings.filterByAttributes),
      reviewsEnabled: Boolean(settings.reviewsEnabled),
      reviewsRequirePurchase: Boolean(settings.reviewsRequirePurchase),
      reviewsModerationEnabled: Boolean(settings.reviewsModerationEnabled),
      reviewsShowRating: Boolean(settings.reviewsShowRating),
      countdownEnabled: Boolean(settings.countdownEnabled),
      countdownShowOnProduct: Boolean(settings.countdownShowOnProduct),
      countdownShowOnListing: Boolean(settings.countdownShowOnListing),
      backInStockEnabled: Boolean(settings.backInStockEnabled),
      backInStockNotifyEmail: Boolean(settings.backInStockNotifyEmail),
      backInStockNotifySMS: Boolean(settings.backInStockNotifySMS),
      recentlyViewedEnabled: Boolean(settings.recentlyViewedEnabled),
      imageZoomEnabled: Boolean(settings.imageZoomEnabled),
      productVideosEnabled: Boolean(settings.productVideosEnabled),
      videoAutoplay: Boolean(settings.videoAutoplay),
      videoShowControls: Boolean(settings.videoShowControls),
      sizeGuideEnabled: Boolean(settings.sizeGuideEnabled),
      sizeGuideShowOnProduct: Boolean(settings.sizeGuideShowOnProduct),
      socialSharingEnabled: Boolean(settings.socialSharingEnabled),
      shareFacebook: Boolean(settings.shareFacebook),
      shareTwitter: Boolean(settings.shareTwitter),
      shareWhatsApp: Boolean(settings.shareWhatsApp),
      shareTelegram: Boolean(settings.shareTelegram),
      badgesEnabled: Boolean(settings.badgesEnabled),
      badgeNew: Boolean(settings.badgeNew),
      badgeBestSeller: Boolean(settings.badgeBestSeller),
      badgeOnSale: Boolean(settings.badgeOnSale),
      badgeOutOfStock: Boolean(settings.badgeOutOfStock),
      tabsEnabled: Boolean(settings.tabsEnabled),
      tabDescription: Boolean(settings.tabDescription),
      tabSpecifications: Boolean(settings.tabSpecifications),
      tabReviews: Boolean(settings.tabReviews),
      tabShipping: Boolean(settings.tabShipping),
      stickyAddToCartEnabled: Boolean(settings.stickyAddToCartEnabled),
      stickyShowOnMobile: Boolean(settings.stickyShowOnMobile),
      stickyShowOnDesktop: Boolean(settings.stickyShowOnDesktop),
      stickyScrollThreshold: parseInt(settings.stickyScrollThreshold) || 300,
      stickyShowBuyNow: Boolean(settings.stickyShowBuyNow !== false),
      stickyShowAddToCartButton: Boolean(settings.stickyShowAddToCartButton !== false),
      stickyShowQuantity: Boolean(settings.stickyShowQuantity !== false),
      stickyShowProductImage: Boolean(settings.stickyShowProductImage !== false),
      stickyShowProductName: Boolean(settings.stickyShowProductName !== false),
      stickyTrackAnalytics: Boolean(settings.stickyTrackAnalytics !== false),
      stickyAutoScrollToCheckout: Boolean(settings.stickyAutoScrollToCheckout === true),
      // Product Navigation Settings
      navigationEnabled: Boolean(settings.navigationEnabled === true),
      navigationType: settings.navigationType || 'sameCategory',
      showNavigationButtons: Boolean(settings.showNavigationButtons !== false),
      keyboardShortcuts: Boolean(settings.keyboardShortcuts !== false),
      // Sold Number Display Settings
      soldNumberEnabled: Boolean(settings.soldNumberEnabled === true),
      soldNumberType: settings.soldNumberType || 'real',
      soldNumberMin: parseInt(settings.soldNumberMin) || 10,
      soldNumberMax: parseInt(settings.soldNumberMax) || 500,
      soldNumberText: settings.soldNumberText || 'تم بيع {count} قطعة',
      // Variant Styles Settings
      variantColorStyle: settings.variantColorStyle || 'buttons',
      variantColorShowName: Boolean(settings.variantColorShowName !== false),
      variantColorSize: settings.variantColorSize || 'medium',
      variantSizeStyle: settings.variantSizeStyle || 'buttons',
      variantSizeShowGuide: Boolean(settings.variantSizeShowGuide === true),
      variantSizeShowStock: Boolean(settings.variantSizeShowStock !== false),
      // Stock Progress Bar Settings
      stockProgressEnabled: Boolean(settings.stockProgressEnabled === true),
      stockProgressType: settings.stockProgressType || 'percentage',
      stockProgressLowColor: settings.stockProgressLowColor || '#ef4444',
      stockProgressMediumColor: settings.stockProgressMediumColor || '#f59e0b',
      stockProgressHighColor: settings.stockProgressHighColor || '#10b981',
      stockProgressThreshold: parseInt(settings.stockProgressThreshold) || 10,
      // Security Badges Settings
      securityBadgesEnabled: Boolean(settings.securityBadgesEnabled === true),
      badgeSecurePayment: Boolean(settings.badgeSecurePayment !== false),
      badgeFreeShipping: Boolean(settings.badgeFreeShipping !== false),
      badgeQualityGuarantee: Boolean(settings.badgeQualityGuarantee !== false),
      badgeCashOnDelivery: Boolean(settings.badgeCashOnDelivery !== false),
      badgeBuyerProtection: Boolean(settings.badgeBuyerProtection !== false),
      badgeHighRating: Boolean(settings.badgeHighRating !== false),
      badgeCustom1: Boolean(settings.badgeCustom1 === true),
      badgeCustom1Text: settings.badgeCustom1Text || null,
      badgeCustom2: Boolean(settings.badgeCustom2 === true),
      badgeCustom2Text: settings.badgeCustom2Text || null,
      badgeLayout: settings.badgeLayout || 'horizontal',
      // Reasons to Purchase Settings
      reasonsToPurchaseEnabled: Boolean(settings.reasonsToPurchaseEnabled === true),
      reasonsToPurchaseType: settings.reasonsToPurchaseType || 'global',
      reasonsToPurchaseList: settings.reasonsToPurchaseList || null,
      reasonsToPurchaseMaxItems: parseInt(settings.reasonsToPurchaseMaxItems) || 4,
      reasonsToPurchaseStyle: settings.reasonsToPurchaseStyle || 'list',
      // Online Visitors Count Settings
      onlineVisitorsEnabled: Boolean(settings.onlineVisitorsEnabled === true),
      onlineVisitorsType: settings.onlineVisitorsType || 'fake',
      onlineVisitorsMin: parseInt(settings.onlineVisitorsMin) || 5,
      onlineVisitorsMax: parseInt(settings.onlineVisitorsMax) || 50,
      onlineVisitorsUpdateInterval: parseInt(settings.onlineVisitorsUpdateInterval) || 30,
      onlineVisitorsText: settings.onlineVisitorsText || '{count} شخص يشاهدون هذا المنتج الآن',
      // Estimated Delivery Time Settings
      estimatedDeliveryEnabled: Boolean(settings.estimatedDeliveryEnabled === true),
      estimatedDeliveryShowOnProduct: Boolean(settings.estimatedDeliveryShowOnProduct !== false),
      estimatedDeliveryDefaultText: settings.estimatedDeliveryDefaultText || 'التوصيل خلال {time}',
      // FOMO Popup Settings
      fomoEnabled: Boolean(settings.fomoEnabled === true),
      fomoType: settings.fomoType || 'soldCount',
      fomoTrigger: settings.fomoTrigger || 'time',
      fomoDelay: parseInt(settings.fomoDelay) || 30,
      fomoShowOncePerSession: Boolean(settings.fomoShowOncePerSession !== false),
      fomoMessage: settings.fomoMessage || null,
      seoEnabled: Boolean(settings.seoEnabled),
      seoMetaDescription: Boolean(settings.seoMetaDescription),
      seoStructuredData: Boolean(settings.seoStructuredData),
      seoSitemap: Boolean(settings.seoSitemap),
      seoOpenGraph: Boolean(settings.seoOpenGraph),
      multiLanguageEnabled: Boolean(settings.multiLanguageEnabled),
      // Facebook Pixel Settings
      facebookPixelEnabled: Boolean(settings.facebookPixelEnabled),
      facebookPixelId: settings.facebookPixelId || null,
      pixelTrackPageView: Boolean(settings.pixelTrackPageView),
      pixelTrackViewContent: Boolean(settings.pixelTrackViewContent),
      pixelTrackAddToCart: Boolean(settings.pixelTrackAddToCart),
      pixelTrackInitiateCheckout: Boolean(settings.pixelTrackInitiateCheckout),
      pixelTrackPurchase: Boolean(settings.pixelTrackPurchase),
      pixelTrackSearch: Boolean(settings.pixelTrackSearch),
      pixelTrackAddToWishlist: Boolean(settings.pixelTrackAddToWishlist),
      // Mobile Bottom Navbar Settings
      mobileBottomNavbarEnabled: Boolean(settings.mobileBottomNavbarEnabled),
      mobileBottomNavbarShowHome: Boolean(settings.mobileBottomNavbarShowHome),
      mobileBottomNavbarShowShop: Boolean(settings.mobileBottomNavbarShowShop),
      mobileBottomNavbarShowWishlist: Boolean(settings.mobileBottomNavbarShowWishlist),
      mobileBottomNavbarShowAccount: Boolean(settings.mobileBottomNavbarShowAccount),
      mobileBottomNavbarShowCompare: Boolean(settings.mobileBottomNavbarShowCompare),
      mobileBottomNavbarShowSearch: Boolean(settings.mobileBottomNavbarShowSearch),
      mobileBottomNavbarShowCart: Boolean(settings.mobileBottomNavbarShowCart),

      // Facebook Conversions API Settings
      facebookConvApiEnabled: Boolean(settings.facebookConvApiEnabled),
      facebookConvApiToken: settings.facebookConvApiToken || null,
      facebookConvApiTestCode: settings.facebookConvApiTestCode || null,
      capiTrackPageView: Boolean(settings.capiTrackPageView),
      capiTrackViewContent: Boolean(settings.capiTrackViewContent),
      capiTrackAddToCart: Boolean(settings.capiTrackAddToCart),
      capiTrackInitiateCheckout: Boolean(settings.capiTrackInitiateCheckout),
      capiTrackPurchase: Boolean(settings.capiTrackPurchase),
      capiTrackSearch: Boolean(settings.capiTrackSearch),
      // Advanced Settings
      eventDeduplicationEnabled: Boolean(settings.eventDeduplicationEnabled),
      eventMatchQualityTarget: settings.eventMatchQualityTarget ? parseInt(settings.eventMatchQualityTarget) : 8,
      gdprCompliant: Boolean(settings.gdprCompliant),
      hashUserData: Boolean(settings.hashUserData),
      lastPixelTest: settings.lastPixelTest || null,
      lastCapiTest: settings.lastCapiTest || null,
      pixelStatus: settings.pixelStatus || 'not_configured',
      capiStatus: settings.capiStatus || 'not_configured'
    };

    console.log('✅ [STOREFRONT-SETTINGS] Returning settings with booleans:', {
      id: serializedSettings.id,
      quickViewEnabled: serializedSettings.quickViewEnabled,
      comparisonEnabled: serializedSettings.comparisonEnabled,
      wishlistEnabled: serializedSettings.wishlistEnabled,
      reviewsEnabled: serializedSettings.reviewsEnabled,
      facebookPixelEnabled: serializedSettings.facebookPixelEnabled
    });

    return res.status(200).json({
      success: true,
      data: serializedSettings
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Error fetching settings:', error);
    console.error('❌ [STOREFRONT-SETTINGS] Error name:', error.name);
    console.error('❌ [STOREFRONT-SETTINGS] Error message:', error.message);
    console.error('❌ [STOREFRONT-SETTINGS] Error code:', error.code);
    console.error('❌ [STOREFRONT-SETTINGS] Error stack:', error.stack);
    if (error.meta) {
      console.error('❌ [STOREFRONT-SETTINGS] Error meta:', JSON.stringify(error.meta, null, 2));
    }
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta
      } : undefined
    });
  }
};

/**
 * تحديث إعدادات واجهة المتجر
 * PUT /api/v1/storefront-settings
 */
exports.updateStorefrontSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const settingsData = req.body;
    const prisma = getPrisma();

    console.log('🔄 [STOREFRONT-SETTINGS] Updating settings for company:', companyId);
    console.log('📤 [STOREFRONT-SETTINGS] Data:', settingsData);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // قائمة الحقول المسموحة
    const allowedFields = [
      // Quick View
      'quickViewEnabled', 'quickViewShowAddToCart', 'quickViewShowWishlist',
      // Comparison
      'comparisonEnabled', 'maxComparisonProducts', 'comparisonShowPrice', 'comparisonShowSpecs',
      // Wishlist
      'wishlistEnabled', 'wishlistRequireLogin', 'wishlistMaxItems',
      // Advanced Filters
      'advancedFiltersEnabled', 'filterByPrice', 'filterByRating', 'filterByBrand', 'filterByAttributes',
      // Reviews
      'reviewsEnabled', 'reviewsRequirePurchase', 'reviewsModerationEnabled', 'reviewsShowRating', 'minRatingToDisplay',
      // Countdown
      'countdownEnabled', 'countdownShowOnProduct', 'countdownShowOnListing',
      // Back in Stock
      'backInStockEnabled', 'backInStockNotifyEmail', 'backInStockNotifySMS',
      // Recently Viewed
      'recentlyViewedEnabled', 'recentlyViewedCount', 'recentlyViewedDays',
      // Gallery Layout Settings
      'galleryLayout', 'galleryStyle', 'thumbnailSize', 'thumbnailsPerRow',
      'thumbnailSpacing', 'thumbnailBorderRadius', 'mainImageAspectRatio',
      // Slider/Carousel Settings
      'sliderEnabled', 'sliderAutoplay', 'sliderAutoplaySpeed', 'sliderShowArrows',
      'sliderShowDots', 'sliderInfiniteLoop', 'sliderTransitionEffect', 'sliderTransitionSpeed',
      // Image Zoom (Enhanced)
      'imageZoomEnabled', 'imageZoomType', 'zoomStyle', 'zoomLensShape', 'zoomLensSize',
      'zoomLevel', 'zoomWindowPosition', 'zoomWindowSize', 'mouseWheelZoom',
      // Lightbox Settings
      'lightboxEnabled', 'lightboxShowThumbnails', 'lightboxShowArrows', 'lightboxShowCounter',
      'lightboxZoomEnabled', 'lightboxKeyboardNav', 'lightboxBackgroundColor', 'lightboxCloseOnOverlay',
      // Product Videos (Enhanced)
      'productVideosEnabled', 'videoAutoplay', 'videoShowControls', 'videoSources',
      'videoMuted', 'videoPlayMode', 'videoPosition', 'videoThumbnailIcon',
      // Variation Images Settings
      'variationImagesEnabled', 'variationImagesBehavior', 'variationImagesAnimation',
      // Mobile Gallery Settings
      'mobileSwipeEnabled', 'mobilePinchZoom', 'mobileFullscreenOnTap',
      'mobileGalleryLayout', 'mobileShowThumbnails',
      // 360 View Settings
      'view360Enabled', 'view360AutoRotate', 'view360RotateSpeed', 'view360ShowControls',
      // Visual Effects Settings
      'imageHoverEffect', 'imageBorderRadius', 'imageShadow', 'imageLoadingEffect', 'imagePlaceholder',
      // Size Guide
      'sizeGuideEnabled', 'sizeGuideShowOnProduct',
      // Social Sharing
      'socialSharingEnabled', 'shareFacebook', 'shareTwitter', 'shareWhatsApp', 'shareTelegram',
      // Badges
      'badgesEnabled', 'badgeNew', 'badgeBestSeller', 'badgeOnSale', 'badgeOutOfStock',
      // Tabs
      'tabsEnabled', 'tabDescription', 'tabSpecifications', 'tabReviews', 'tabShipping',
      // Sticky Add to Cart
      'stickyAddToCartEnabled', 'stickyShowOnMobile', 'stickyShowOnDesktop',
      'stickyScrollThreshold', 'stickyShowBuyNow', 'stickyShowAddToCartButton',
      'stickyShowQuantity', 'stickyShowProductImage', 'stickyShowProductName',
      'stickyTrackAnalytics', 'stickyAutoScrollToCheckout',
      // Product Navigation
      'navigationEnabled', 'navigationType', 'showNavigationButtons', 'keyboardShortcuts',
      // Sold Number Display
      'soldNumberEnabled', 'soldNumberType', 'soldNumberMin', 'soldNumberMax', 'soldNumberText',
      // Mobile Bottom Navbar Settings
      'mobileBottomNavbarEnabled', 'mobileBottomNavbarShowHome', 'mobileBottomNavbarShowShop',
      'mobileBottomNavbarShowWishlist', 'mobileBottomNavbarShowAccount', 'mobileBottomNavbarShowCompare',
      'mobileBottomNavbarShowSearch', 'mobileBottomNavbarShowCart',
      // Variant Styles
      'variantColorStyle', 'variantColorShowName', 'variantColorSize',
      'variantSizeStyle', 'variantSizeShowGuide', 'variantSizeShowStock',
      // Stock Progress Bar
      'stockProgressEnabled', 'stockProgressType', 'stockProgressLowColor',
      'stockProgressMediumColor', 'stockProgressHighColor', 'stockProgressThreshold',
      // Security Badges
      'securityBadgesEnabled', 'badgeSecurePayment', 'badgeFreeShipping',
      'badgeQualityGuarantee', 'badgeCashOnDelivery', 'badgeBuyerProtection',
      'badgeHighRating', 'badgeCustom1', 'badgeCustom1Text', 'badgeCustom2', 'badgeCustom2Text', 'badgeLayout',
      // Reasons to Purchase
      'reasonsToPurchaseEnabled', 'reasonsToPurchaseType', 'reasonsToPurchaseList',
      'reasonsToPurchaseMaxItems', 'reasonsToPurchaseStyle',
      // Online Visitors Count
      'onlineVisitorsEnabled', 'onlineVisitorsType', 'onlineVisitorsMin',
      'onlineVisitorsMax', 'onlineVisitorsUpdateInterval', 'onlineVisitorsText',
      // Estimated Delivery Time
      'estimatedDeliveryEnabled', 'estimatedDeliveryShowOnProduct', 'estimatedDeliveryDefaultText',
      // FOMO Popup
      'fomoEnabled', 'fomoType', 'fomoTrigger', 'fomoDelay', 'fomoShowOncePerSession', 'fomoMessage',
      // Product Page Layout Order Settings
      'productPageLayoutEnabled', 'productPageOrder',
      'productPageShowTitle', 'productPageShowCategory', 'productPageShowSocialSharing',
      'productPageShowBadges', 'productPageShowPrice', 'productPageShowCountdown',
      'productPageShowStockStatus', 'productPageShowStockProgress', 'productPageShowBackInStock',
      'productPageShowSecurityBadges', 'productPageShowSoldNumber', 'productPageShowOnlineVisitors',
      'productPageShowEstimatedDelivery', 'productPageShowFreeShipping', 'productPageShowPreOrder',
      'productPageShowVariants', 'productPageShowSizeGuide', 'productPageShowQuantity',
      'productPageShowVolumeDiscounts', 'productPageShowReasonsToPurchase', 'productPageShowActions',
      'productPageShowTabs', 'productPageShowDescription', 'productPageShowSKU', 'productPageShowCheckoutForm',
      // SEO
      'seoEnabled', 'seoMetaDescription', 'seoStructuredData', 'seoSitemap', 'seoOpenGraph',
      // Multi-language
      'multiLanguageEnabled', 'defaultLanguage', 'supportedLanguages',
      // Facebook Pixel
      'facebookPixelEnabled', 'facebookPixelId',
      'pixelTrackPageView', 'pixelTrackViewContent', 'pixelTrackAddToCart',
      'pixelTrackInitiateCheckout', 'pixelTrackPurchase', 'pixelTrackSearch', 'pixelTrackAddToWishlist',
      // Facebook Conversions API
      'facebookConvApiEnabled', 'facebookConvApiToken', 'facebookConvApiTestCode',
      'capiTrackPageView', 'capiTrackViewContent', 'capiTrackAddToCart',
      'capiTrackInitiateCheckout', 'capiTrackPurchase', 'capiTrackSearch',
      // Advanced Settings
      'eventDeduplicationEnabled', 'eventMatchQualityTarget', 'gdprCompliant', 'hashUserData',
      'pixelStatus', 'capiStatus'
    ];

    const updateData = {};
    console.log('🔍 [STOREFRONT-SETTINGS] Processing fields. Total allowed fields:', allowedFields.length);
    console.log('🔍 [STOREFRONT-SETTINGS] Settings data keys:', Object.keys(settingsData));

    for (const field of allowedFields) {
      if (settingsData[field] !== undefined) {
        console.log(`🔍 [STOREFRONT-SETTINGS] Processing field: ${field}, type: ${typeof settingsData[field]}, value:`, settingsData[field]);
        // معالجة أنواع البيانات المختلفة
        // IMPORTANT: Check specific fields first before generic patterns

        // String fields (must be checked BEFORE Boolean patterns to avoid conversion)
        // List of ALL String fields in StorefrontSettings
        // NOTE: productPageOrder is handled separately in Text/JSON fields section
        const stringFields = [
          'imageZoomType', 'navigationType', 'soldNumberType', 'soldNumberText',
          'variantColorStyle', 'variantColorSize', 'variantSizeStyle',
          'stockProgressType', 'stockProgressLowColor', 'stockProgressMediumColor', 'stockProgressHighColor',
          'badgeLayout', 'badgeCustom1Text', 'badgeCustom2Text',
          'reasonsToPurchaseType', 'reasonsToPurchaseStyle',
          'onlineVisitorsType', 'onlineVisitorsText',
          'estimatedDeliveryDefaultText',
          'fomoType', 'fomoTrigger', 'fomoMessage',
          'defaultLanguage', 'pixelStatus', 'capiStatus',
          // Product Image Gallery String Fields
          'galleryLayout', 'galleryStyle', 'thumbnailSize', 'mainImageAspectRatio',
          'sliderTransitionEffect', 'zoomStyle', 'zoomLensShape', 'zoomWindowPosition',
          'lightboxBackgroundColor', 'videoSources', 'videoPlayMode', 'videoPosition',
          'variationImagesBehavior', 'variationImagesAnimation',
          'mobileGalleryLayout', 'imageHoverEffect', 'imageLoadingEffect', 'imagePlaceholder'
        ];

        if (stringFields.includes(field)) {
          console.log(`🔍 [STOREFRONT-SETTINGS] Processing STRING field: ${field}, type: ${typeof settingsData[field]}, value:`, settingsData[field]);
          // Handle String fields - convert to string or null
          if (settingsData[field] === null || settingsData[field] === undefined || settingsData[field] === '') {
            // Set defaults for required fields
            if (field === 'fomoMessage' || field === 'badgeCustom1Text' || field === 'badgeCustom2Text') {
              updateData[field] = null;
            } else if (field === 'estimatedDeliveryDefaultText') {
              updateData[field] = 'التوصيل خلال {time}';
            } else if (field === 'fomoType') {
              updateData[field] = 'soldCount';
            } else if (field === 'fomoTrigger') {
              updateData[field] = 'time';
            } else if (field === 'imageZoomType') {
              updateData[field] = 'hover';
            } else if (field === 'navigationType') {
              updateData[field] = 'sameCategory';
            } else if (field === 'soldNumberType') {
              updateData[field] = 'real';
            } else if (field === 'soldNumberText') {
              updateData[field] = 'تم بيع {count} قطعة';
            } else if (field === 'variantColorStyle') {
              updateData[field] = 'buttons';
            } else if (field === 'variantColorSize') {
              updateData[field] = 'medium';
            } else if (field === 'variantSizeStyle') {
              updateData[field] = 'buttons';
            } else if (field === 'stockProgressType') {
              updateData[field] = 'percentage';
            } else if (field === 'stockProgressLowColor') {
              updateData[field] = '#ef4444';
            } else if (field === 'stockProgressMediumColor') {
              updateData[field] = '#f59e0b';
            } else if (field === 'stockProgressHighColor') {
              updateData[field] = '#10b981';
            } else if (field === 'badgeLayout') {
              updateData[field] = 'horizontal';
            } else if (field === 'reasonsToPurchaseType') {
              updateData[field] = 'global';
            } else if (field === 'reasonsToPurchaseStyle') {
              updateData[field] = 'list';
            } else if (field === 'onlineVisitorsType') {
              updateData[field] = 'fake';
            } else if (field === 'onlineVisitorsText') {
              updateData[field] = '{count} شخص يشاهدون هذا المنتج الآن';
            } else if (field === 'defaultLanguage') {
              updateData[field] = 'ar';
            } else if (field === 'pixelStatus' || field === 'capiStatus') {
              updateData[field] = 'not_configured';
            } else {
              updateData[field] = null;
            }
          } else {
            // Ensure it's a string, not boolean
            const value = settingsData[field];
            if (typeof value === 'boolean') {
              console.error(`❌ [STOREFRONT-SETTINGS] ${field} is Boolean but should be String! Converting...`);
              // Convert boolean to default string based on field
              if (field === 'fomoType') {
                updateData[field] = 'soldCount';
              } else if (field === 'fomoTrigger') {
                updateData[field] = 'time';
              } else if (field === 'estimatedDeliveryDefaultText') {
                updateData[field] = 'التوصيل خلال {time}';
              } else if (field === 'imageZoomType') {
                updateData[field] = 'hover';
              } else if (field === 'navigationType') {
                updateData[field] = 'sameCategory';
              } else if (field === 'soldNumberType') {
                updateData[field] = 'real';
              } else if (field === 'soldNumberText') {
                updateData[field] = 'تم بيع {count} قطعة';
              } else if (field === 'variantColorStyle') {
                updateData[field] = 'buttons';
              } else if (field === 'variantColorSize') {
                updateData[field] = 'medium';
              } else if (field === 'variantSizeStyle') {
                updateData[field] = 'buttons';
              } else if (field === 'stockProgressType') {
                updateData[field] = 'percentage';
              } else if (field === 'stockProgressLowColor') {
                updateData[field] = '#ef4444';
              } else if (field === 'stockProgressMediumColor') {
                updateData[field] = '#f59e0b';
              } else if (field === 'stockProgressHighColor') {
                updateData[field] = '#10b981';
              } else if (field === 'badgeLayout') {
                updateData[field] = 'horizontal';
              } else if (field === 'reasonsToPurchaseType') {
                updateData[field] = 'global';
              } else if (field === 'reasonsToPurchaseStyle') {
                updateData[field] = 'list';
              } else if (field === 'onlineVisitorsType') {
                updateData[field] = 'fake';
              } else if (field === 'onlineVisitorsText') {
                updateData[field] = '{count} شخص يشاهدون هذا المنتج الآن';
              } else if (field === 'defaultLanguage') {
                updateData[field] = 'ar';
              } else {
                updateData[field] = null;
              }
            } else {
              updateData[field] = String(value);
            }
          }
          continue; // Skip to next field
        }

        // Boolean filter fields (must be checked first to avoid being caught by generic patterns)
        if (field === 'filterByPrice' || field === 'filterByRating' || field === 'filterByBrand' || field === 'filterByAttributes') {
          updateData[field] = Boolean(settingsData[field]);
          continue; // Skip to next field
        }

        // Product Page Layout fields - all Boolean except productPageOrder (handled above)
        if (field.startsWith('productPageShow') || field === 'productPageLayoutEnabled') {
          updateData[field] = Boolean(settingsData[field]);
          continue; // Skip to next field
        }

        // Numeric fields (Integer)
        const intFields = [
          'minRatingToDisplay', 'fomoDelay',
          // Product Image Gallery Int Fields
          'thumbnailsPerRow', 'thumbnailSpacing', 'thumbnailBorderRadius',
          'sliderAutoplaySpeed', 'sliderTransitionSpeed',
          'zoomLensSize', 'zoomWindowSize',
          'view360RotateSpeed', 'imageBorderRadius'
        ];
        if (intFields.includes(field) ||
          field.includes('Count') || field.includes('Days') || field.includes('Items') ||
          field.includes('Products') || field.includes('Threshold') || field.includes('Interval')) {
          updateData[field] = parseInt(settingsData[field]) || 0;
          continue; // Skip to next field
        }

        // Float fields
        if (field === 'zoomLevel') {
          updateData[field] = parseFloat(settingsData[field]) || 2.5;
          continue; // Skip to next field
        }

        // Boolean fields (generic pattern) - BUT exclude String fields
        // estimatedDeliveryShowOnProduct is Boolean, so it's OK
        // NOTE: productPageOrder and reasonsToPurchaseList are handled separately in Text/JSON fields section
        const stringFieldsList = [
          'imageZoomType', 'navigationType', 'soldNumberType', 'soldNumberText',
          'variantColorStyle', 'variantColorSize', 'variantSizeStyle',
          'stockProgressType', 'stockProgressLowColor', 'stockProgressMediumColor', 'stockProgressHighColor',
          'badgeLayout', 'badgeCustom1Text', 'badgeCustom2Text',
          'reasonsToPurchaseType', 'reasonsToPurchaseStyle',
          'onlineVisitorsType', 'onlineVisitorsText',
          'estimatedDeliveryDefaultText',
          'fomoType', 'fomoTrigger', 'fomoMessage',
          'defaultLanguage', 'pixelStatus', 'capiStatus',
          // Product Image Gallery String Fields
          'galleryLayout', 'galleryStyle', 'thumbnailSize', 'mainImageAspectRatio',
          'sliderTransitionEffect', 'zoomStyle', 'zoomLensShape', 'zoomWindowPosition',
          'lightboxBackgroundColor', 'videoSources', 'videoPlayMode', 'videoPosition',
          'variationImagesBehavior', 'variationImagesAnimation',
          'mobileGalleryLayout', 'imageHoverEffect', 'imageLoadingEffect', 'imagePlaceholder'
        ];

        // Product Image Gallery Boolean fields
        const imageGalleryBooleanFields = [
          'sliderEnabled', 'sliderAutoplay', 'sliderShowArrows', 'sliderShowDots', 'sliderInfiniteLoop',
          'lightboxEnabled', 'lightboxShowThumbnails', 'lightboxShowArrows', 'lightboxShowCounter',
          'lightboxZoomEnabled', 'lightboxKeyboardNav', 'lightboxCloseOnOverlay',
          'videoMuted', 'videoThumbnailIcon',
          'variationImagesEnabled',
          'mobileSwipeEnabled', 'mobilePinchZoom', 'mobileFullscreenOnTap', 'mobileShowThumbnails',
          'view360Enabled', 'view360AutoRotate', 'view360ShowControls',
          'imageShadow', 'mouseWheelZoom'
        ];

        if (imageGalleryBooleanFields.includes(field)) {
          // Convert to boolean - handle 0/1 and true/false
          const value = settingsData[field];
          const boolValue = value === 1 || value === '1' || value === true || value === 'true';
          console.log(`🔍 [STOREFRONT-SETTINGS] ImageGallery Boolean field: ${field}, raw=${value} (${typeof value}), converted=${boolValue}`);
          updateData[field] = boolValue;
          continue; // Skip to next field
        }

        if ((field.includes('Enabled') || field.includes('Show') || field.includes('Require') ||
          field.includes('Moderation') || field.includes('Autoplay') || field.includes('Controls') ||
          field.startsWith('badge') || field.startsWith('tab') || field.startsWith('share') ||
          field.startsWith('seo') || field === 'multiLanguageEnabled') &&
          // Exclude ALL String fields
          !stringFieldsList.includes(field)) {
          updateData[field] = Boolean(settingsData[field]);
          continue; // Skip to next field
        }

        // JSON/Array fields
        if (field === 'supportedLanguages') {
          if (Array.isArray(settingsData[field])) {
            updateData[field] = settingsData[field];
          } else if (typeof settingsData[field] === 'string') {
            try {
              updateData[field] = JSON.parse(settingsData[field]);
            } catch {
              updateData[field] = ['ar']; // Default if parsing fails
            }
          } else {
            updateData[field] = ['ar']; // Default if not provided
          }
          continue; // Skip to next field
        }

        // Text/JSON fields (stored as TEXT in DB) - MUST be checked BEFORE generic patterns
        if (field === 'productPageOrder' || field === 'reasonsToPurchaseList') {
          console.log(`🔍 [STOREFRONT-SETTINGS] Processing TEXT/JSON field: ${field}, type: ${typeof settingsData[field]}, value:`, settingsData[field]);
          if (typeof settingsData[field] === 'string') {
            // Already a string, keep as is (could be JSON string or plain text)
            updateData[field] = settingsData[field];
          } else if (Array.isArray(settingsData[field])) {
            // Convert array to JSON string
            updateData[field] = JSON.stringify(settingsData[field]);
          } else if (settingsData[field] === null || settingsData[field] === undefined) {
            updateData[field] = null;
          } else {
            // Try to stringify if it's an object
            try {
              updateData[field] = JSON.stringify(settingsData[field]);
            } catch (e) {
              console.error(`❌ [STOREFRONT-SETTINGS] Error stringifying ${field}:`, e);
              updateData[field] = null;
            }
          }
          console.log(`✅ [STOREFRONT-SETTINGS] ${field} processed, final value:`, updateData[field]);
          continue; // Skip to next field
        }

        // Default: keep as is
        updateData[field] = settingsData[field];
      }
    }

    // Ensure supportedLanguages is always present in updateData (for update operation)
    if (!updateData.supportedLanguages) {
      updateData.supportedLanguages = ["ar"];
    }

    // تحديث pixelStatus تلقائياً بناءً على Pixel ID
    if (updateData.facebookPixelId !== undefined) {
      if (updateData.facebookPixelId && /^\d{16}$/.test(updateData.facebookPixelId)) {
        // Pixel ID صحيح - تحديث الحالة إلى active
        updateData.pixelStatus = 'active';
        console.log('✅ [STOREFRONT-SETTINGS] Pixel ID valid, setting status to active');
      } else if (!updateData.facebookPixelId || updateData.facebookPixelId === '') {
        // Pixel ID محذوف - تحديث الحالة إلى not_configured
        updateData.pixelStatus = 'not_configured';
        console.log('ℹ️ [STOREFRONT-SETTINGS] Pixel ID removed, setting status to not_configured');
      } else {
        // Pixel ID غير صحيح - تحديث الحالة إلى error
        updateData.pixelStatus = 'error';
        console.log('❌ [STOREFRONT-SETTINGS] Pixel ID invalid, setting status to error');
      }
    }

    // إذا تم تعطيل Pixel، تحديث الحالة إلى not_configured
    if (updateData.facebookPixelEnabled === false) {
      updateData.pixelStatus = 'not_configured';
      console.log('ℹ️ [STOREFRONT-SETTINGS] Pixel disabled, setting status to not_configured');
    }

    // تحديث أو إنشاء الإعدادات
    // Note: createData will be built after cleanUpdateData is ready

    // Debug: Log updateData for String fields and check for type mismatches
    // NOTE: productPageOrder and reasonsToPurchaseList are TEXT fields, not String fields
    const stringFieldsList = [
      'imageZoomType', 'navigationType', 'soldNumberType', 'soldNumberText',
      'variantColorStyle', 'variantColorSize', 'variantSizeStyle',
      'stockProgressType', 'stockProgressLowColor', 'stockProgressMediumColor', 'stockProgressHighColor',
      'badgeLayout', 'badgeCustom1Text', 'badgeCustom2Text',
      'reasonsToPurchaseType', 'reasonsToPurchaseStyle',
      'onlineVisitorsType', 'onlineVisitorsText',
      'estimatedDeliveryDefaultText',
      'fomoType', 'fomoTrigger', 'fomoMessage',
      'defaultLanguage', 'pixelStatus', 'capiStatus'
    ];
    const debugData = {};
    const typeErrors = [];

    stringFieldsList.forEach(field => {
      if (updateData[field] !== undefined) {
        const value = updateData[field];
        const type = typeof value;
        debugData[field] = { value, type };

        // Check if String field has wrong type
        if (type === 'boolean') {
          typeErrors.push(`${field} is Boolean but should be String!`);
        }
      }
    });

    if (Object.keys(debugData).length > 0) {
      console.log('🔍 [STOREFRONT-SETTINGS] String fields in updateData:', JSON.stringify(debugData, null, 2));
    }

    if (typeErrors.length > 0) {
      console.error('❌ [STOREFRONT-SETTINGS] Type errors found:', typeErrors);
      // Fix the errors - use the same logic as in the main loop
      typeErrors.forEach(error => {
        const field = error.split(' ')[0];
        // Apply default values based on field name
        if (field === 'estimatedDeliveryDefaultText') {
          updateData[field] = 'التوصيل خلال {time}';
        } else if (field === 'fomoType') {
          updateData[field] = 'soldCount';
        } else if (field === 'fomoTrigger') {
          updateData[field] = 'time';
        } else if (field === 'fomoMessage') {
          updateData[field] = null;
        } else if (field === 'imageZoomType') {
          updateData[field] = 'hover';
        } else if (field === 'navigationType') {
          updateData[field] = 'sameCategory';
        } else if (field === 'soldNumberType') {
          updateData[field] = 'real';
        } else if (field === 'soldNumberText') {
          updateData[field] = 'تم بيع {count} قطعة';
        } else if (field === 'variantColorStyle') {
          updateData[field] = 'buttons';
        } else if (field === 'variantColorSize') {
          updateData[field] = 'medium';
        } else if (field === 'variantSizeStyle') {
          updateData[field] = 'buttons';
        } else if (field === 'stockProgressType') {
          updateData[field] = 'percentage';
        } else if (field === 'stockProgressLowColor') {
          updateData[field] = '#ef4444';
        } else if (field === 'stockProgressMediumColor') {
          updateData[field] = '#f59e0b';
        } else if (field === 'stockProgressHighColor') {
          updateData[field] = '#10b981';
        } else if (field === 'badgeLayout') {
          updateData[field] = 'horizontal';
        } else if (field === 'reasonsToPurchaseType') {
          updateData[field] = 'global';
        } else if (field === 'reasonsToPurchaseStyle') {
          updateData[field] = 'list';
        } else if (field === 'onlineVisitorsType') {
          updateData[field] = 'fake';
        } else if (field === 'onlineVisitorsText') {
          updateData[field] = '{count} شخص يشاهدون هذا المنتج الآن';
        } else if (field === 'defaultLanguage') {
          updateData[field] = 'ar';
        } else {
          updateData[field] = null;
        }
        console.log(`✅ [STOREFRONT-SETTINGS] Fixed ${field}`);
      });
    }

    // Clean updateData: remove undefined values and fix type mismatches
    const cleanUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined) continue; // Skip undefined

      // Final type check and fix for String fields
      if (stringFieldsList.includes(key)) {
        if (typeof value === 'boolean') {
          console.error(`❌ [STOREFRONT-SETTINGS] CRITICAL: ${key} is Boolean, fixing...`);
          // Fix based on field
          if (key === 'estimatedDeliveryDefaultText') {
            cleanUpdateData[key] = 'التوصيل خلال {time}';
          } else if (key === 'fomoType') {
            cleanUpdateData[key] = 'soldCount';
          } else if (key === 'fomoTrigger') {
            cleanUpdateData[key] = 'time';
          } else if (key === 'fomoMessage') {
            cleanUpdateData[key] = null;
          }
        } else if (typeof value === 'string' || value === null) {
          cleanUpdateData[key] = value;
        } else {
          console.warn(`⚠️ [STOREFRONT-SETTINGS] ${key} has unexpected type: ${typeof value}, skipping`);
        }
      } else {
        // Non-String fields - check for Boolean fields that might have Int values
        const imageGalleryBooleanFields = [
          'sliderEnabled', 'sliderAutoplay', 'sliderShowArrows', 'sliderShowDots', 'sliderInfiniteLoop',
          'lightboxEnabled', 'lightboxShowThumbnails', 'lightboxShowArrows', 'lightboxShowCounter',
          'lightboxZoomEnabled', 'lightboxKeyboardNav', 'lightboxCloseOnOverlay',
          'videoMuted', 'videoThumbnailIcon',
          'variationImagesEnabled',
          'mobileSwipeEnabled', 'mobilePinchZoom', 'mobileFullscreenOnTap', 'mobileShowThumbnails',
          'view360Enabled', 'view360AutoRotate', 'view360ShowControls',
          'imageShadow', 'mouseWheelZoom',
          'imageZoomEnabled', 'productVideosEnabled', 'videoAutoplay', 'videoShowControls'
        ];

        if (imageGalleryBooleanFields.includes(key)) {
          // Ensure it's a proper boolean
          if (typeof value === 'number') {
            console.log(`🔧 [STOREFRONT-SETTINGS] Converting ${key} from number ${value} to boolean ${value === 1}`);
            cleanUpdateData[key] = value === 1;
          } else {
            cleanUpdateData[key] = Boolean(value);
          }
        } else {
          cleanUpdateData[key] = value;
        }
      }
    }

    console.log('🔄 [STOREFRONT-SETTINGS] Starting upsert with', Object.keys(cleanUpdateData).length, 'fields');

    // Final validation log
    stringFieldsList.forEach(field => {
      if (cleanUpdateData[field] !== undefined) {
        console.log(`✅ [STOREFRONT-SETTINGS] ${field}: type=${typeof cleanUpdateData[field]}, value=${cleanUpdateData[field]}`);
      }
    });

    // Final check: Log ALL String fields in cleanUpdateData to find any Boolean values
    console.log('🔍 [STOREFRONT-SETTINGS] === FINAL CHECK: All String fields ===');
    const allStringFields = stringFieldsList;
    allStringFields.forEach(field => {
      if (cleanUpdateData[field] !== undefined) {
        const type = typeof cleanUpdateData[field];
        const value = cleanUpdateData[field];
        if (type === 'boolean') {
          console.error(`❌❌❌ [STOREFRONT-SETTINGS] CRITICAL ERROR: ${field} is still Boolean! Value: ${value}`);
        } else {
          console.log(`✅ [STOREFRONT-SETTINGS] ${field}: ${type} = ${value}`);
        }
      }
    });

    // Build createData with final validation
    const createData = {
      companyId,
      ...cleanUpdateData,
      supportedLanguages: cleanUpdateData.supportedLanguages || ["ar"]
    };

    // Fix ALL Boolean fields in createData that might have Int values
    const allBooleanFields = [
      'sliderEnabled', 'sliderAutoplay', 'sliderShowArrows', 'sliderShowDots', 'sliderInfiniteLoop',
      'lightboxEnabled', 'lightboxShowThumbnails', 'lightboxShowArrows', 'lightboxShowCounter',
      'lightboxZoomEnabled', 'lightboxKeyboardNav', 'lightboxCloseOnOverlay',
      'videoMuted', 'videoThumbnailIcon',
      'variationImagesEnabled',
      'mobileSwipeEnabled', 'mobilePinchZoom', 'mobileFullscreenOnTap', 'mobileShowThumbnails',
      'view360Enabled', 'view360AutoRotate', 'view360ShowControls',
      'imageShadow', 'mouseWheelZoom',
      'imageZoomEnabled', 'productVideosEnabled', 'videoAutoplay', 'videoShowControls'
    ];

    allBooleanFields.forEach(field => {
      if (createData[field] !== undefined && typeof createData[field] === 'number') {
        console.log(`🔧 [STOREFRONT-SETTINGS] Fixing createData.${field} from number ${createData[field]} to boolean`);
        createData[field] = createData[field] === 1;
      }
    });

    console.log('🔍 [STOREFRONT-SETTINGS] === Checking createData String fields ===');
    allStringFields.forEach(field => {
      if (createData[field] !== undefined) {
        const type = typeof createData[field];
        const value = createData[field];
        if (type === 'boolean') {
          console.error(`❌❌❌ [STOREFRONT-SETTINGS] CRITICAL ERROR in createData: ${field} is Boolean! Value: ${value}`);
          // Fix it immediately
          if (field === 'estimatedDeliveryDefaultText') {
            createData[field] = 'التوصيل خلال {time}';
          } else if (field === 'fomoType') {
            createData[field] = 'soldCount';
          } else if (field === 'fomoTrigger') {
            createData[field] = 'time';
          } else if (field === 'fomoMessage') {
            createData[field] = null;
          }
          console.log(`✅ [STOREFRONT-SETTINGS] Fixed ${field} in createData`);
        }
      }
    });

    console.log('🔄 [STOREFRONT-SETTINGS] Attempting upsert with cleanUpdateData keys:', Object.keys(cleanUpdateData));
    console.log('🔄 [STOREFRONT-SETTINGS] cleanUpdateData sample (first 5):', Object.fromEntries(Object.entries(cleanUpdateData).slice(0, 5)));

    // Debug: Check ALL fields for type mismatches
    console.log('🔍🔍🔍 [STOREFRONT-SETTINGS] === FINAL TYPE CHECK BEFORE UPSERT ===');
    Object.entries(cleanUpdateData).forEach(([field, val]) => {
      const valType = typeof val;
      // Check Boolean fields
      if ((field.includes('Enabled') || field.includes('Show') || field.includes('Autoplay') ||
        field.includes('Require') || field.includes('Moderation') || field.includes('Controls') ||
        field.startsWith('badge') || field.startsWith('tab') || field.startsWith('share') ||
        field.startsWith('seo') || field.includes('Zoom') || field.includes('Loop') ||
        field.includes('Muted') || field.includes('Icon') || field.includes('Shadow') ||
        field.includes('Wheel') || field.includes('Swipe') || field.includes('Pinch') ||
        field.includes('Fullscreen') || field.includes('Thumbnails') || field.includes('Arrows') ||
        field.includes('Counter') || field.includes('Nav') || field.includes('Overlay') ||
        field.includes('Rotate') || field.includes('Keyboard')) && valType === 'number') {
        console.error(`❌❌❌ [STOREFRONT-SETTINGS] BOOLEAN FIELD HAS INT: ${field} = ${val} (type: ${valType})`);
      }
    });

    // FINAL FIX: Force convert ALL Boolean fields to proper boolean type
    const forceBooleanFields = [
      'quickViewEnabled', 'quickViewShowAddToCart', 'quickViewShowWishlist',
      'comparisonEnabled', 'comparisonShowPrice', 'comparisonShowSpecs',
      'wishlistEnabled', 'wishlistRequireLogin',
      'advancedFiltersEnabled', 'filterByPrice', 'filterByRating', 'filterByBrand', 'filterByAttributes',
      'reviewsEnabled', 'reviewsRequirePurchase', 'reviewsModerationEnabled', 'reviewsShowRating',
      'countdownEnabled', 'countdownShowOnProduct', 'countdownShowOnListing',
      'backInStockEnabled', 'backInStockNotifyEmail', 'backInStockNotifySMS',
      'recentlyViewedEnabled',
      'sliderEnabled', 'sliderAutoplay', 'sliderShowArrows', 'sliderShowDots', 'sliderInfiniteLoop',
      'imageZoomEnabled', 'mouseWheelZoom',
      'lightboxEnabled', 'lightboxShowThumbnails', 'lightboxShowArrows', 'lightboxShowCounter',
      'lightboxZoomEnabled', 'lightboxKeyboardNav', 'lightboxCloseOnOverlay',
      'productVideosEnabled', 'videoAutoplay', 'videoShowControls', 'videoMuted', 'videoThumbnailIcon',
      'variationImagesEnabled',
      'mobileSwipeEnabled', 'mobilePinchZoom', 'mobileFullscreenOnTap', 'mobileShowThumbnails',
      'view360Enabled', 'view360AutoRotate', 'view360ShowControls',
      'imageShadow',
      'sizeGuideEnabled', 'sizeGuideShowOnProduct',
      'socialSharingEnabled', 'shareFacebook', 'shareTwitter', 'shareWhatsApp', 'shareTelegram',
      'badgesEnabled', 'badgeNew', 'badgeBestSeller', 'badgeOnSale', 'badgeOutOfStock',
      'tabsEnabled', 'tabDescription', 'tabSpecifications', 'tabReviews', 'tabShipping',
      'stickyAddToCartEnabled', 'stickyShowOnMobile', 'stickyShowOnDesktop', 'stickyShowBuyNow',
      'stickyShowAddToCartButton', 'stickyShowQuantity', 'stickyShowProductImage', 'stickyShowProductName',
      'stickyTrackAnalytics', 'stickyAutoScrollToCheckout',
      'navigationEnabled', 'showNavigationButtons', 'keyboardShortcuts',
      'soldNumberEnabled', 'variantColorShowName', 'variantSizeShowGuide', 'variantSizeShowStock',
      'stockProgressEnabled',
      'securityBadgesEnabled', 'badgeSecurePayment', 'badgeFreeShipping', 'badgeQualityGuarantee',
      'badgeCashOnDelivery', 'badgeBuyerProtection', 'badgeHighRating', 'badgeCustom1', 'badgeCustom2',
      'reasonsToPurchaseEnabled', 'onlineVisitorsEnabled',
      'estimatedDeliveryEnabled', 'estimatedDeliveryShowOnProduct',
      'fomoEnabled', 'fomoShowOncePerSession',
      'productPageLayoutEnabled', 'productPageShowTitle', 'productPageShowCategory',
      'productPageShowSocialSharing', 'productPageShowBadges', 'productPageShowPrice',
      'productPageShowCountdown', 'productPageShowStockStatus', 'productPageShowStockProgress',
      'productPageShowBackInStock', 'productPageShowSecurityBadges', 'productPageShowSoldNumber',
      'productPageShowOnlineVisitors', 'productPageShowEstimatedDelivery', 'productPageShowFreeShipping',
      'productPageShowPreOrder', 'productPageShowVariants', 'productPageShowSizeGuide',
      'productPageShowQuantity', 'productPageShowVolumeDiscounts', 'productPageShowReasonsToPurchase',
      'productPageShowActions', 'productPageShowTabs', 'productPageShowDescription',
      'productPageShowSKU', 'productPageShowCheckoutForm',
      'seoEnabled', 'seoMetaDescription', 'seoStructuredData', 'seoSitemap', 'seoOpenGraph',
      'multiLanguageEnabled',
      'facebookPixelEnabled', 'pixelTrackPageView', 'pixelTrackViewContent', 'pixelTrackAddToCart',
      'pixelTrackInitiateCheckout', 'pixelTrackPurchase', 'pixelTrackSearch', 'pixelTrackAddToWishlist',
      'facebookConvApiEnabled', 'capiTrackPageView', 'capiTrackViewContent', 'capiTrackAddToCart',
      'capiTrackInitiateCheckout', 'capiTrackPurchase', 'capiTrackSearch',
      'eventDeduplicationEnabled', 'gdprCompliant', 'hashUserData'
    ];

    forceBooleanFields.forEach(field => {
      if (cleanUpdateData[field] !== undefined) {
        const val = cleanUpdateData[field];
        if (typeof val !== 'boolean') {
          cleanUpdateData[field] = val === 1 || val === '1' || val === true || val === 'true';
        }
      }
      if (createData[field] !== undefined) {
        const val = createData[field];
        if (typeof val !== 'boolean') {
          createData[field] = val === 1 || val === '1' || val === true || val === 'true';
        }
      }
    });

    console.log('🔍 [STOREFRONT-SETTINGS] Final cleanUpdateData Boolean check:');
    forceBooleanFields.forEach(field => {
      if (cleanUpdateData[field] !== undefined && typeof cleanUpdateData[field] !== 'boolean') {
        console.error(`❌ STILL NOT BOOLEAN: ${field} = ${cleanUpdateData[field]} (${typeof cleanUpdateData[field]})`);
      }
    });

    try {
      const settings = await prisma.storefrontSettings.upsert({
        where: { companyId },
        update: cleanUpdateData,
        create: createData
      });

      console.log('✅ [STOREFRONT-SETTINGS] Settings updated successfully:', settings.id);

      return res.status(200).json({
        success: true,
        message: 'تم تحديث الإعدادات بنجاح',
        data: settings
      });
    } catch (prismaError) {
      console.error('❌ [STOREFRONT-SETTINGS] Prisma error:', prismaError);
      console.error('❌ [STOREFRONT-SETTINGS] Error code:', prismaError.code);
      console.error('❌ [STOREFRONT-SETTINGS] Error meta:', prismaError.meta);
      console.error('❌ [STOREFRONT-SETTINGS] Error message:', prismaError.message);

      // Check if it's a field not found error
      if (prismaError.code === 'P2009' || prismaError.message?.includes('Unknown field')) {
        return res.status(500).json({
          success: false,
          message: 'بعض الحقول غير موجودة في قاعدة البيانات. يرجى تشغيل migration.',
          error: prismaError.message,
          code: prismaError.code,
          meta: prismaError.meta
        });
      }

      throw prismaError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Error updating settings:', error);
    console.error('❌ [STOREFRONT-SETTINGS] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الإعدادات',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * جلب إعدادات واجهة المتجر للواجهة العامة (بدون مصادقة)
 * GET /api/v1/public/storefront-settings/:companyId
 */
exports.getPublicStorefrontSettings = async (req, res) => {
  try {
    // Use company from middleware (set by getCompanyFromSubdomain) or fallback to params
    let companyId = req.company?.id || req.params?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [STOREFRONT-SETTINGS-PUBLIC] Company from middleware:', req.company?.id);
    console.log('🔍 [STOREFRONT-SETTINGS-PUBLIC] Company from params:', req.params?.companyId);
    console.log('🔍 [STOREFRONT-SETTINGS-PUBLIC] Getting settings for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Check if companyId is a slug (subdomain) instead of actual ID
    // Prisma IDs usually start with 'c' followed by alphanumeric characters
    // Slugs are usually lowercase letters, numbers, and hyphens
    const isSlug = !/^c[a-z0-9]{20,}$/.test(companyId);

    if (isSlug) {
      console.log('🔍 [STOREFRONT-SETTINGS-PUBLIC] companyId looks like a slug, finding company by slug...');

      // Find company by slug
      const company = await prisma.company.findFirst({
        where: {
          slug: companyId,
          isActive: true
        },
        select: {
          id: true,
          slug: true
        }
      });

      if (company) {
        console.log('✅ [STOREFRONT-SETTINGS-PUBLIC] Company found by slug:', {
          slug: company.slug,
          companyId: company.id
        });
        companyId = company.id; // Use the real companyId
      } else {
        console.warn('⚠️ [STOREFRONT-SETTINGS-PUBLIC] Company not found by slug:', companyId);
        return res.status(404).json({
          success: false,
          message: 'الشركة غير موجودة'
        });
      }
    }

    // البحث عن الإعدادات
    let settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    // Debug logging
    console.log('📊 [STOREFRONT-SETTINGS-PUBLIC] Settings from DB:', {
      found: !!settings,
      companyId: companyId,
      facebookPixelEnabled: settings?.facebookPixelEnabled,
      facebookPixelId: settings?.facebookPixelId,
      pixelStatus: settings?.pixelStatus
    });

    // إذا لم توجد إعدادات، إرجاع القيم الافتراضية من Schema
    if (!settings) {
      // إنشاء إعدادات افتراضية مؤقتة (لا نحفظها في DB)
      // يجب أن تطابق القيم الافتراضية في Schema
      settings = {
        quickViewEnabled: true,
        quickViewShowAddToCart: true,
        quickViewShowWishlist: true,
        // Mobile Bottom Navbar Defaults
        mobileBottomNavbarEnabled: true,
        mobileBottomNavbarShowHome: true,
        mobileBottomNavbarShowShop: true,
        mobileBottomNavbarShowWishlist: true,
        mobileBottomNavbarShowAccount: true,
        mobileBottomNavbarShowCompare: true,
        mobileBottomNavbarShowSearch: false,
        mobileBottomNavbarShowCart: false,
        comparisonEnabled: true,
        maxComparisonProducts: 4,
        comparisonShowPrice: true,
        comparisonShowSpecs: true,
        wishlistEnabled: true,
        wishlistRequireLogin: false,
        wishlistMaxItems: 100,
        advancedFiltersEnabled: true,
        filterByPrice: true,
        filterByRating: true,
        filterByBrand: false,
        filterByAttributes: true,
        reviewsEnabled: true,
        reviewsRequirePurchase: false,
        reviewsModerationEnabled: true,
        reviewsShowRating: true,
        minRatingToDisplay: 1,
        countdownEnabled: true,
        countdownShowOnProduct: true,
        countdownShowOnListing: false,
        backInStockEnabled: true,
        backInStockNotifyEmail: true,
        backInStockNotifySMS: false,
        recentlyViewedEnabled: true,
        recentlyViewedCount: 8,
        recentlyViewedDays: 30,
        imageZoomEnabled: true,
        imageZoomType: 'hover',
        productVideosEnabled: true,
        videoAutoplay: false,
        videoShowControls: true,
        sizeGuideEnabled: true,
        sizeGuideShowOnProduct: true,
        socialSharingEnabled: true,
        shareFacebook: true,
        shareTwitter: true,
        shareWhatsApp: true,
        shareTelegram: true,
        badgesEnabled: true,
        badgeNew: true,
        badgeBestSeller: true,
        badgeOnSale: true,
        badgeOutOfStock: true,
        tabsEnabled: true,
        tabDescription: true,
        tabSpecifications: true,
        tabReviews: true,
        tabShipping: true,
        stickyAddToCartEnabled: true,
        stickyShowOnMobile: true,
        stickyShowOnDesktop: true,
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
        badgeCustom1Text: null,
        badgeCustom2: false,
        badgeCustom2Text: null,
        badgeLayout: 'horizontal',
        // Reasons to Purchase
        reasonsToPurchaseEnabled: false,
        reasonsToPurchaseType: 'global',
        reasonsToPurchaseList: null,
        reasonsToPurchaseMaxItems: 4,
        reasonsToPurchaseStyle: 'list',
        // Online Visitors Count
        onlineVisitorsEnabled: false,
        onlineVisitorsType: 'fake',
        onlineVisitorsMin: 5,
        onlineVisitorsMax: 50,
        onlineVisitorsUpdateInterval: 30,
        onlineVisitorsText: '{count} شخص يشاهدون هذا المنتج الآن',
        seoEnabled: true,
        seoMetaDescription: true,
        seoStructuredData: true,
        seoSitemap: true,
        seoOpenGraph: true,
        multiLanguageEnabled: false,
        defaultLanguage: 'ar',
        supportedLanguages: ['ar'],
        // Facebook Pixel Settings
        facebookPixelEnabled: false,
        facebookPixelId: null,
        pixelTrackPageView: true,
        pixelTrackViewContent: true,
        pixelTrackAddToCart: true,
        pixelTrackInitiateCheckout: true,
        pixelTrackPurchase: true,
        pixelTrackSearch: true,
        pixelTrackAddToWishlist: false,
        // Facebook Conversions API Settings
        facebookConvApiEnabled: false,
        facebookConvApiToken: null,
        facebookConvApiTestCode: null,
        capiTrackPageView: true,
        capiTrackViewContent: true,
        capiTrackAddToCart: true,
        capiTrackInitiateCheckout: true,
        capiTrackPurchase: true,
        capiTrackSearch: true,
        // Advanced Settings
        eventDeduplicationEnabled: true,
        eventMatchQualityTarget: 8,
        gdprCompliant: true,
        hashUserData: true,
        pixelStatus: 'not_configured',
        capiStatus: 'not_configured'
      };
    } else {
      // Ensure boolean values are properly serialized
      settings = {
        ...settings,
        // Facebook Pixel Settings
        facebookPixelEnabled: Boolean(settings.facebookPixelEnabled),
        // Mobile Bottom Navbar Serialization
        mobileBottomNavbarEnabled: Boolean(settings.mobileBottomNavbarEnabled ?? true),
        mobileBottomNavbarShowHome: Boolean(settings.mobileBottomNavbarShowHome ?? true),
        mobileBottomNavbarShowShop: Boolean(settings.mobileBottomNavbarShowShop ?? true),
        mobileBottomNavbarShowWishlist: Boolean(settings.mobileBottomNavbarShowWishlist ?? true),
        mobileBottomNavbarShowAccount: Boolean(settings.mobileBottomNavbarShowAccount ?? true),
        mobileBottomNavbarShowCompare: Boolean(settings.mobileBottomNavbarShowCompare ?? true),
        mobileBottomNavbarShowSearch: Boolean(settings.mobileBottomNavbarShowSearch ?? false),
        mobileBottomNavbarShowCart: Boolean(settings.mobileBottomNavbarShowCart ?? false),
        facebookPixelId: settings.facebookPixelId || null, // Ensure Pixel ID is returned
        pixelTrackPageView: Boolean(settings.pixelTrackPageView ?? true),
        pixelTrackViewContent: Boolean(settings.pixelTrackViewContent ?? true),
        pixelTrackAddToCart: Boolean(settings.pixelTrackAddToCart ?? true),
        pixelTrackInitiateCheckout: Boolean(settings.pixelTrackInitiateCheckout ?? true),
        pixelTrackPurchase: Boolean(settings.pixelTrackPurchase ?? true),
        pixelTrackSearch: Boolean(settings.pixelTrackSearch ?? true),
        pixelTrackAddToWishlist: Boolean(settings.pixelTrackAddToWishlist ?? false),
        // Facebook Conversions API Settings
        facebookConvApiEnabled: Boolean(settings.facebookConvApiEnabled ?? false),
        facebookConvApiToken: settings.facebookConvApiToken || null,
        facebookConvApiTestCode: settings.facebookConvApiTestCode || null,
        capiTrackPageView: Boolean(settings.capiTrackPageView ?? true),
        capiTrackViewContent: Boolean(settings.capiTrackViewContent ?? true),
        capiTrackAddToCart: Boolean(settings.capiTrackAddToCart ?? true),
        capiTrackInitiateCheckout: Boolean(settings.capiTrackInitiateCheckout ?? true),
        capiTrackPurchase: Boolean(settings.capiTrackPurchase ?? true),
        capiTrackSearch: Boolean(settings.capiTrackSearch ?? true),
        // Advanced Settings
        eventDeduplicationEnabled: Boolean(settings.eventDeduplicationEnabled ?? true),
        gdprCompliant: Boolean(settings.gdprCompliant ?? true),
        hashUserData: Boolean(settings.hashUserData ?? true),
        eventMatchQualityTarget: settings.eventMatchQualityTarget ? parseInt(settings.eventMatchQualityTarget) : 8,
        pixelStatus: settings.pixelStatus || 'not_configured',
        capiStatus: settings.capiStatus || 'not_configured',
        lastPixelTest: settings.lastPixelTest || null,
        lastCapiTest: settings.lastCapiTest || null
      };

      // Debug logging
      console.log('📊 [STOREFRONT-SETTINGS-PUBLIC] Returning settings with Pixel:', {
        facebookPixelEnabled: settings.facebookPixelEnabled,
        facebookPixelId: settings.facebookPixelId,
        pixelStatus: settings.pixelStatus
      });
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS-PUBLIC] Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message
    });
  }
};

/**
 * إعادة تعيين الإعدادات للقيم الافتراضية
 * POST /api/v1/storefront-settings/reset
 */
exports.resetStorefrontSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // حذف الإعدادات الحالية وإنشاء جديدة بالقيم الافتراضية
    await prisma.storefrontSettings.deleteMany({
      where: { companyId }
    });

    const settings = await prisma.storefrontSettings.create({
      data: {
        companyId,
        // Ensure supportedLanguages is provided (required Json field)
        supportedLanguages: ["ar"] // Default to Arabic
        // جميع القيم الافتراضية الأخرى موجودة في Schema
      }
    });

    console.log('✅ [STOREFRONT-SETTINGS] Settings reset to defaults:', settings.id);

    return res.status(200).json({
      success: true,
      message: 'تم إعادة تعيين الإعدادات للقيم الافتراضية',
      data: settings
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Error resetting settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إعادة تعيين الإعدادات',
      error: error.message
    });
  }
};

/**
 * اختبار اتصال Facebook Conversions API
 * POST /api/v1/storefront-settings/test-facebook-capi
 */
exports.testFacebookCapi = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🧪 [FACEBOOK-CAPI] Testing connection for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // جلب الإعدادات
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    if (!settings.facebookConvApiEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Facebook Conversions API غير مفعل'
      });
    }

    if (!settings.facebookPixelId || !settings.facebookConvApiToken) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال Pixel ID و Access Token'
      });
    }

    // استخدام Facebook Service
    const FacebookConversionsService = require('../services/facebookConversionsService');
    const fbService = new FacebookConversionsService(
      settings.facebookPixelId,
      settings.facebookConvApiToken,
      settings.facebookConvApiTestCode
    );

    // اختبار الاتصال
    const testResult = await fbService.testConnection();

    // تحديث حالة الاختبار
    await prisma.storefrontSettings.update({
      where: { companyId },
      data: {
        lastCapiTest: new Date(),
        capiStatus: testResult.success ? 'active' : 'error'
      }
    });

    console.log(testResult.success ? '✅' : '❌', '[FACEBOOK-CAPI] Test result:', testResult.message);

    return res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult
    });
  } catch (error) {
    console.error('❌ [FACEBOOK-CAPI] Error testing connection:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل اختبار الاتصال',
      error: error.message
    });
  }
};

/**
 * اختبار Facebook Pixel
 * POST /api/v1/storefront-settings/test-facebook-pixel
 */
exports.testFacebookPixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🧪 [FACEBOOK-PIXEL] Testing Pixel for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // جلب الإعدادات
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    if (!settings.facebookPixelEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Facebook Pixel غير مفعل'
      });
    }

    if (!settings.facebookPixelId) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال Pixel ID'
      });
    }

    // التحقق من صحة Pixel ID
    if (!/^\d{16}$/.test(settings.facebookPixelId)) {
      // تحديث الحالة إلى error
      await prisma.storefrontSettings.update({
        where: { companyId },
        data: {
          pixelStatus: 'error',
          lastPixelTest: new Date()
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Pixel ID غير صحيح - يجب أن يكون 16 رقم'
      });
    }

    // Pixel ID صحيح - تحديث الحالة إلى active
    await prisma.storefrontSettings.update({
      where: { companyId },
      data: {
        pixelStatus: 'active',
        lastPixelTest: new Date()
      }
    });

    console.log('✅ [FACEBOOK-PIXEL] Pixel test successful:', settings.facebookPixelId);

    return res.json({
      success: true,
      message: 'Pixel ID صحيح وتم تفعيله بنجاح',
      data: {
        pixelId: settings.facebookPixelId,
        status: 'active',
        testDate: new Date()
      }
    });
  } catch (error) {
    console.error('❌ [FACEBOOK-PIXEL] Error testing Pixel:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل اختبار Pixel',
      error: error.message
    });
  }
};

/**
 * التحقق من صحة Pixel ID
 * POST /api/v1/storefront-settings/validate-pixel-id
 */
exports.validatePixelId = async (req, res) => {
  try {
    const { pixelId } = req.body;

    if (!pixelId) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID مطلوب'
      });
    }

    // Pixel ID يجب أن يكون 16 رقم
    if (!/^\d{16}$/.test(pixelId)) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID يجب أن يكون 16 رقم'
      });
    }

    return res.json({
      success: true,
      message: 'Pixel ID صحيح',
      data: { pixelId, valid: true }
    });
  } catch (error) {
    console.error('❌ [PIXEL-VALIDATION] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// 🔧 DIAGNOSTICS & TROUBLESHOOTING
// ============================================

/**
 * تشخيص شامل لاتصال Facebook Pixel و CAPI
 * GET /api/v1/storefront-settings/pixel-diagnostics
 */
exports.getPixelDiagnostics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [PIXEL-DIAGNOSTICS] Running diagnostics for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId },
      include: {
        facebookPixels: true
      }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    const diagnostics = {
      timestamp: new Date(),
      overall: {
        status: 'unknown',
        score: 0,
        issues: [],
        recommendations: []
      },
      pixel: {
        configured: false,
        status: 'not_configured',
        pixelId: null,
        lastTest: null,
        issues: []
      },
      capi: {
        configured: false,
        status: 'not_configured',
        hasToken: false,
        tokenStatus: 'unknown',
        lastTest: null,
        issues: []
      },
      events: {
        pixelEvents: [],
        capiEvents: [],
        deduplicationEnabled: false
      },
      multiplePixels: {
        enabled: false,
        count: 0,
        pixels: []
      }
    };

    // تشخيص Pixel
    if (settings.facebookPixelEnabled && settings.facebookPixelId) {
      diagnostics.pixel.configured = true;
      diagnostics.pixel.pixelId = settings.facebookPixelId;
      diagnostics.pixel.status = settings.pixelStatus || 'not_configured';
      diagnostics.pixel.lastTest = settings.lastPixelTest;

      // فحص صحة Pixel ID
      if (!/^\d{16}$/.test(settings.facebookPixelId)) {
        diagnostics.pixel.issues.push({
          type: 'error',
          code: 'INVALID_PIXEL_ID',
          message: 'Pixel ID غير صحيح - يجب أن يكون 16 رقم'
        });
      }

      // فحص الأحداث المفعلة
      const pixelEvents = [];
      if (settings.pixelTrackPageView) pixelEvents.push('PageView');
      if (settings.pixelTrackViewContent) pixelEvents.push('ViewContent');
      if (settings.pixelTrackAddToCart) pixelEvents.push('AddToCart');
      if (settings.pixelTrackInitiateCheckout) pixelEvents.push('InitiateCheckout');
      if (settings.pixelTrackPurchase) pixelEvents.push('Purchase');
      if (settings.pixelTrackSearch) pixelEvents.push('Search');
      if (settings.pixelTrackAddToWishlist) pixelEvents.push('AddToWishlist');
      diagnostics.events.pixelEvents = pixelEvents;

      if (pixelEvents.length === 0) {
        diagnostics.pixel.issues.push({
          type: 'warning',
          code: 'NO_EVENTS_ENABLED',
          message: 'لم يتم تفعيل أي أحداث للتتبع'
        });
      }
    } else {
      diagnostics.pixel.issues.push({
        type: 'info',
        code: 'PIXEL_NOT_CONFIGURED',
        message: 'Facebook Pixel غير مُكوّن'
      });
    }

    // تشخيص CAPI
    if (settings.facebookConvApiEnabled) {
      diagnostics.capi.configured = true;
      diagnostics.capi.status = settings.capiStatus || 'not_configured';
      diagnostics.capi.hasToken = !!settings.facebookConvApiToken;
      diagnostics.capi.lastTest = settings.lastCapiTest;

      if (!settings.facebookConvApiToken) {
        diagnostics.capi.issues.push({
          type: 'error',
          code: 'MISSING_ACCESS_TOKEN',
          message: 'Access Token مفقود - مطلوب لعمل CAPI'
        });
      } else {
        // فحص صلاحية Token
        const tokenPrefix = settings.facebookConvApiToken.substring(0, 3);
        if (tokenPrefix !== 'EAA') {
          diagnostics.capi.issues.push({
            type: 'warning',
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Access Token قد يكون غير صحيح - يجب أن يبدأ بـ EAA'
          });
        }
        diagnostics.capi.tokenStatus = 'valid_format';
      }

      if (!settings.facebookPixelId) {
        diagnostics.capi.issues.push({
          type: 'error',
          code: 'MISSING_PIXEL_ID',
          message: 'Pixel ID مطلوب لعمل CAPI'
        });
      }

      // فحص الأحداث المفعلة
      const capiEvents = [];
      if (settings.capiTrackPageView) capiEvents.push('PageView');
      if (settings.capiTrackViewContent) capiEvents.push('ViewContent');
      if (settings.capiTrackAddToCart) capiEvents.push('AddToCart');
      if (settings.capiTrackInitiateCheckout) capiEvents.push('InitiateCheckout');
      if (settings.capiTrackPurchase) capiEvents.push('Purchase');
      if (settings.capiTrackSearch) capiEvents.push('Search');
      diagnostics.events.capiEvents = capiEvents;
    }

    // فحص Deduplication
    diagnostics.events.deduplicationEnabled = settings.eventDeduplicationEnabled;
    if (settings.facebookPixelEnabled && settings.facebookConvApiEnabled && !settings.eventDeduplicationEnabled) {
      diagnostics.overall.issues.push({
        type: 'warning',
        code: 'DEDUPLICATION_DISABLED',
        message: 'Deduplication غير مفعل - قد يؤدي لتكرار الأحداث'
      });
    }

    // Multiple Pixels
    if (settings.facebookPixels && settings.facebookPixels.length > 0) {
      diagnostics.multiplePixels.enabled = true;
      diagnostics.multiplePixels.count = settings.facebookPixels.length;
      diagnostics.multiplePixels.pixels = settings.facebookPixels.map(p => ({
        id: p.id,
        pixelId: p.pixelId,
        pixelName: p.pixelName,
        isActive: p.isActive,
        isPrimary: p.isPrimary,
        lastTestResult: p.lastTestResult,
        lastTestAt: p.lastTestAt,
        totalEventsSent: p.totalEventsSent,
        errorCount: p.errorCount,
        lastError: p.lastError,
        tokenStatus: p.tokenStatus,
        eventMatchQuality: p.eventMatchQuality
      }));
    }

    // حساب النتيجة الإجمالية
    let score = 0;
    if (diagnostics.pixel.configured && diagnostics.pixel.issues.filter(i => i.type === 'error').length === 0) score += 30;
    if (diagnostics.capi.configured && diagnostics.capi.issues.filter(i => i.type === 'error').length === 0) score += 40;
    if (diagnostics.events.deduplicationEnabled) score += 10;
    if (diagnostics.events.pixelEvents.length >= 4) score += 10;
    if (diagnostics.events.capiEvents.length >= 4) score += 10;

    diagnostics.overall.score = score;
    diagnostics.overall.status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

    // التوصيات
    if (!diagnostics.capi.configured) {
      diagnostics.overall.recommendations.push({
        priority: 'high',
        message: 'فعّل Conversions API للحصول على دقة تتبع أعلى (90%+)'
      });
    }
    if (!diagnostics.events.deduplicationEnabled && diagnostics.pixel.configured && diagnostics.capi.configured) {
      diagnostics.overall.recommendations.push({
        priority: 'medium',
        message: 'فعّل Deduplication لمنع تكرار الأحداث'
      });
    }
    if (diagnostics.events.pixelEvents.length < 4) {
      diagnostics.overall.recommendations.push({
        priority: 'medium',
        message: 'فعّل المزيد من الأحداث للحصول على بيانات أفضل'
      });
    }

    console.log('✅ [PIXEL-DIAGNOSTICS] Diagnostics complete. Score:', score);

    return res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    console.error('❌ [PIXEL-DIAGNOSTICS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل تشخيص الاتصال',
      error: error.message
    });
  }
};

/**
 * فحص صلاحيات Access Token
 * POST /api/v1/storefront-settings/check-token-permissions
 */
exports.checkTokenPermissions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔑 [TOKEN-CHECK] Checking token permissions for company:', companyId);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings?.facebookConvApiToken) {
      return res.status(400).json({
        success: false,
        message: 'Access Token غير موجود'
      });
    }

    const token = settings.facebookConvApiToken;
    const result = {
      valid: false,
      permissions: [],
      expiresAt: null,
      issues: []
    };

    try {
      // فحص Token عبر Facebook Graph API
      const fetch = require('node-fetch');
      const debugResponse = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
      );
      const debugData = await debugResponse.json();

      if (debugData.data) {
        result.valid = debugData.data.is_valid;
        result.permissions = debugData.data.scopes || [];
        result.expiresAt = debugData.data.expires_at ? new Date(debugData.data.expires_at * 1000) : null;
        result.appId = debugData.data.app_id;
        result.type = debugData.data.type;

        // فحص الصلاحيات المطلوبة
        const requiredPermissions = ['ads_management', 'ads_read'];
        const missingPermissions = requiredPermissions.filter(p => !result.permissions.includes(p));
        
        if (missingPermissions.length > 0) {
          result.issues.push({
            type: 'warning',
            code: 'MISSING_PERMISSIONS',
            message: `صلاحيات مفقودة: ${missingPermissions.join(', ')}`
          });
        }

        // فحص انتهاء الصلاحية
        if (result.expiresAt && result.expiresAt < new Date()) {
          result.issues.push({
            type: 'error',
            code: 'TOKEN_EXPIRED',
            message: 'Token منتهي الصلاحية'
          });
          result.valid = false;
        } else if (result.expiresAt) {
          const daysUntilExpiry = Math.ceil((result.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 7) {
            result.issues.push({
              type: 'warning',
              code: 'TOKEN_EXPIRING_SOON',
              message: `Token سينتهي خلال ${daysUntilExpiry} يوم`
            });
          }
        }
      } else if (debugData.error) {
        result.issues.push({
          type: 'error',
          code: 'TOKEN_INVALID',
          message: debugData.error.message || 'Token غير صالح'
        });
      }
    } catch (fetchError) {
      result.issues.push({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'فشل الاتصال بـ Facebook API'
      });
    }

    console.log('✅ [TOKEN-CHECK] Check complete. Valid:', result.valid);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TOKEN-CHECK] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل فحص Token',
      error: error.message
    });
  }
};

/**
 * التحقق من صحة البيانات المُرسلة
 * POST /api/v1/storefront-settings/validate-event-data
 */
exports.validateEventData = async (req, res) => {
  try {
    const { eventName, eventData } = req.body;

    console.log('📊 [EVENT-VALIDATION] Validating event:', eventName);

    const validation = {
      valid: true,
      eventName,
      issues: [],
      recommendations: [],
      matchQualityScore: 0
    };

    // فحص اسم الحدث
    const validEvents = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Search', 'Lead', 'CompleteRegistration', 'AddToWishlist'];
    if (!validEvents.includes(eventName)) {
      validation.issues.push({
        type: 'warning',
        field: 'eventName',
        message: `حدث غير معروف: ${eventName}. الأحداث المعتمدة: ${validEvents.join(', ')}`
      });
    }

    // فحص البيانات المطلوبة حسب نوع الحدث
    if (eventData) {
      let matchScore = 0;

      // فحص user_data
      if (eventData.user_data) {
        const userData = eventData.user_data;
        if (userData.em) matchScore += 15; // Email
        if (userData.ph) matchScore += 15; // Phone
        if (userData.fn) matchScore += 10; // First Name
        if (userData.ln) matchScore += 10; // Last Name
        if (userData.ct) matchScore += 5;  // City
        if (userData.st) matchScore += 5;  // State
        if (userData.zp) matchScore += 5;  // Zip
        if (userData.country) matchScore += 5; // Country
        if (userData.external_id) matchScore += 10; // External ID
        if (userData.client_ip_address) matchScore += 10; // IP
        if (userData.client_user_agent) matchScore += 10; // User Agent
      } else {
        validation.issues.push({
          type: 'warning',
          field: 'user_data',
          message: 'user_data مفقود - سيؤثر على Event Match Quality'
        });
      }

      // فحص custom_data للأحداث التجارية
      if (['Purchase', 'AddToCart', 'InitiateCheckout', 'ViewContent'].includes(eventName)) {
        if (!eventData.custom_data) {
          validation.issues.push({
            type: 'warning',
            field: 'custom_data',
            message: 'custom_data مفقود للحدث التجاري'
          });
        } else {
          const customData = eventData.custom_data;
          if (!customData.value && eventName === 'Purchase') {
            validation.issues.push({
              type: 'error',
              field: 'custom_data.value',
              message: 'قيمة الشراء مطلوبة لحدث Purchase'
            });
            validation.valid = false;
          }
          if (!customData.currency) {
            validation.issues.push({
              type: 'warning',
              field: 'custom_data.currency',
              message: 'العملة غير محددة - سيتم استخدام USD افتراضياً'
            });
          }
          if (!customData.content_ids && !customData.contents) {
            validation.issues.push({
              type: 'warning',
              field: 'custom_data.content_ids',
              message: 'معرفات المنتجات غير موجودة'
            });
          }
        }
      }

      // فحص event_id للـ Deduplication
      if (!eventData.event_id) {
        validation.issues.push({
          type: 'warning',
          field: 'event_id',
          message: 'event_id مفقود - مطلوب لـ Deduplication'
        });
      }

      // فحص event_time
      if (!eventData.event_time) {
        validation.issues.push({
          type: 'warning',
          field: 'event_time',
          message: 'event_time مفقود - سيتم استخدام الوقت الحالي'
        });
      }

      validation.matchQualityScore = Math.min(matchScore, 100);

      // توصيات لتحسين Match Quality
      if (matchScore < 50) {
        validation.recommendations.push('أضف بيانات المستخدم (email, phone) لتحسين Match Quality');
      }
      if (matchScore < 70) {
        validation.recommendations.push('أضف external_id و IP address لتحسين الدقة');
      }
    }

    console.log('✅ [EVENT-VALIDATION] Validation complete. Score:', validation.matchQualityScore);

    return res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('❌ [EVENT-VALIDATION] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل التحقق من البيانات',
      error: error.message
    });
  }
};

// ============================================
// 🎯 MULTIPLE PIXELS SUPPORT
// ============================================

/**
 * جلب جميع Pixels للشركة
 * GET /api/v1/storefront-settings/pixels
 */
exports.getPixels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('📋 [PIXELS] Getting pixels for company:', companyId);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId },
      include: {
        facebookPixels: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    return res.json({
      success: true,
      data: {
        pixels: settings.facebookPixels || [],
        primaryPixelId: settings.facebookPixelId,
        totalCount: settings.facebookPixels?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ [PIXELS] Error getting pixels:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل جلب Pixels',
      error: error.message
    });
  }
};

/**
 * إضافة Pixel جديد
 * POST /api/v1/storefront-settings/pixels
 */
exports.addPixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();
    const {
      pixelId,
      pixelName,
      accessToken,
      isPrimary,
      trackPageView,
      trackViewContent,
      trackAddToCart,
      trackInitiateCheckout,
      trackPurchase,
      trackSearch,
      trackAddToWishlist,
      trackLead,
      trackCompleteRegistration
    } = req.body;

    console.log('➕ [PIXELS] Adding new pixel for company:', companyId);

    if (!pixelId || !pixelName) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID و اسم Pixel مطلوبان'
      });
    }

    // التحقق من صحة Pixel ID
    if (!/^\d{16}$/.test(pixelId)) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID يجب أن يكون 16 رقم'
      });
    }

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    // إذا كان Primary، إلغاء Primary من الآخرين
    if (isPrimary) {
      await prisma.facebookPixelConfig.updateMany({
        where: { storefrontSettingsId: settings.id },
        data: { isPrimary: false }
      });
    }

    // إنشاء Pixel جديد
    const newPixel = await prisma.facebookPixelConfig.create({
      data: {
        storefrontSettingsId: settings.id,
        pixelId,
        pixelName,
        accessToken: accessToken || null,
        isPrimary: isPrimary || false,
        trackPageView: trackPageView !== false,
        trackViewContent: trackViewContent !== false,
        trackAddToCart: trackAddToCart !== false,
        trackInitiateCheckout: trackInitiateCheckout !== false,
        trackPurchase: trackPurchase !== false,
        trackSearch: trackSearch !== false,
        trackAddToWishlist: trackAddToWishlist || false,
        trackLead: trackLead || false,
        trackCompleteRegistration: trackCompleteRegistration || false
      }
    });

    // إذا كان Primary، تحديث الإعدادات الرئيسية
    if (isPrimary) {
      await prisma.storefrontSettings.update({
        where: { companyId },
        data: {
          facebookPixelId: pixelId,
          facebookPixelEnabled: true,
          facebookConvApiToken: accessToken || settings.facebookConvApiToken,
          facebookConvApiEnabled: !!accessToken
        }
      });
    }

    console.log('✅ [PIXELS] Pixel added:', newPixel.id);

    return res.status(201).json({
      success: true,
      message: 'تم إضافة Pixel بنجاح',
      data: newPixel
    });
  } catch (error) {
    console.error('❌ [PIXELS] Error adding pixel:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID موجود بالفعل'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'فشل إضافة Pixel',
      error: error.message
    });
  }
};

/**
 * تحديث Pixel
 * PUT /api/v1/storefront-settings/pixels/:id
 */
exports.updatePixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const prisma = getPrisma();
    const updateData = req.body;

    console.log('✏️ [PIXELS] Updating pixel:', id);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    // التحقق من أن Pixel ينتمي للشركة
    const existingPixel = await prisma.facebookPixelConfig.findFirst({
      where: {
        id,
        storefrontSettingsId: settings.id
      }
    });

    if (!existingPixel) {
      return res.status(404).json({
        success: false,
        message: 'Pixel غير موجود'
      });
    }

    // إذا تم تعيينه كـ Primary
    if (updateData.isPrimary && !existingPixel.isPrimary) {
      await prisma.facebookPixelConfig.updateMany({
        where: { storefrontSettingsId: settings.id },
        data: { isPrimary: false }
      });

      // تحديث الإعدادات الرئيسية
      await prisma.storefrontSettings.update({
        where: { companyId },
        data: {
          facebookPixelId: existingPixel.pixelId,
          facebookPixelEnabled: true,
          facebookConvApiToken: updateData.accessToken || existingPixel.accessToken || settings.facebookConvApiToken,
          facebookConvApiEnabled: !!(updateData.accessToken || existingPixel.accessToken)
        }
      });
    }

    // تحديث Pixel
    const allowedFields = [
      'pixelName', 'accessToken', 'isActive', 'isPrimary',
      'trackPageView', 'trackViewContent', 'trackAddToCart',
      'trackInitiateCheckout', 'trackPurchase', 'trackSearch',
      'trackAddToWishlist', 'trackLead', 'trackCompleteRegistration'
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    const updatedPixel = await prisma.facebookPixelConfig.update({
      where: { id },
      data: filteredData
    });

    console.log('✅ [PIXELS] Pixel updated:', id);

    return res.json({
      success: true,
      message: 'تم تحديث Pixel بنجاح',
      data: updatedPixel
    });
  } catch (error) {
    console.error('❌ [PIXELS] Error updating pixel:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل تحديث Pixel',
      error: error.message
    });
  }
};

/**
 * حذف Pixel
 * DELETE /api/v1/storefront-settings/pixels/:id
 */
exports.deletePixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const prisma = getPrisma();

    console.log('🗑️ [PIXELS] Deleting pixel:', id);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    // التحقق من أن Pixel ينتمي للشركة
    const existingPixel = await prisma.facebookPixelConfig.findFirst({
      where: {
        id,
        storefrontSettingsId: settings.id
      }
    });

    if (!existingPixel) {
      return res.status(404).json({
        success: false,
        message: 'Pixel غير موجود'
      });
    }

    // حذف Pixel
    await prisma.facebookPixelConfig.delete({
      where: { id }
    });

    // إذا كان Primary، إعادة تعيين الإعدادات الرئيسية
    if (existingPixel.isPrimary) {
      // البحث عن Pixel آخر ليكون Primary
      const nextPixel = await prisma.facebookPixelConfig.findFirst({
        where: { storefrontSettingsId: settings.id },
        orderBy: { createdAt: 'asc' }
      });

      if (nextPixel) {
        await prisma.facebookPixelConfig.update({
          where: { id: nextPixel.id },
          data: { isPrimary: true }
        });

        await prisma.storefrontSettings.update({
          where: { companyId },
          data: {
            facebookPixelId: nextPixel.pixelId,
            facebookConvApiToken: nextPixel.accessToken
          }
        });
      } else {
        // لا يوجد Pixels أخرى
        await prisma.storefrontSettings.update({
          where: { companyId },
          data: {
            facebookPixelId: null,
            facebookPixelEnabled: false,
            facebookConvApiEnabled: false
          }
        });
      }
    }

    console.log('✅ [PIXELS] Pixel deleted:', id);

    return res.json({
      success: true,
      message: 'تم حذف Pixel بنجاح'
    });
  } catch (error) {
    console.error('❌ [PIXELS] Error deleting pixel:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل حذف Pixel',
      error: error.message
    });
  }
};

/**
 * اختبار Pixel محدد
 * POST /api/v1/storefront-settings/pixels/:id/test
 */
exports.testPixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const prisma = getPrisma();

    console.log('🧪 [PIXELS] Testing pixel:', id);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على إعدادات المتجر'
      });
    }

    const pixel = await prisma.facebookPixelConfig.findFirst({
      where: {
        id,
        storefrontSettingsId: settings.id
      }
    });

    if (!pixel) {
      return res.status(404).json({
        success: false,
        message: 'Pixel غير موجود'
      });
    }

    let testResult = {
      success: false,
      message: '',
      pixelValid: false,
      tokenValid: false,
      capiTest: null
    };

    // فحص Pixel ID
    if (/^\d{16}$/.test(pixel.pixelId)) {
      testResult.pixelValid = true;
    } else {
      testResult.message = 'Pixel ID غير صحيح';
    }

    // فحص Token إذا موجود
    if (pixel.accessToken) {
      try {
        const FacebookConversionsService = require('../services/facebookConversionsService');
        const fbService = new FacebookConversionsService(
          pixel.pixelId,
          pixel.accessToken
        );
        const capiResult = await fbService.testConnection();
        testResult.tokenValid = capiResult.success;
        testResult.capiTest = capiResult;
      } catch (capiError) {
        testResult.tokenValid = false;
        testResult.capiTest = { success: false, message: capiError.message };
      }
    }

    testResult.success = testResult.pixelValid && (pixel.accessToken ? testResult.tokenValid : true);
    testResult.message = testResult.success ? 'اختبار ناجح' : 'فشل الاختبار';

    // تحديث نتيجة الاختبار
    await prisma.facebookPixelConfig.update({
      where: { id },
      data: {
        lastTestAt: new Date(),
        lastTestResult: testResult.success ? 'success' : 'failed',
        tokenStatus: pixel.accessToken ? (testResult.tokenValid ? 'valid' : 'invalid') : 'no_token'
      }
    });

    console.log('✅ [PIXELS] Test complete:', testResult.success);

    return res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('❌ [PIXELS] Error testing pixel:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل اختبار Pixel',
      error: error.message
    });
  }
};

/**
 * إنشاء Pixel جديد على Facebook
 * POST /api/v1/storefront-settings/create-pixel
 */
exports.createFacebookPixel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pixelName, businessId } = req.body;
    const prisma = getPrisma();

    console.log('🆕 [CREATE-PIXEL] Creating new pixel for company:', companyId);

    if (!pixelName) {
      return res.status(400).json({
        success: false,
        message: 'اسم Pixel مطلوب'
      });
    }

    // جلب Facebook Token من OAuth
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { facebookAccessToken: true, facebookBusinessId: true }
    });

    if (!company?.facebookAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'يجب ربط حساب Facebook أولاً',
        needsAuth: true
      });
    }

    const accessToken = company.facebookAccessToken;
    const targetBusinessId = businessId || company.facebookBusinessId;

    if (!targetBusinessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID مطلوب. يرجى تحديد Business Account'
      });
    }

    // إنشاء Pixel عبر Facebook Graph API
    const fetch = require('node-fetch');
    
    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${targetBusinessId}/adspixels`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: pixelName,
          access_token: accessToken
        })
      }
    );

    const createData = await createResponse.json();

    if (createData.error) {
      console.error('❌ [CREATE-PIXEL] Facebook API error:', createData.error);
      return res.status(400).json({
        success: false,
        message: createData.error.message || 'فشل إنشاء Pixel',
        error: createData.error
      });
    }

    const newPixelId = createData.id;
    console.log('✅ [CREATE-PIXEL] Pixel created:', newPixelId);

    // توليد System User Token للـ Pixel (اختياري)
    let pixelAccessToken = null;
    try {
      // محاولة الحصول على token للـ pixel
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/${newPixelId}?fields=id,name&access_token=${accessToken}`
      );
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.error) {
        // استخدام نفس الـ access token للـ CAPI
        pixelAccessToken = accessToken;
      }
    } catch (tokenError) {
      console.warn('⚠️ [CREATE-PIXEL] Could not get pixel token:', tokenError.message);
    }

    // حفظ Pixel في قاعدة البيانات
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    if (settings) {
      // إضافة للـ Multiple Pixels
      const pixelConfig = await prisma.facebookPixelConfig.create({
        data: {
          storefrontSettingsId: settings.id,
          pixelId: newPixelId,
          pixelName: pixelName,
          accessToken: pixelAccessToken,
          isActive: true,
          isPrimary: false,
          trackPageView: true,
          trackViewContent: true,
          trackAddToCart: true,
          trackInitiateCheckout: true,
          trackPurchase: true,
          trackSearch: true
        }
      });

      console.log('✅ [CREATE-PIXEL] Pixel saved to database:', pixelConfig.id);

      return res.json({
        success: true,
        message: 'تم إنشاء Pixel بنجاح',
        data: {
          pixelId: newPixelId,
          pixelName: pixelName,
          accessToken: pixelAccessToken ? '***' : null,
          configId: pixelConfig.id
        }
      });
    }

    return res.json({
      success: true,
      message: 'تم إنشاء Pixel بنجاح',
      data: {
        pixelId: newPixelId,
        pixelName: pixelName,
        accessToken: pixelAccessToken ? '***' : null
      }
    });

  } catch (error) {
    console.error('❌ [CREATE-PIXEL] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل إنشاء Pixel',
      error: error.message
    });
  }
};

/**
 * جلب Business Accounts المتاحة
 * GET /api/v1/storefront-settings/business-accounts
 */
exports.getBusinessAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🏢 [BUSINESS] Fetching business accounts for company:', companyId);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { facebookAccessToken: true, facebookUserId: true }
    });

    if (!company?.facebookAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'يجب ربط حساب Facebook أولاً',
        needsAuth: true
      });
    }

    const fetch = require('node-fetch');
    
    // جلب Business Accounts
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${company.facebookAccessToken}`
    );
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        success: false,
        message: data.error.message || 'فشل جلب Business Accounts',
        error: data.error
      });
    }

    const businesses = (data.data || []).map(b => ({
      id: b.id,
      name: b.name
    }));

    console.log('✅ [BUSINESS] Found', businesses.length, 'business accounts');

    return res.json({
      success: true,
      data: { businesses }
    });

  } catch (error) {
    console.error('❌ [BUSINESS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل جلب Business Accounts',
      error: error.message
    });
  }
};
