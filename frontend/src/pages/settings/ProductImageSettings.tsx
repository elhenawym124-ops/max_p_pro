import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassPlusIcon,
  PlayIcon,
  DevicePhoneMobileIcon,
  ArrowPathIcon,
  SparklesIcon,
  SwatchIcon,
  Squares2X2Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { storefrontSettingsService, StorefrontSettings, StorefrontSettingsUpdate } from '../../services/storefrontSettingsService';

// ==========================================
// 🎨 Reusable Setting Components
// ==========================================

interface ToggleSettingProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        value ? 'bg-indigo-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

interface SelectSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const SelectSetting: React.FC<SelectSettingProps> = ({ label, description, value, onChange, options, disabled }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

interface NumberSettingProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

const NumberSetting: React.FC<NumberSettingProps> = ({ 
  label, description, value, onChange, min = 0, max = 100, step = 1, unit, disabled 
}) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  </div>
);

interface ColorSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ColorSetting: React.FC<ColorSettingProps> = ({ label, description, value, onChange, disabled }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value?.startsWith('rgba') ? '#000000' : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="#000000 أو rgba(0,0,0,0.9)"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
      />
    </div>
  </div>
);

// ==========================================
// 📦 Section Component
// ==========================================

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  description?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  icon: Icon,
  description,
  enabled,
  onToggle,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled !== false ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(!enabled);
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
          <ChevronRightIcon
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </div>
      </div>
      {isOpen && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🖼️ Main Component
// ==========================================

const ProductImageSettings: React.FC = () => {
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
      const settingsData = response.data?.data || response.data;
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await storefrontSettingsService.updateSettings(settings as StorefrontSettingsUpdate);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof StorefrontSettings>(key: K, value: StorefrontSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">فشل تحميل الإعدادات</p>
        <button onClick={loadSettings} className="mt-4 text-indigo-600 hover:text-indigo-800">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <PhotoIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إعدادات صور المنتج</h1>
              <p className="text-gray-500 text-sm">تخصيص طريقة عرض الصور في صفحة المنتج</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                جاري الحفظ...
              </>
            ) : (
              'حفظ الإعدادات'
            )}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* 1. Gallery Layout */}
        <SettingsSection
          title="تخطيط معرض الصور"
          icon={Squares2X2Icon}
          description="تحديد موقع وشكل الصور المصغرة"
          defaultOpen={true}
        >
          <SelectSetting
            label="موقع الصور المصغرة"
            description="تحديد مكان عرض الصور المصغرة بالنسبة للصورة الرئيسية"
            value={settings.galleryLayout || 'bottom'}
            onChange={(value) => updateSetting('galleryLayout', value as any)}
            options={[
              { value: 'bottom', label: 'أسفل الصورة' },
              { value: 'left', label: 'يسار الصورة' },
              { value: 'right', label: 'يمين الصورة' },
              { value: 'top', label: 'أعلى الصورة' },
              { value: 'grid', label: 'شبكة (Grid)' },
            ]}
          />
          <SelectSetting
            label="نمط العرض"
            value={settings.galleryStyle || 'slider'}
            onChange={(value) => updateSetting('galleryStyle', value as any)}
            options={[
              { value: 'slider', label: 'سلايدر' },
              { value: 'grid', label: 'شبكة' },
              { value: 'vertical-scroll', label: 'تمرير عمودي' },
            ]}
          />
          <SelectSetting
            label="حجم الصور المصغرة"
            value={settings.thumbnailSize || 'medium'}
            onChange={(value) => updateSetting('thumbnailSize', value as any)}
            options={[
              { value: 'small', label: 'صغير (60px)' },
              { value: 'medium', label: 'متوسط (80px)' },
              { value: 'large', label: 'كبير (100px)' },
            ]}
          />
          <NumberSetting
            label="عدد الصور في الصف"
            value={settings.thumbnailsPerRow || 4}
            onChange={(value) => updateSetting('thumbnailsPerRow', value)}
            min={3}
            max={8}
          />
          <NumberSetting
            label="المسافة بين الصور"
            value={settings.thumbnailSpacing || 8}
            onChange={(value) => updateSetting('thumbnailSpacing', value)}
            min={0}
            max={24}
            unit="px"
          />
          <NumberSetting
            label="استدارة حواف الصور المصغرة"
            value={settings.thumbnailBorderRadius || 8}
            onChange={(value) => updateSetting('thumbnailBorderRadius', value)}
            min={0}
            max={24}
            unit="px"
          />
          <SelectSetting
            label="نسبة أبعاد الصورة الرئيسية"
            value={settings.mainImageAspectRatio || '1:1'}
            onChange={(value) => updateSetting('mainImageAspectRatio', value as any)}
            options={[
              { value: '1:1', label: 'مربع (1:1)' },
              { value: '4:3', label: 'أفقي (4:3)' },
              { value: '3:4', label: 'عمودي (3:4)' },
              { value: '16:9', label: 'عريض (16:9)' },
              { value: 'auto', label: 'تلقائي' },
            ]}
          />
        </SettingsSection>

        {/* 2. Slider/Carousel */}
        <SettingsSection
          title="السلايدر والتنقل"
          icon={ArrowsPointingOutIcon}
          description="إعدادات التنقل بين الصور"
          enabled={settings.sliderEnabled}
          onToggle={(enabled) => updateSetting('sliderEnabled', enabled)}
        >
          <ToggleSetting
            label="تشغيل تلقائي"
            description="التنقل التلقائي بين الصور"
            value={settings.sliderAutoplay || false}
            onChange={(value) => updateSetting('sliderAutoplay', value)}
            disabled={!settings.sliderEnabled}
          />
          <NumberSetting
            label="سرعة التشغيل التلقائي"
            description="المدة بين كل صورة والأخرى"
            value={settings.sliderAutoplaySpeed || 3000}
            onChange={(value) => updateSetting('sliderAutoplaySpeed', value)}
            min={1000}
            max={10000}
            step={500}
            unit="مللي ثانية"
            disabled={!settings.sliderEnabled || !settings.sliderAutoplay}
          />
          <ToggleSetting
            label="إظهار الأسهم"
            description="أسهم التنقل يمين ويسار"
            value={Boolean(settings.sliderShowArrows)}
            onChange={(value) => updateSetting('sliderShowArrows', value)}
            disabled={!settings.sliderEnabled}
          />
          <ToggleSetting
            label="إظهار النقاط"
            description="نقاط التنقل أسفل الصورة"
            value={settings.sliderShowDots || false}
            onChange={(value) => updateSetting('sliderShowDots', value)}
            disabled={!settings.sliderEnabled}
          />
          <ToggleSetting
            label="تكرار لا نهائي"
            description="العودة للصورة الأولى بعد الأخيرة"
            value={Boolean(settings.sliderInfiniteLoop)}
            onChange={(value) => updateSetting('sliderInfiniteLoop', value)}
            disabled={!settings.sliderEnabled}
          />
          <SelectSetting
            label="تأثير الانتقال"
            value={settings.sliderTransitionEffect || 'slide'}
            onChange={(value) => updateSetting('sliderTransitionEffect', value as any)}
            options={[
              { value: 'slide', label: 'انزلاق (Slide)' },
              { value: 'fade', label: 'تلاشي (Fade)' },
              { value: 'flip', label: 'قلب (Flip)' },
              { value: 'cube', label: 'مكعب (Cube)' },
            ]}
            disabled={!settings.sliderEnabled}
          />
          <NumberSetting
            label="سرعة الانتقال"
            value={settings.sliderTransitionSpeed || 300}
            onChange={(value) => updateSetting('sliderTransitionSpeed', value)}
            min={100}
            max={1000}
            step={50}
            unit="مللي ثانية"
            disabled={!settings.sliderEnabled}
          />
        </SettingsSection>

        {/* 3. Image Zoom */}
        <SettingsSection
          title="تكبير الصور"
          icon={MagnifyingGlassPlusIcon}
          description="إعدادات تكبير الصور عند التمرير أو النقر"
          enabled={settings.imageZoomEnabled}
          onToggle={(enabled) => updateSetting('imageZoomEnabled', enabled)}
        >
          <SelectSetting
            label="طريقة التكبير"
            value={settings.imageZoomType || 'hover'}
            onChange={(value) => updateSetting('imageZoomType', value as any)}
            options={[
              { value: 'hover', label: 'عند التمرير (Hover)' },
              { value: 'click', label: 'عند النقر (Click)' },
              { value: 'both', label: 'الاثنان معاً' },
            ]}
            disabled={!settings.imageZoomEnabled}
          />
          <SelectSetting
            label="نمط التكبير"
            description="شكل نافذة التكبير"
            value={settings.zoomStyle || 'side'}
            onChange={(value) => updateSetting('zoomStyle', value as any)}
            options={[
              { value: 'lens', label: 'عدسة مكبرة (Lens)' },
              { value: 'side', label: 'نافذة جانبية (Side)' },
              { value: 'inner', label: 'داخل الصورة (Inner)' },
              { value: 'fullscreen', label: 'ملء الشاشة (Fullscreen)' },
            ]}
            disabled={!settings.imageZoomEnabled}
          />
          <SelectSetting
            label="شكل العدسة"
            value={settings.zoomLensShape || 'square'}
            onChange={(value) => updateSetting('zoomLensShape', value as any)}
            options={[
              { value: 'circle', label: 'دائرية' },
              { value: 'square', label: 'مربعة' },
            ]}
            disabled={!settings.imageZoomEnabled || settings.zoomStyle !== 'lens'}
          />
          <NumberSetting
            label="حجم العدسة"
            value={settings.zoomLensSize || 150}
            onChange={(value) => updateSetting('zoomLensSize', value)}
            min={50}
            max={300}
            unit="px"
            disabled={!settings.imageZoomEnabled || settings.zoomStyle !== 'lens'}
          />
          <NumberSetting
            label="مستوى التكبير"
            description="كم مرة يتم تكبير الصورة"
            value={settings.zoomLevel || 2.5}
            onChange={(value) => updateSetting('zoomLevel', value)}
            min={1.5}
            max={5}
            step={0.5}
            unit="x"
            disabled={!settings.imageZoomEnabled}
          />
          <SelectSetting
            label="موقع نافذة التكبير"
            value={settings.zoomWindowPosition || 'right'}
            onChange={(value) => updateSetting('zoomWindowPosition', value as any)}
            options={[
              { value: 'right', label: 'يمين' },
              { value: 'left', label: 'يسار' },
              { value: 'top', label: 'أعلى' },
              { value: 'bottom', label: 'أسفل' },
            ]}
            disabled={!settings.imageZoomEnabled || settings.zoomStyle !== 'side'}
          />
          <NumberSetting
            label="حجم نافذة التكبير"
            value={settings.zoomWindowSize || 400}
            onChange={(value) => updateSetting('zoomWindowSize', value)}
            min={200}
            max={600}
            unit="px"
            disabled={!settings.imageZoomEnabled || settings.zoomStyle !== 'side'}
          />
          <ToggleSetting
            label="تكبير بعجلة الماوس"
            description="استخدام عجلة الماوس للتكبير والتصغير"
            value={settings.mouseWheelZoom || false}
            onChange={(value) => updateSetting('mouseWheelZoom', value)}
            disabled={!settings.imageZoomEnabled}
          />
        </SettingsSection>

        {/* 4. Lightbox */}
        <SettingsSection
          title="العرض الكامل (Lightbox)"
          icon={ArrowsPointingOutIcon}
          description="إعدادات عرض الصور بملء الشاشة"
          enabled={settings.lightboxEnabled}
          onToggle={(enabled) => updateSetting('lightboxEnabled', enabled)}
        >
          <ToggleSetting
            label="إظهار الصور المصغرة"
            description="عرض الصور المصغرة داخل Lightbox"
            value={Boolean(settings.lightboxShowThumbnails)}
            onChange={(value) => updateSetting('lightboxShowThumbnails', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ToggleSetting
            label="إظهار الأسهم"
            description="أسهم التنقل بين الصور"
            value={Boolean(settings.lightboxShowArrows)}
            onChange={(value) => updateSetting('lightboxShowArrows', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ToggleSetting
            label="إظهار العداد"
            description="عرض رقم الصورة الحالية من إجمالي الصور"
            value={Boolean(settings.lightboxShowCounter)}
            onChange={(value) => updateSetting('lightboxShowCounter', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ToggleSetting
            label="تفعيل التكبير"
            description="إمكانية تكبير الصورة داخل Lightbox"
            value={Boolean(settings.lightboxZoomEnabled)}
            onChange={(value) => updateSetting('lightboxZoomEnabled', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ToggleSetting
            label="التنقل بالكيبورد"
            description="استخدام أسهم الكيبورد للتنقل"
            value={Boolean(settings.lightboxKeyboardNav)}
            onChange={(value) => updateSetting('lightboxKeyboardNav', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ColorSetting
            label="لون الخلفية"
            value={settings.lightboxBackgroundColor || 'rgba(0,0,0,0.9)'}
            onChange={(value) => updateSetting('lightboxBackgroundColor', value)}
            disabled={!settings.lightboxEnabled}
          />
          <ToggleSetting
            label="إغلاق بالنقر على الخلفية"
            value={Boolean(settings.lightboxCloseOnOverlay)}
            onChange={(value) => updateSetting('lightboxCloseOnOverlay', value)}
            disabled={!settings.lightboxEnabled}
          />
        </SettingsSection>

        {/* 5. Product Videos */}
        <SettingsSection
          title="فيديوهات المنتج"
          icon={PlayIcon}
          description="إعدادات عرض الفيديو في معرض الصور"
          enabled={settings.productVideosEnabled}
          onToggle={(enabled) => updateSetting('productVideosEnabled', enabled)}
        >
          <ToggleSetting
            label="تشغيل تلقائي"
            value={settings.videoAutoplay || false}
            onChange={(value) => updateSetting('videoAutoplay', value)}
            disabled={!settings.productVideosEnabled}
          />
          <ToggleSetting
            label="كتم الصوت"
            description="بدء الفيديو بدون صوت"
            value={Boolean(settings.videoMuted)}
            onChange={(value) => updateSetting('videoMuted', value)}
            disabled={!settings.productVideosEnabled}
          />
          <ToggleSetting
            label="إظهار عناصر التحكم"
            value={Boolean(settings.videoShowControls)}
            onChange={(value) => updateSetting('videoShowControls', value)}
            disabled={!settings.productVideosEnabled}
          />
          <SelectSetting
            label="وضع التشغيل"
            value={settings.videoPlayMode || 'inline'}
            onChange={(value) => updateSetting('videoPlayMode', value as any)}
            options={[
              { value: 'inline', label: 'داخل المعرض' },
              { value: 'popup', label: 'نافذة منبثقة' },
            ]}
            disabled={!settings.productVideosEnabled}
          />
          <SelectSetting
            label="موقع الفيديو"
            description="ترتيب الفيديو في المعرض"
            value={settings.videoPosition || 'end'}
            onChange={(value) => updateSetting('videoPosition', value as any)}
            options={[
              { value: 'start', label: 'في البداية' },
              { value: 'end', label: 'في النهاية' },
              { value: 'default', label: 'حسب الترتيب الأصلي' },
            ]}
            disabled={!settings.productVideosEnabled}
          />
          <ToggleSetting
            label="أيقونة الفيديو"
            description="إظهار أيقونة تشغيل على صورة الفيديو المصغرة"
            value={Boolean(settings.videoThumbnailIcon)}
            onChange={(value) => updateSetting('videoThumbnailIcon', value)}
            disabled={!settings.productVideosEnabled}
          />
        </SettingsSection>

        {/* 6. Variation Images */}
        <SettingsSection
          title="صور المتغيرات"
          icon={SwatchIcon}
          description="تغيير الصور عند اختيار لون أو مقاس مختلف"
          enabled={settings.variationImagesEnabled}
          onToggle={(enabled) => updateSetting('variationImagesEnabled', enabled)}
        >
          <SelectSetting
            label="سلوك التغيير"
            description="ماذا يحدث عند اختيار متغير"
            value={settings.variationImagesBehavior || 'replace'}
            onChange={(value) => updateSetting('variationImagesBehavior', value as any)}
            options={[
              { value: 'replace', label: 'استبدال كل الصور' },
              { value: 'add', label: 'إضافة للصور الحالية' },
              { value: 'highlight', label: 'تمييز الصورة المطابقة' },
            ]}
            disabled={!settings.variationImagesEnabled}
          />
          <SelectSetting
            label="تأثير التغيير"
            value={settings.variationImagesAnimation || 'fade'}
            onChange={(value) => updateSetting('variationImagesAnimation', value as any)}
            options={[
              { value: 'fade', label: 'تلاشي' },
              { value: 'slide', label: 'انزلاق' },
              { value: 'none', label: 'بدون تأثير' },
            ]}
            disabled={!settings.variationImagesEnabled}
          />
        </SettingsSection>

        {/* 7. Mobile Settings */}
        <SettingsSection
          title="إعدادات الموبايل"
          icon={DevicePhoneMobileIcon}
          description="تخصيص تجربة عرض الصور على الهاتف"
        >
          <ToggleSetting
            label="تفعيل السحب (Swipe)"
            description="التنقل بين الصور بالسحب"
            value={Boolean(settings.mobileSwipeEnabled)}
            onChange={(value) => updateSetting('mobileSwipeEnabled', value)}
          />
          <ToggleSetting
            label="تكبير بإصبعين (Pinch Zoom)"
            value={Boolean(settings.mobilePinchZoom)}
            onChange={(value) => updateSetting('mobilePinchZoom', value)}
          />
          <ToggleSetting
            label="ملء الشاشة بالنقر"
            description="فتح الصورة بملء الشاشة عند النقر"
            value={Boolean(settings.mobileFullscreenOnTap)}
            onChange={(value) => updateSetting('mobileFullscreenOnTap', value)}
          />
          <SelectSetting
            label="تخطيط الموبايل"
            value={settings.mobileGalleryLayout || 'slider'}
            onChange={(value) => updateSetting('mobileGalleryLayout', value as any)}
            options={[
              { value: 'slider', label: 'سلايدر' },
              { value: 'vertical', label: 'عمودي' },
              { value: 'grid', label: 'شبكة' },
            ]}
          />
          <ToggleSetting
            label="إظهار الصور المصغرة"
            description="عرض الصور المصغرة على الموبايل"
            value={settings.mobileShowThumbnails || false}
            onChange={(value) => updateSetting('mobileShowThumbnails', value)}
          />
        </SettingsSection>

        {/* 8. 360° View */}
        <SettingsSection
          title="عرض 360°"
          icon={ArrowPathIcon}
          description="عرض المنتج بزاوية 360 درجة"
          enabled={settings.view360Enabled}
          onToggle={(enabled) => updateSetting('view360Enabled', enabled)}
        >
          <ToggleSetting
            label="دوران تلقائي"
            value={Boolean(settings.view360AutoRotate)}
            onChange={(value) => updateSetting('view360AutoRotate', value)}
            disabled={!settings.view360Enabled}
          />
          <NumberSetting
            label="سرعة الدوران"
            value={settings.view360RotateSpeed || 5}
            onChange={(value) => updateSetting('view360RotateSpeed', value)}
            min={1}
            max={10}
            disabled={!settings.view360Enabled}
          />
          <ToggleSetting
            label="إظهار عناصر التحكم"
            value={Boolean(settings.view360ShowControls)}
            onChange={(value) => updateSetting('view360ShowControls', value)}
            disabled={!settings.view360Enabled}
          />
        </SettingsSection>

        {/* 9. Visual Effects */}
        <SettingsSection
          title="التأثيرات البصرية"
          icon={SparklesIcon}
          description="تأثيرات وتحسينات بصرية للصور"
        >
          <SelectSetting
            label="تأثير التمرير"
            description="تأثير عند تمرير الماوس على الصورة"
            value={settings.imageHoverEffect || 'zoom'}
            onChange={(value) => updateSetting('imageHoverEffect', value as any)}
            options={[
              { value: 'none', label: 'بدون تأثير' },
              { value: 'zoom', label: 'تكبير خفيف' },
              { value: 'brightness', label: 'زيادة السطوع' },
              { value: 'shadow', label: 'ظل' },
            ]}
          />
          <NumberSetting
            label="استدارة الصورة الرئيسية"
            value={settings.imageBorderRadius || 8}
            onChange={(value) => updateSetting('imageBorderRadius', value)}
            min={0}
            max={32}
            unit="px"
          />
          <ToggleSetting
            label="ظل الصورة"
            description="إضافة ظل خفيف للصورة"
            value={Boolean(settings.imageShadow)}
            onChange={(value) => updateSetting('imageShadow', value)}
          />
          <SelectSetting
            label="تأثير التحميل"
            description="ما يظهر أثناء تحميل الصورة"
            value={settings.imageLoadingEffect || 'skeleton'}
            onChange={(value) => updateSetting('imageLoadingEffect', value as any)}
            options={[
              { value: 'blur', label: 'ضبابي (Blur)' },
              { value: 'skeleton', label: 'هيكل (Skeleton)' },
              { value: 'spinner', label: 'دائرة تحميل' },
            ]}
          />
        </SettingsSection>
      </div>

      {/* Save Button (Bottom) */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              جاري الحفظ...
            </>
          ) : (
            'حفظ جميع الإعدادات'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductImageSettings;

