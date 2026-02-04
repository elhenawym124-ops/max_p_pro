import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { FooterSettings } from '../../services/footerSettingsService';

interface FooterSettingsSectionProps {
  settings: Partial<FooterSettings>;
  onChange: (settings: Partial<FooterSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  loading: boolean;
}

export const FooterSettingsSection: React.FC<FooterSettingsSectionProps> = ({
  settings,
  onChange,
  onSave,
  onReset,
  loading,
}) => {
  const handleChange = (field: keyof FooterSettings, value: any) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">إعدادات الفوتر</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تحكم في معلومات الفوتر التي تظهر في المتجر الإلكتروني
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            إعادة تعيين
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      {/* About Store Section */}
      <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-transparent dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-900 dark:text-white">عن المتجر</label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showAboutStore ?? true}
              onChange={(e) => handleChange('showAboutStore', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
            />
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
          </label>
        </div>
        <textarea
          value={settings.aboutStore || ''}
          onChange={(e) => handleChange('aboutStore', e.target.value)}
          rows={4}
          placeholder="نبذة عن المتجر..."
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg space-y-4 border border-transparent dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">معلومات التواصل</h4>

        {/* Email */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showEmail ?? true}
                onChange={(e) => handleChange('showEmail', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
              />
              <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
            </label>
          </div>
          <input
            type="email"
            value={settings.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="info@store.com"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPhone ?? true}
                onChange={(e) => handleChange('showPhone', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
              />
              <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
            </label>
          </div>
          <input
            type="tel"
            value={settings.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+20 123 456 7890"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Address */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showAddress ?? true}
                onChange={(e) => handleChange('showAddress', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
              />
              <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
            </label>
          </div>
          <textarea
            value={settings.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            rows={2}
            placeholder="العنوان الكامل للمتجر..."
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-transparent dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">الروابط السريعة</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              عرض روابط سريعة للصفحات الرئيسية في الفوتر
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showQuickLinks ?? true}
              onChange={(e) => handleChange('showQuickLinks', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
            />
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
          </label>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-transparent dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-900 dark:text-white">حقوق النشر</label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showCopyright ?? true}
              onChange={(e) => handleChange('showCopyright', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 ml-2"
            />
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">عرض</span>
          </label>
        </div>
        <input
          type="text"
          value={settings.copyrightText || ''}
          onChange={(e) => handleChange('copyrightText', e.target.value)}
          placeholder="© 2024 اسم المتجر. جميع الحقوق محفوظة"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
        />
        <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
          <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            سيتم استبدال {'{year}'} بالسنة الحالية تلقائياً
          </p>
        </div>
      </div>

      <div className="bg-gray-800 dark:bg-gray-900 text-white p-6 rounded-lg border border-transparent dark:border-gray-700">
        <h4 className="text-sm font-medium mb-4 text-gray-300">معاينة الفوتر</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          {/* About Store */}
          {settings.showAboutStore && settings.aboutStore && (
            <div>
              <h5 className="font-semibold mb-2">عن المتجر</h5>
              <p className="text-gray-300 text-xs">{settings.aboutStore}</p>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h5 className="font-semibold mb-2">تواصل معنا</h5>
            <div className="space-y-1 text-xs text-gray-300">
              {settings.showEmail && settings.email && (
                <p>📧 {settings.email}</p>
              )}
              {settings.showPhone && settings.phone && (
                <p>📱 {settings.phone}</p>
              )}
              {settings.showAddress && settings.address && (
                <p>📍 {settings.address}</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          {settings.showQuickLinks && (
            <div>
              <h5 className="font-semibold mb-2">روابط سريعة</h5>
              <ul className="space-y-1 text-xs text-gray-300">
                <li>من نحن</li>
                <li>اتصل بنا</li>
                <li>سياسة الخصوصية</li>
              </ul>
            </div>
          )}
        </div>

        {/* Copyright */}
        {settings.showCopyright && settings.copyrightText && (
          <div className="mt-6 pt-4 border-t border-gray-700 dark:border-gray-800 text-center text-xs text-gray-400">
            {settings.copyrightText.replace('{year}', new Date().getFullYear().toString())}
          </div>
        )}
      </div>
    </div>
  );
};
