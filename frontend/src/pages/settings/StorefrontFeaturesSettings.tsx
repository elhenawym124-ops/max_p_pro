import React, { useState, useEffect } from 'react';
import {
  EyeIcon,
  ArrowsRightLeftIcon,
  HeartIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  BellIcon,
  EyeSlashIcon,
  ScaleIcon,
  ShareIcon,
  TagIcon,
  RectangleStackIcon,
  ShoppingCartIcon,
  GlobeAltIcon,
  LanguageIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  PaintBrushIcon,
  FireIcon,
  TruckIcon,
  ArrowsUpDownIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { storefrontSettingsService, StorefrontSettings, StorefrontSettingsUpdate } from '../../services/storefrontSettingsService';
import SortableProductPageElements, { ProductPageElement } from '../../components/settings/SortableProductPageElements';

const StorefrontFeaturesSettings: React.FC = () => {
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await storefrontSettingsService.getSettings();
      console.log('🔍 [STOREFRONT-SETTINGS] Response from API:', response);
      console.log('🔍 [STOREFRONT-SETTINGS] Response data:', response.data);
      // API returns { success: true, data: {...} }, so we need to extract data.data
      const settingsData = response.data?.data || response.data;
      console.log('🔍 [STOREFRONT-SETTINGS] Settings data:', settingsData);
      console.log('🔍 [STOREFRONT-SETTINGS] Quick View Enabled:', settingsData?.quickViewEnabled);
      console.log('🔍 [STOREFRONT-SETTINGS] Comparison Enabled:', settingsData?.comparisonEnabled);
      console.log('🔍 [STOREFRONT-SETTINGS] Wishlist Enabled:', settingsData?.wishlistEnabled);
      setSettings(settingsData);
    } catch (error: any) {
      console.error('❌ [STOREFRONT-SETTINGS] Error loading settings:', error);
      console.error('❌ [STOREFRONT-SETTINGS] Error response:', error.response?.data);
      console.error('❌ [STOREFRONT-SETTINGS] Error status:', error.response?.status);

      // عرض رسالة خطأ أكثر تفصيلاً
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'فشل تحميل الإعدادات';

      toast.error(errorMessage);

      // في development mode، عرض تفاصيل أكثر
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [STOREFRONT-SETTINGS] Full error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          errorCode: error.response?.data?.errorCode,
          details: error.response?.data?.details
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      // Remove undefined values and ensure String fields have proper defaults
      const cleanSettings = Object.fromEntries(
        Object.entries(settings).filter(([_, value]) => value !== undefined)
      ) as StorefrontSettings;

      // Ensure String fields have proper defaults (not undefined/null)
      if (!cleanSettings.estimatedDeliveryDefaultText || typeof cleanSettings.estimatedDeliveryDefaultText !== 'string') {
        cleanSettings.estimatedDeliveryDefaultText = 'التوصيل خلال {time}';
      }
      if (!cleanSettings.fomoType || typeof cleanSettings.fomoType !== 'string') {
        cleanSettings.fomoType = 'soldCount';
      }
      if (!cleanSettings.fomoTrigger || typeof cleanSettings.fomoTrigger !== 'string') {
        cleanSettings.fomoTrigger = 'time';
      }
      // fomoMessage can be null/empty, so we keep it as is

      const updateData: StorefrontSettingsUpdate = {
        ...cleanSettings,
        // Ensure supportedLanguages is always an array
        supportedLanguages: Array.isArray(cleanSettings.supportedLanguages)
          ? cleanSettings.supportedLanguages
          : (cleanSettings.supportedLanguages ? [cleanSettings.supportedLanguages] : ['ar'])
      };
      await storefrontSettingsService.updateSettings(updateData);
      toast.success('تم حفظ الإعدادات بنجاح');
      // Reload settings after save
      await loadSettings();
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) return;

    try {
      setSaving(true);
      await storefrontSettingsService.resetSettings();
      await loadSettings();
      toast.success('تم إعادة تعيين الإعدادات بنجاح');
    } catch (error) {
      toast.error('فشل إعادة تعيين الإعدادات');
      console.error('Error resetting settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof StorefrontSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لا توجد إعدادات</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <GlobeAltIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          إعدادات واجهة المتجر
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة ميزات واجهة المتجر وتفعيل/إلغاء تفعيل الميزات</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex justify-end gap-4">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          إعادة تعيين
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200/20 dark:shadow-none"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Quick View Section */}
        <SettingsSection
          title="المعاينة السريعة"
          icon={EyeIcon}
          enabled={settings.quickViewEnabled}
          onToggle={(enabled) => updateSetting('quickViewEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار زر إضافة للسلة"
            value={settings.quickViewShowAddToCart}
            onChange={(value) => updateSetting('quickViewShowAddToCart', value)}
            disabled={!settings.quickViewEnabled}
          />
          <ToggleSetting
            label="إظهار زر المفضلة"
            value={settings.quickViewShowWishlist}
            onChange={(value) => updateSetting('quickViewShowWishlist', value)}
            disabled={!settings.quickViewEnabled}
          />
        </SettingsSection>

        {/* Product Comparison Section */}
        <SettingsSection
          title="مقارنة المنتجات"
          icon={ArrowsRightLeftIcon}
          enabled={settings.comparisonEnabled}
          onToggle={(enabled) => updateSetting('comparisonEnabled', enabled)}
        >
          <NumberSetting
            label="الحد الأقصى للمنتجات للمقارنة"
            value={settings.maxComparisonProducts}
            onChange={(value) => updateSetting('maxComparisonProducts', value)}
            min={2}
            max={10}
            disabled={!settings.comparisonEnabled}
          />
          <ToggleSetting
            label="إظهار السعر"
            value={settings.comparisonShowPrice}
            onChange={(value) => updateSetting('comparisonShowPrice', value)}
            disabled={!settings.comparisonEnabled}
          />
          <ToggleSetting
            label="إظهار المواصفات"
            value={settings.comparisonShowSpecs}
            onChange={(value) => updateSetting('comparisonShowSpecs', value)}
            disabled={!settings.comparisonEnabled}
          />
        </SettingsSection>

        {/* Wishlist Section */}
        <SettingsSection
          title="قائمة الرغبات"
          icon={HeartIcon}
          enabled={settings.wishlistEnabled}
          onToggle={(enabled) => updateSetting('wishlistEnabled', enabled)}
        >
          <ToggleSetting
            label="يتطلب تسجيل دخول"
            value={settings.wishlistRequireLogin}
            onChange={(value) => updateSetting('wishlistRequireLogin', value)}
            disabled={!settings.wishlistEnabled}
          />
          <NumberSetting
            label="الحد الأقصى للمنتجات"
            value={settings.wishlistMaxItems}
            onChange={(value) => updateSetting('wishlistMaxItems', value)}
            min={10}
            max={1000}
            disabled={!settings.wishlistEnabled}
          />
        </SettingsSection>

        {/* Advanced Filters Section */}
        <SettingsSection
          title="الفلاتر المتقدمة"
          icon={FunnelIcon}
          enabled={settings.advancedFiltersEnabled}
          onToggle={(enabled) => updateSetting('advancedFiltersEnabled', enabled)}
        >
          <ToggleSetting
            label="فلترة حسب السعر"
            value={settings.filterByPrice}
            onChange={(value) => updateSetting('filterByPrice', value)}
            disabled={!settings.advancedFiltersEnabled}
          />
          <ToggleSetting
            label="فلترة حسب التقييم"
            value={settings.filterByRating}
            onChange={(value) => updateSetting('filterByRating', value)}
            disabled={!settings.advancedFiltersEnabled}
          />
          <ToggleSetting
            label="فلترة حسب العلامة التجارية"
            value={settings.filterByBrand}
            onChange={(value) => updateSetting('filterByBrand', value)}
            disabled={!settings.advancedFiltersEnabled}
          />
          <ToggleSetting
            label="فلترة حسب الخصائص"
            value={settings.filterByAttributes}
            onChange={(value) => updateSetting('filterByAttributes', value)}
            disabled={!settings.advancedFiltersEnabled}
          />
        </SettingsSection>

        {/* Reviews & Ratings Section */}
        <SettingsSection
          title="التقييمات والمراجعات"
          icon={StarIcon}
          enabled={settings.reviewsEnabled}
          onToggle={(enabled) => updateSetting('reviewsEnabled', enabled)}
        >
          <ToggleSetting
            label="يتطلب شراء المنتج"
            value={settings.reviewsRequirePurchase}
            onChange={(value) => updateSetting('reviewsRequirePurchase', value)}
            disabled={!settings.reviewsEnabled}
          />
          <ToggleSetting
            label="الموافقة على التقييمات"
            value={settings.reviewsModerationEnabled}
            onChange={(value) => updateSetting('reviewsModerationEnabled', value)}
            disabled={!settings.reviewsEnabled}
          />
          <ToggleSetting
            label="إظهار التقييم"
            value={settings.reviewsShowRating}
            onChange={(value) => updateSetting('reviewsShowRating', value)}
            disabled={!settings.reviewsEnabled}
          />
          <NumberSetting
            label="الحد الأدنى للتقييم للعرض"
            value={settings.minRatingToDisplay}
            onChange={(value) => updateSetting('minRatingToDisplay', value)}
            min={1}
            max={5}
            disabled={!settings.reviewsEnabled}
          />
        </SettingsSection>

        {/* Countdown Timer Section */}
        <SettingsSection
          title="العد التنازلي"
          icon={ClockIcon}
          enabled={settings.countdownEnabled}
          onToggle={(enabled) => updateSetting('countdownEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار في صفحة المنتج"
            value={settings.countdownShowOnProduct}
            onChange={(value) => updateSetting('countdownShowOnProduct', value)}
            disabled={!settings.countdownEnabled}
          />
          <ToggleSetting
            label="إظهار في قائمة المنتجات"
            value={settings.countdownShowOnListing}
            onChange={(value) => updateSetting('countdownShowOnListing', value)}
            disabled={!settings.countdownEnabled}
          />
        </SettingsSection>

        {/* Back in Stock Section */}
        <SettingsSection
          title="إشعارات العودة للمخزون"
          icon={BellIcon}
          enabled={settings.backInStockEnabled}
          onToggle={(enabled) => updateSetting('backInStockEnabled', enabled)}
        >
          <ToggleSetting
            label="إشعار عبر البريد"
            value={settings.backInStockNotifyEmail}
            onChange={(value) => updateSetting('backInStockNotifyEmail', value)}
            disabled={!settings.backInStockEnabled}
          />
          <ToggleSetting
            label="إشعار عبر SMS"
            value={settings.backInStockNotifySMS}
            onChange={(value) => updateSetting('backInStockNotifySMS', value)}
            disabled={!settings.backInStockEnabled}
          />
        </SettingsSection>

        {/* Recently Viewed Section */}
        <SettingsSection
          title="المنتجات المشاهدة مؤخراً"
          icon={EyeSlashIcon}
          enabled={settings.recentlyViewedEnabled}
          onToggle={(enabled) => updateSetting('recentlyViewedEnabled', enabled)}
        >
          <NumberSetting
            label="عدد المنتجات المعروضة"
            value={settings.recentlyViewedCount}
            onChange={(value) => updateSetting('recentlyViewedCount', value)}
            min={4}
            max={20}
            disabled={!settings.recentlyViewedEnabled}
          />
          <NumberSetting
            label="عدد الأيام للاحتفاظ"
            value={settings.recentlyViewedDays}
            onChange={(value) => updateSetting('recentlyViewedDays', value)}
            min={7}
            max={90}
            disabled={!settings.recentlyViewedEnabled}
          />
        </SettingsSection>

        {/* Size Guide Section */}
        <SettingsSection
          title="دليل المقاسات"
          icon={ScaleIcon}
          enabled={settings.sizeGuideEnabled}
          onToggle={(enabled) => updateSetting('sizeGuideEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار في صفحة المنتج"
            value={settings.sizeGuideShowOnProduct}
            onChange={(value) => updateSetting('sizeGuideShowOnProduct', value)}
            disabled={!settings.sizeGuideEnabled}
          />
        </SettingsSection>

        {/* Social Sharing Section */}
        <SettingsSection
          title="المشاركة الاجتماعية"
          icon={ShareIcon}
          enabled={settings.socialSharingEnabled}
          onToggle={(enabled) => updateSetting('socialSharingEnabled', enabled)}
        >
          <ToggleSetting
            label="Facebook"
            value={settings.shareFacebook}
            onChange={(value) => updateSetting('shareFacebook', value)}
            disabled={!settings.socialSharingEnabled}
          />
          <ToggleSetting
            label="Twitter"
            value={settings.shareTwitter}
            onChange={(value) => updateSetting('shareTwitter', value)}
            disabled={!settings.socialSharingEnabled}
          />
          <ToggleSetting
            label="WhatsApp"
            value={settings.shareWhatsApp}
            onChange={(value) => updateSetting('shareWhatsApp', value)}
            disabled={!settings.socialSharingEnabled}
          />
          <ToggleSetting
            label="Telegram"
            value={settings.shareTelegram}
            onChange={(value) => updateSetting('shareTelegram', value)}
            disabled={!settings.socialSharingEnabled}
          />
        </SettingsSection>

        {/* Product Badges Section */}
        <SettingsSection
          title="شارات المنتجات"
          icon={TagIcon}
          enabled={settings.badgesEnabled}
          onToggle={(enabled) => updateSetting('badgesEnabled', enabled)}
        >
          <ToggleSetting
            label="شارة 'جديد'"
            value={settings.badgeNew}
            onChange={(value) => updateSetting('badgeNew', value)}
            disabled={!settings.badgesEnabled}
          />
          <ToggleSetting
            label="شارة 'الأكثر مبيعاً'"
            value={settings.badgeBestSeller}
            onChange={(value) => updateSetting('badgeBestSeller', value)}
            disabled={!settings.badgesEnabled}
          />
          <ToggleSetting
            label="شارة 'عرض خاص'"
            value={settings.badgeOnSale}
            onChange={(value) => updateSetting('badgeOnSale', value)}
            disabled={!settings.badgesEnabled}
          />
          <ToggleSetting
            label="شارة 'نفد المخزون'"
            value={settings.badgeOutOfStock}
            onChange={(value) => updateSetting('badgeOutOfStock', value)}
            disabled={!settings.badgesEnabled}
          />
        </SettingsSection>

        {/* Product Tabs Section */}
        <SettingsSection
          title="تبويبات المنتج"
          icon={RectangleStackIcon}
          enabled={settings.tabsEnabled}
          onToggle={(enabled) => updateSetting('tabsEnabled', enabled)}
        >
          <ToggleSetting
            label="تبويب الوصف"
            value={settings.tabDescription}
            onChange={(value) => updateSetting('tabDescription', value)}
            disabled={!settings.tabsEnabled}
          />
          <ToggleSetting
            label="تبويب المواصفات"
            value={settings.tabSpecifications}
            onChange={(value) => updateSetting('tabSpecifications', value)}
            disabled={!settings.tabsEnabled}
          />
          <ToggleSetting
            label="تبويب التقييمات"
            value={settings.tabReviews}
            onChange={(value) => updateSetting('tabReviews', value)}
            disabled={!settings.tabsEnabled}
          />
          <ToggleSetting
            label="تبويب الشحن"
            value={settings.tabShipping}
            onChange={(value) => updateSetting('tabShipping', value)}
            disabled={!settings.tabsEnabled}
          />
        </SettingsSection>

        {/* Sticky Add to Cart Section */}
        <SettingsSection
          title="زر إضافة للسلة الثابت"
          icon={ShoppingCartIcon}
          enabled={settings.stickyAddToCartEnabled}
          onToggle={(enabled) => updateSetting('stickyAddToCartEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار على الموبايل"
            value={settings.stickyShowOnMobile}
            onChange={(value) => updateSetting('stickyShowOnMobile', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="إظهار على الديسكتوب"
            value={settings.stickyShowOnDesktop}
            onChange={(value) => updateSetting('stickyShowOnDesktop', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              مسافة التمرير قبل الظهور (بكسل)
            </label>
            <input
              type="number"
              min="0"
              max="2000"
              value={settings.stickyScrollThreshold || 300}
              onChange={(e) => updateSetting('stickyScrollThreshold', parseInt(e.target.value) || 300)}
              disabled={!settings.stickyAddToCartEnabled}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              المسافة بالبكسل التي يجب على المستخدم التمرير إليها قبل ظهور الشريط الثابت (افتراضي: 300)
            </p>
          </div>
          <ToggleSetting
            label="إظهار زر 'شراء الآن'"
            value={settings.stickyShowBuyNow !== false}
            onChange={(value) => updateSetting('stickyShowBuyNow', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="إظهار زر 'أضف للسلة'"
            value={settings.stickyShowAddToCartButton !== false}
            onChange={(value) => updateSetting('stickyShowAddToCartButton', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="إظهار اختيار الكمية"
            value={settings.stickyShowQuantity !== false}
            onChange={(value) => updateSetting('stickyShowQuantity', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="إظهار صورة المنتج"
            value={settings.stickyShowProductImage !== false}
            onChange={(value) => updateSetting('stickyShowProductImage', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="إظهار اسم المنتج"
            value={settings.stickyShowProductName !== false}
            onChange={(value) => updateSetting('stickyShowProductName', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="تتبع التحليلات"
            value={settings.stickyTrackAnalytics !== false}
            onChange={(value) => updateSetting('stickyTrackAnalytics', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <ToggleSetting
            label="التمرير التلقائي لصفحة الشراء"
            value={settings.stickyAutoScrollToCheckout === true}
            onChange={(value) => updateSetting('stickyAutoScrollToCheckout', value)}
            disabled={!settings.stickyAddToCartEnabled}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            عند تفعيل "التمرير التلقائي"، سيتم التمرير تلقائياً لصفحة الشراء عند الضغط على "شراء الآن"
          </p>
        </SettingsSection>

        {/* Mobile Bottom Navbar Section */}
        <SettingsSection
          title="شريط التنقل السفلي للموبايل"
          icon={DevicePhoneMobileIcon}
          enabled={settings.mobileBottomNavbarEnabled !== false}
          onToggle={(enabled) => updateSetting('mobileBottomNavbarEnabled', enabled)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToggleSetting
              label="إظهار الرئيسية"
              value={settings.mobileBottomNavbarShowHome !== false}
              onChange={(value) => updateSetting('mobileBottomNavbarShowHome', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار المتجر (Shop)"
              value={settings.mobileBottomNavbarShowShop !== false}
              onChange={(value) => updateSetting('mobileBottomNavbarShowShop', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار المفضلة"
              value={settings.mobileBottomNavbarShowWishlist !== false}
              onChange={(value) => updateSetting('mobileBottomNavbarShowWishlist', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار حسابي"
              value={settings.mobileBottomNavbarShowAccount !== false}
              onChange={(value) => updateSetting('mobileBottomNavbarShowAccount', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار زر المقارنة"
              value={settings.mobileBottomNavbarShowCompare !== false}
              onChange={(value) => updateSetting('mobileBottomNavbarShowCompare', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار زر البحث"
              value={settings.mobileBottomNavbarShowSearch === true}
              onChange={(value) => updateSetting('mobileBottomNavbarShowSearch', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
            <ToggleSetting
              label="إظهار زر السلة"
              value={settings.mobileBottomNavbarShowCart === true}
              onChange={(value) => updateSetting('mobileBottomNavbarShowCart', value)}
              disabled={settings.mobileBottomNavbarEnabled === false}
            />
          </div>
        </SettingsSection>

        {/* Product Navigation Section */}
        <SettingsSection
          title="التنقل بين المنتجات"
          icon={ArrowLeftIcon}
          enabled={settings.navigationEnabled !== false}
          onToggle={(enabled) => updateSetting('navigationEnabled', enabled)}
        >
          <SelectSetting
            label="نوع التنقل"
            value={settings.navigationType || 'sameCategory'}
            onChange={(value) => updateSetting('navigationType', value)}
            options={[
              { value: 'sameCategory', label: 'نفس الفئة' },
              { value: 'allProducts', label: 'جميع المنتجات' },
            ]}
            disabled={!settings.navigationEnabled}
          />
          <ToggleSetting
            label="إظهار أزرار السابق/التالي"
            value={settings.showNavigationButtons !== false}
            onChange={(value) => updateSetting('showNavigationButtons', value)}
            disabled={!settings.navigationEnabled}
          />
          <ToggleSetting
            label="اختصارات لوحة المفاتيح (Arrow Keys)"
            value={settings.keyboardShortcuts !== false}
            onChange={(value) => updateSetting('keyboardShortcuts', value)}
            disabled={!settings.navigationEnabled}
          />
        </SettingsSection>

        {/* Sold Number Display Section */}
        <SettingsSection
          title="عرض عدد المبيعات"
          icon={ChartBarIcon}
          enabled={settings.soldNumberEnabled === true}
          onToggle={(enabled) => updateSetting('soldNumberEnabled', enabled)}
        >
          <SelectSetting
            label="نوع العدد"
            value={settings.soldNumberType || 'real'}
            onChange={(value) => updateSetting('soldNumberType', value)}
            options={[
              { value: 'real', label: 'عدد حقيقي من الطلبات' },
              { value: 'fake', label: 'عدد عشوائي/مزيف' },
            ]}
            disabled={!settings.soldNumberEnabled}
          />
          {settings.soldNumberType === 'fake' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الحد الأدنى
                  </label>
                  <input
                    type="number"
                    value={settings.soldNumberMin || 10}
                    onChange={(e) => updateSetting('soldNumberMin', parseInt(e.target.value))}
                    disabled={!settings.soldNumberEnabled}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الحد الأقصى
                  </label>
                  <input
                    type="number"
                    value={settings.soldNumberMax || 500}
                    onChange={(e) => updateSetting('soldNumberMax', parseInt(e.target.value))}
                    disabled={!settings.soldNumberEnabled}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نص العرض (استخدم {`{count}`} للعدد)
            </label>
            <input
              type="text"
              value={settings.soldNumberText || 'تم بيع {count} قطعة'}
              onChange={(e) => updateSetting('soldNumberText', e.target.value)}
              disabled={!settings.soldNumberEnabled}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="تم بيع {count} قطعة"
            />
          </div>
        </SettingsSection>

        {/* Variant Styles Section */}
        <SettingsSection
          title="أنماط المتغيرات"
          icon={PaintBrushIcon}
          enabled={true}
          onToggle={() => { }}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">أنماط الألوان</h4>
              <SelectSetting
                label="نمط عرض الألوان"
                value={settings.variantColorStyle || 'buttons'}
                onChange={(value) => updateSetting('variantColorStyle', value)}
                options={[
                  { value: 'buttons', label: 'أزرار' },
                  { value: 'circles', label: 'دوائر ملونة' },
                  { value: 'thumbnails', label: 'صور مصغرة' },
                  { value: 'dropdown', label: 'قائمة منسدلة' },
                  { value: 'swatches', label: 'Swatches مع الأسماء' },
                ]}
                disabled={false}
              />
              <ToggleSetting
                label="إظهار اسم اللون"
                value={settings.variantColorShowName !== false}
                onChange={(value) => updateSetting('variantColorShowName', value)}
                disabled={false}
              />
              <SelectSetting
                label="حجم العرض"
                value={settings.variantColorSize || 'medium'}
                onChange={(value) => updateSetting('variantColorSize', value)}
                options={[
                  { value: 'small', label: 'صغير' },
                  { value: 'medium', label: 'متوسط' },
                  { value: 'large', label: 'كبير' },
                ]}
                disabled={false}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">أنماط المقاسات</h4>
              <SelectSetting
                label="نمط عرض المقاسات"
                value={settings.variantSizeStyle || 'buttons'}
                onChange={(value) => updateSetting('variantSizeStyle', value)}
                options={[
                  { value: 'buttons', label: 'أزرار' },
                  { value: 'table', label: 'جدول' },
                  { value: 'dropdown', label: 'قائمة منسدلة' },
                  { value: 'grid', label: 'Grid مع الأسماء' },
                ]}
                disabled={false}
              />
              <ToggleSetting
                label="إظهار دليل المقاسات"
                value={settings.variantSizeShowGuide === true}
                onChange={(value) => updateSetting('variantSizeShowGuide', value)}
                disabled={false}
              />
              <ToggleSetting
                label="إظهار المخزون"
                value={settings.variantSizeShowStock !== false}
                onChange={(value) => updateSetting('variantSizeShowStock', value)}
                disabled={false}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Stock Progress Bar Section */}
        <SettingsSection
          title="شريط تقدم المخزون"
          icon={ChartBarIcon}
          enabled={settings.stockProgressEnabled === true}
          onToggle={(enabled) => updateSetting('stockProgressEnabled', enabled)}
        >
          <SelectSetting
            label="نوع العرض"
            value={settings.stockProgressType || 'percentage'}
            onChange={(value) => updateSetting('stockProgressType', value)}
            options={[
              { value: 'percentage', label: 'نسبة مئوية' },
              { value: 'count', label: 'عدد القطع' },
              { value: 'text', label: 'نص (قليل جداً/متوفر/نفذ)' },
            ]}
            disabled={!settings.stockProgressEnabled}
          />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                لون المخزون القليل
              </label>
              <input
                type="color"
                value={settings.stockProgressLowColor || '#ef4444'}
                onChange={(e) => updateSetting('stockProgressLowColor', e.target.value)}
                disabled={!settings.stockProgressEnabled}
                className="w-full h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                لون المخزون المتوسط
              </label>
              <input
                type="color"
                value={settings.stockProgressMediumColor || '#f59e0b'}
                onChange={(e) => updateSetting('stockProgressMediumColor', e.target.value)}
                disabled={!settings.stockProgressEnabled}
                className="w-full h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                لون المخزون العالي
              </label>
              <input
                type="color"
                value={settings.stockProgressHighColor || '#10b981'}
                onChange={(e) => updateSetting('stockProgressHighColor', e.target.value)}
                disabled={!settings.stockProgressEnabled}
                className="w-full h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              عتبة المخزون القليل
            </label>
            <input
              type="number"
              value={settings.stockProgressThreshold || 10}
              onChange={(e) => updateSetting('stockProgressThreshold', parseInt(e.target.value))}
              disabled={!settings.stockProgressEnabled}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">عدد القطع التي تعتبر "قليلة"</p>
          </div>
        </SettingsSection>

        {/* Security Badges Section */}
        <SettingsSection
          title="شارات الأمان"
          icon={ShieldCheckIcon}
          enabled={settings.securityBadgesEnabled === true}
          onToggle={(enabled) => updateSetting('securityBadgesEnabled', enabled)}
        >
          <ToggleSetting
            label="دفع آمن"
            value={settings.badgeSecurePayment !== false}
            onChange={(value) => updateSetting('badgeSecurePayment', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <ToggleSetting
            label="شحن مجاني"
            value={settings.badgeFreeShipping !== false}
            onChange={(value) => updateSetting('badgeFreeShipping', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <ToggleSetting
            label="ضمان الجودة"
            value={settings.badgeQualityGuarantee !== false}
            onChange={(value) => updateSetting('badgeQualityGuarantee', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <ToggleSetting
            label="دفع عند الاستلام"
            value={settings.badgeCashOnDelivery !== false}
            onChange={(value) => updateSetting('badgeCashOnDelivery', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <ToggleSetting
            label="حماية المشتري"
            value={settings.badgeBuyerProtection !== false}
            onChange={(value) => updateSetting('badgeBuyerProtection', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <ToggleSetting
            label="تقييمات عالية"
            value={settings.badgeHighRating !== false}
            onChange={(value) => updateSetting('badgeHighRating', value)}
            disabled={!settings.securityBadgesEnabled}
          />
          <div className="space-y-2">
            <ToggleSetting
              label="شارة مخصصة 1"
              value={settings.badgeCustom1 === true}
              onChange={(value) => updateSetting('badgeCustom1', value)}
              disabled={!settings.securityBadgesEnabled}
            />
            {settings.badgeCustom1 && (
              <input
                type="text"
                value={settings.badgeCustom1Text || ''}
                onChange={(e) => updateSetting('badgeCustom1Text', e.target.value)}
                disabled={!settings.securityBadgesEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="نص الشارة المخصصة 1"
              />
            )}
          </div>
          <div className="space-y-2">
            <ToggleSetting
              label="شارة مخصصة 2"
              value={settings.badgeCustom2 === true}
              onChange={(value) => updateSetting('badgeCustom2', value)}
              disabled={!settings.securityBadgesEnabled}
            />
            {settings.badgeCustom2 && (
              <input
                type="text"
                value={settings.badgeCustom2Text || ''}
                onChange={(e) => updateSetting('badgeCustom2Text', e.target.value)}
                disabled={!settings.securityBadgesEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="نص الشارة المخصصة 2"
              />
            )}
          </div>
          <SelectSetting
            label="تخطيط الشارات"
            value={settings.badgeLayout || 'horizontal'}
            onChange={(value) => updateSetting('badgeLayout', value)}
            options={[
              { value: 'horizontal', label: 'أفقي' },
              { value: 'vertical', label: 'عمودي' },
            ]}
            disabled={!settings.securityBadgesEnabled}
          />
        </SettingsSection>

        {/* Reasons to Purchase Section */}
        <SettingsSection
          title="أسباب الشراء"
          icon={CheckBadgeIcon}
          enabled={settings.reasonsToPurchaseEnabled === true}
          onToggle={(enabled) => updateSetting('reasonsToPurchaseEnabled', enabled)}
        >
          <SelectSetting
            label="نوع العرض"
            value={settings.reasonsToPurchaseType || 'global'}
            onChange={(value) => updateSetting('reasonsToPurchaseType', value)}
            options={[
              { value: 'global', label: 'عام لجميع المنتجات' },
              { value: 'perProduct', label: 'خاص بكل منتج' },
            ]}
            disabled={!settings.reasonsToPurchaseEnabled}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قائمة الأسباب (JSON Array - مثال: ["✅ جودة عالية", "✅ توصيل سريع"])
            </label>
            <textarea
              value={settings.reasonsToPurchaseList || ''}
              onChange={(e) => updateSetting('reasonsToPurchaseList', e.target.value)}
              disabled={!settings.reasonsToPurchaseEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              placeholder='["✅ جودة عالية", "✅ توصيل سريع", "✅ ضمان 30 يوم"]'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عدد الأسباب المعروضة
            </label>
            <input
              type="number"
              value={settings.reasonsToPurchaseMaxItems || 4}
              onChange={(e) => updateSetting('reasonsToPurchaseMaxItems', parseInt(e.target.value))}
              disabled={!settings.reasonsToPurchaseEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
              max={10}
            />
          </div>
          <SelectSetting
            label="نمط العرض"
            value={settings.reasonsToPurchaseStyle || 'list'}
            onChange={(value) => updateSetting('reasonsToPurchaseStyle', value)}
            options={[
              { value: 'list', label: 'قائمة' },
              { value: 'icons', label: 'أيقونات' },
            ]}
            disabled={!settings.reasonsToPurchaseEnabled}
          />
        </SettingsSection>

        {/* Online Visitors Count Section */}
        <SettingsSection
          title="عرض الزوار المتصلين"
          icon={UserGroupIcon}
          enabled={settings.onlineVisitorsEnabled === true}
          onToggle={(enabled) => updateSetting('onlineVisitorsEnabled', enabled)}
        >
          <SelectSetting
            label="نوع العدد"
            value={settings.onlineVisitorsType || 'fake'}
            onChange={(value) => updateSetting('onlineVisitorsType', value)}
            options={[
              { value: 'real', label: 'عدد حقيقي (Real-time tracking)' },
              { value: 'fake', label: 'عدد عشوائي/مزيف' },
            ]}
            disabled={!settings.onlineVisitorsEnabled}
          />
          {settings.onlineVisitorsType === 'fake' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحد الأدنى
                </label>
                <input
                  type="number"
                  value={settings.onlineVisitorsMin || 5}
                  onChange={(e) => updateSetting('onlineVisitorsMin', parseInt(e.target.value))}
                  disabled={!settings.onlineVisitorsEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحد الأقصى
                </label>
                <input
                  type="number"
                  value={settings.onlineVisitorsMax || 50}
                  onChange={(e) => updateSetting('onlineVisitorsMax', parseInt(e.target.value))}
                  disabled={!settings.onlineVisitorsEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فترة التحديث (بالثواني)
            </label>
            <input
              type="number"
              value={settings.onlineVisitorsUpdateInterval || 30}
              onChange={(e) => updateSetting('onlineVisitorsUpdateInterval', parseInt(e.target.value))}
              disabled={!settings.onlineVisitorsEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نص العرض (استخدم {`{count}`} للعدد)
            </label>
            <input
              type="text"
              value={settings.onlineVisitorsText || '{count} شخص يشاهدون هذا المنتج الآن'}
              onChange={(e) => updateSetting('onlineVisitorsText', e.target.value)}
              disabled={!settings.onlineVisitorsEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="{count} شخص يشاهدون هذا المنتج الآن"
            />
          </div>
        </SettingsSection>

        {/* Estimated Delivery Time Section */}
        <SettingsSection
          title="وقت التوصيل المتوقع"
          icon={TruckIcon}
          enabled={settings.estimatedDeliveryEnabled === true}
          onToggle={(enabled) => updateSetting('estimatedDeliveryEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار في صفحة المنتج"
            value={settings.estimatedDeliveryShowOnProduct !== false}
            onChange={(value) => updateSetting('estimatedDeliveryShowOnProduct', value)}
            disabled={!settings.estimatedDeliveryEnabled}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نص العرض (استخدم {`{time}`} لوقت التوصيل)
            </label>
            <input
              type="text"
              value={settings.estimatedDeliveryDefaultText || 'التوصيل خلال {time}'}
              onChange={(e) => updateSetting('estimatedDeliveryDefaultText', e.target.value)}
              disabled={!settings.estimatedDeliveryEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="التوصيل خلال {time}"
            />
          </div>
        </SettingsSection>

        {/* FOMO Popup Section */}
        <SettingsSection
          title="نافذة FOMO (Fear of Missing Out)"
          icon={FireIcon}
          enabled={settings.fomoEnabled === true}
          onToggle={(enabled) => updateSetting('fomoEnabled', enabled)}
        >
          <SelectSetting
            label="نوع الرسالة"
            value={settings.fomoType || 'soldCount'}
            onChange={(value) => updateSetting('fomoType', value)}
            options={[
              { value: 'soldCount', label: 'عدد المبيعات' },
              { value: 'visitors', label: 'عدد الزوار' },
              { value: 'stock', label: 'المخزون المتبقي' },
              { value: 'countdown', label: 'العد التنازلي' },
            ]}
            disabled={!settings.fomoEnabled}
          />
          <SelectSetting
            label="متى تظهر"
            value={settings.fomoTrigger || 'time'}
            onChange={(value) => updateSetting('fomoTrigger', value)}
            options={[
              { value: 'time', label: 'بعد وقت محدد' },
              { value: 'scroll', label: 'عند التمرير' },
              { value: 'exit', label: 'عند محاولة الخروج' },
            ]}
            disabled={!settings.fomoEnabled}
          />
          {settings.fomoTrigger === 'time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تأخير الظهور (بالثواني)
              </label>
              <input
                type="number"
                value={settings.fomoDelay || 30}
                onChange={(e) => updateSetting('fomoDelay', parseInt(e.target.value))}
                disabled={!settings.fomoEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={5}
                max={300}
              />
            </div>
          )}
          {settings.fomoTrigger === 'scroll' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نسبة التمرير (0-100%)
              </label>
              <input
                type="number"
                value={settings.fomoDelay || 30}
                onChange={(e) => updateSetting('fomoDelay', parseInt(e.target.value))}
                disabled={!settings.fomoEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={10}
                max={100}
              />
            </div>
          )}
          <ToggleSetting
            label="إظهار مرة واحدة لكل جلسة"
            value={settings.fomoShowOncePerSession !== false}
            onChange={(value) => updateSetting('fomoShowOncePerSession', value)}
            disabled={!settings.fomoEnabled}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رسالة مخصصة (اختياري)
            </label>
            <textarea
              value={settings.fomoMessage || ''}
              onChange={(e) => updateSetting('fomoMessage', e.target.value)}
              disabled={!settings.fomoEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="رسالة FOMO مخصصة..."
            />
          </div>
        </SettingsSection>

        {/* Product Page Layout Order Section */}
        <SettingsSection
          title="ترتيب صفحة المنتج"
          icon={ArrowsUpDownIcon}
          enabled={settings.productPageLayoutEnabled ?? false}
          onToggle={(enabled) => updateSetting('productPageLayoutEnabled', enabled)}
        >
          {(() => {
            // تعريف جميع العناصر مع الترتيب الافتراضي
            const defaultOrder = [
              'title',
              'category',
              'socialSharing',
              'badges',
              'price',
              'countdown',
              'stockStatus',
              'stockProgress',
              'backInStock',
              'securityBadges',
              'soldNumber',
              'onlineVisitors',
              'estimatedDelivery',
              'freeShipping',
              'preOrder',
              'variants',
              'sizeGuide',
              'quantity',
              'volumeDiscounts',
              'reasonsToPurchase',
              'actions',
              'tabs',
              'description',
              'sku',
              'checkoutForm'
            ];

            // جلب الترتيب المحفوظ أو استخدام الافتراضي
            let currentOrder: string[] = defaultOrder;
            try {
              if (settings.productPageOrder) {
                const parsed = typeof settings.productPageOrder === 'string'
                  ? JSON.parse(settings.productPageOrder)
                  : settings.productPageOrder;
                if (Array.isArray(parsed) && parsed.length > 0) {
                  currentOrder = parsed;
                }
              }
            } catch (e) {
              console.error('Error parsing productPageOrder:', e);
            }

            // إنشاء قائمة العناصر مع الترتيب الحالي
            const elementMap: Record<string, { label: string; settingKey: string }> = {
              'title': { label: 'عرض العنوان', settingKey: 'productPageShowTitle' },
              'category': { label: 'عرض الفئة', settingKey: 'productPageShowCategory' },
              'socialSharing': { label: 'عرض المشاركة الاجتماعية', settingKey: 'productPageShowSocialSharing' },
              'badges': { label: 'عرض شارات المنتج', settingKey: 'productPageShowBadges' },
              'price': { label: 'عرض السعر', settingKey: 'productPageShowPrice' },
              'countdown': { label: 'عرض العد التنازلي', settingKey: 'productPageShowCountdown' },
              'stockStatus': { label: 'عرض حالة المخزون', settingKey: 'productPageShowStockStatus' },
              'stockProgress': { label: 'عرض شريط تقدم المخزون', settingKey: 'productPageShowStockProgress' },
              'backInStock': { label: 'عرض إشعار عودة المنتج', settingKey: 'productPageShowBackInStock' },
              'securityBadges': { label: 'عرض شارات الأمان', settingKey: 'productPageShowSecurityBadges' },
              'soldNumber': { label: 'عرض عدد المبيعات', settingKey: 'productPageShowSoldNumber' },
              'onlineVisitors': { label: 'عرض عدد الزوار', settingKey: 'productPageShowOnlineVisitors' },
              'estimatedDelivery': { label: 'عرض وقت التوصيل المتوقع', settingKey: 'productPageShowEstimatedDelivery' },
              'freeShipping': { label: 'عرض بانر الشحن المجاني', settingKey: 'productPageShowFreeShipping' },
              'preOrder': { label: 'عرض زر الطلب المسبق', settingKey: 'productPageShowPreOrder' },
              'variants': { label: 'عرض الخيارات (الألوان/المقاسات)', settingKey: 'productPageShowVariants' },
              'sizeGuide': { label: 'عرض دليل المقاسات', settingKey: 'productPageShowSizeGuide' },
              'quantity': { label: 'عرض الكمية', settingKey: 'productPageShowQuantity' },
              'volumeDiscounts': { label: 'عرض خصومات الكمية', settingKey: 'productPageShowVolumeDiscounts' },
              'reasonsToPurchase': { label: 'عرض أسباب الشراء', settingKey: 'productPageShowReasonsToPurchase' },
              'actions': { label: 'عرض أزرار الإجراءات', settingKey: 'productPageShowActions' },
              'tabs': { label: 'عرض التبويبات', settingKey: 'productPageShowTabs' },
              'description': { label: 'عرض الوصف', settingKey: 'productPageShowDescription' },
              'sku': { label: 'عرض رمز المنتج (SKU)', settingKey: 'productPageShowSKU' },
              'checkoutForm': { label: 'عرض نموذج الطلب', settingKey: 'productPageShowCheckoutForm' }
            };

            // إضافة أي عناصر جديدة غير موجودة في الترتيب الحالي
            const allElementIds = Object.keys(elementMap);
            const missingElements = allElementIds.filter(id => !currentOrder.includes(id));
            currentOrder = [...currentOrder, ...missingElements];

            // إنشاء قائمة العناصر مع حالة التفعيل
            const elements: ProductPageElement[] = currentOrder
              .filter(id => elementMap[id]) // فقط العناصر المعرفة
              .map(id => ({
                id,
                label: elementMap[id].label,
                enabled: (settings as any)[elementMap[id].settingKey] ?? true
              }));

            return (
              <SortableProductPageElements
                elements={elements}
                onOrderChange={(newOrder) => {
                  updateSetting('productPageOrder', JSON.stringify(newOrder));
                }}
                onToggle={(id, enabled) => {
                  const settingKey = elementMap[id]?.settingKey;
                  if (settingKey) {
                    updateSetting(settingKey as keyof StorefrontSettings, enabled);
                  }
                }}
                disabled={!settings.productPageLayoutEnabled}
              />
            );
          })()}
        </SettingsSection>

        {/* SEO Section */}
        <SettingsSection
          title="تحسين محركات البحث (SEO)"
          icon={GlobeAltIcon}
          enabled={settings.seoEnabled}
          onToggle={(enabled) => updateSetting('seoEnabled', enabled)}
        >
          <ToggleSetting
            label="Meta Description"
            value={settings.seoMetaDescription}
            onChange={(value) => updateSetting('seoMetaDescription', value)}
            disabled={!settings.seoEnabled}
          />
          <ToggleSetting
            label="Structured Data"
            value={settings.seoStructuredData}
            onChange={(value) => updateSetting('seoStructuredData', value)}
            disabled={!settings.seoEnabled}
          />
          <ToggleSetting
            label="Sitemap"
            value={settings.seoSitemap}
            onChange={(value) => updateSetting('seoSitemap', value)}
            disabled={!settings.seoEnabled}
          />
          <ToggleSetting
            label="Open Graph"
            value={settings.seoOpenGraph}
            onChange={(value) => updateSetting('seoOpenGraph', value)}
            disabled={!settings.seoEnabled}
          />
        </SettingsSection>

        {/* Multi-language Section */}
        <SettingsSection
          title="دعم متعدد اللغات"
          icon={LanguageIcon}
          enabled={settings.multiLanguageEnabled}
          onToggle={(enabled) => updateSetting('multiLanguageEnabled', enabled)}
        >
          <SelectSetting
            label="اللغة الافتراضية"
            value={settings.defaultLanguage}
            onChange={(value) => updateSetting('defaultLanguage', value)}
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
            ]}
            disabled={!settings.multiLanguageEnabled}
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اللغات المدعومة
            </label>
            <div className="space-y-2">
              {['ar', 'en', 'fr'].map((lang) => (
                <label key={lang} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.supportedLanguages?.includes(lang) || false}
                    onChange={(e) => {
                      const current = settings.supportedLanguages || [];
                      const updated = e.target.checked
                        ? [...current, lang]
                        : current.filter((l) => l !== lang);
                      updateSetting('supportedLanguages', updated);
                    }}
                    disabled={!settings.multiLanguageEnabled}
                    className="mr-2"
                  />
                  <span className={settings.multiLanguageEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>
                    {lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'Français'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Save Button at Bottom */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-indigo-500/25"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
};

// Helper Components
interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon: Icon, enabled, onToggle, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 ml-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
        </label>
      </div>
      <div className={`space-y-4 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
};

interface ToggleSettingProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, value, onChange, disabled }) => {
  // Ensure value is always a boolean to prevent controlled/uncontrolled warning
  const checkedValue = value ?? false;
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm font-medium ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checkedValue}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 peer-disabled:opacity-50"></div>
      </label>
    </div>
  );
};

interface NumberSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

const NumberSetting: React.FC<NumberSettingProps> = ({ label, value, onChange, min, max, disabled }) => {
  // Ensure value is always a number to prevent controlled/uncontrolled warning
  const numValue = value ?? min ?? 0;
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </label>
      <input
        type="number"
        value={numValue}
        onChange={(e) => {
          const num = parseInt(e.target.value) || min || 0;
          const clamped = Math.max(min || 0, Math.min(max || 1000, num));
          onChange(clamped);
        }}
        min={min}
        max={max}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
      />
    </div>
  );
};

interface SelectSettingProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const SelectSetting: React.FC<SelectSettingProps> = ({ label, value, onChange, options, disabled }) => {
  // Ensure value is always a string to prevent controlled/uncontrolled warning
  const stringValue = value ?? (options[0]?.value || '');
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </label>
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StorefrontFeaturesSettings;


