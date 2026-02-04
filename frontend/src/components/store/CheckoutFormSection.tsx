import React from 'react';
import {
  ClipboardDocumentCheckIcon,
  UserIcon,
  MapPinIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CheckoutFormSettings } from '../../services/checkoutFormSettingsService';

interface CheckoutFormSectionProps {
  settings: Partial<CheckoutFormSettings>;
  onChange: (settings: Partial<CheckoutFormSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  loading?: boolean;
}

export const CheckoutFormSection: React.FC<CheckoutFormSectionProps> = ({
  settings,
  onChange,
  onSave,
  onReset,
  loading = false
}) => {
  const handleToggle = (field: keyof CheckoutFormSettings, value: boolean) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 ml-2" />
            إعدادات فورم الشيك أوت
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تحكم في الحلقول التي تظهر للعملاء عند إتمام الطلب
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={loading}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          إعادة تعيين
        </button>
      </div>

      {/* Customer Information Section */}
      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-6 border border-transparent dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />
          معلومات العميل
        </h4>

        <div className="space-y-4">
          {/* Guest Name */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">الاسم الكامل</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">اسم العميل الكامل</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showGuestName ?? true}
                  onChange={(e) => handleToggle('showGuestName', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">إظهار</span>
              </label>
              {settings.showGuestName && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireGuestName ?? true}
                    onChange={(e) => handleToggle('requireGuestName', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-indigo-600 focus:ring-indigo-500 ml-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">مطلوب</span>
                </label>
              )}
            </div>
          </div>

          {/* Guest Phone */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">رقم الهاتف</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">رقم هاتف العميل</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showGuestPhone ?? true}
                  onChange={(e) => handleToggle('showGuestPhone', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
              {settings.showGuestPhone && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireGuestPhone ?? true}
                    onChange={(e) => handleToggle('requireGuestPhone', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                  />
                  <span className="text-sm text-gray-700">مطلوب</span>
                </label>
              )}
            </div>
          </div>

          {/* Guest Email */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">البريد الإلكتروني</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">البريد الإلكتروني للعميل</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showGuestEmail ?? true}
                  onChange={(e) => handleToggle('showGuestEmail', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
              {settings.showGuestEmail && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireGuestEmail ?? false}
                    onChange={(e) => handleToggle('requireGuestEmail', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                  />
                  <span className="text-sm text-gray-700">مطلوب</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Address Section */}
      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-6 border border-transparent dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <MapPinIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />
          عنوان الشحن
        </h4>

        <div className="space-y-4">
          {/* City */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">المدينة</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مدينة العميل</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showCity ?? true}
                  onChange={(e) => handleToggle('showCity', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
              {settings.showCity && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireCity ?? true}
                    onChange={(e) => handleToggle('requireCity', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                  />
                  <span className="text-sm text-gray-700">مطلوب</span>
                </label>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">العنوان التفصيلي</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">العنوان الكامل للشحن</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showShippingAddress ?? true}
                  onChange={(e) => handleToggle('showShippingAddress', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
              {settings.showShippingAddress && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireShippingAddress ?? true}
                    onChange={(e) => handleToggle('requireShippingAddress', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                  />
                  <span className="text-sm text-gray-700">مطلوب</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Fields Section */}
      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-6 border border-transparent dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <PlusIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />
          حقول إضافية
        </h4>

        <div className="space-y-4">
          {/* Payment Method */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">طريقة الدفع</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">خيارات الدفع المتاحة</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPaymentMethod ?? true}
                  onChange={(e) => handleToggle('showPaymentMethod', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">ملاحظات إضافية</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">حقل للملاحظات الخاصة بالطلب</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotes ?? true}
                  onChange={(e) => handleToggle('showNotes', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                />
                <span className="text-sm text-gray-700">إظهار</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};
