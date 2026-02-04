import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';
import { useTheme } from '../../hooks/useTheme';
import StoreThemeSettings from './StoreThemeSettings';
import CompanySettings from './CompanySettings';
import {
  Cog6ToothIcon,
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  CreditCardIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';
import { getApiUrl } from '../../config/environment';

interface SettingsTab {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs: SettingsTab[] = [
    {
      id: 'profile',
      name: 'الملف الشخصي',
      icon: UserIcon,
      component: ProfileSettings,
    },
    {
      id: 'company',
      name: 'إعدادات الشركة',
      icon: BuildingOfficeIcon,
      component: CompanySettings,
    },
    {
      id: 'store',
      name: 'إعدادات المتجر',
      icon: BuildingStorefrontIcon,
      component: StoreSettingsRedirect,
    },
    {
      id: 'store-theme',
      name: 'ثيم المتجر',
      icon: SwatchIcon,
      component: StoreThemeSettings,
    },
    {
      id: 'notifications',
      name: 'الإشعارات',
      icon: BellIcon,
      component: NotificationSettings,
    },
    {
      id: 'security',
      name: 'الأمان',
      icon: ShieldCheckIcon,
      component: SecuritySettings,
    },
    {
      id: 'appearance',
      name: 'المظهر',
      icon: PaintBrushIcon,
      component: AppearanceSettings,
    },
    {
      id: 'integrations',
      name: 'التكاملات',
      icon: GlobeAltIcon,
      component: IntegrationSettings,
    },
    {
      id: 'billing',
      name: 'الفواتير',
      icon: CreditCardIcon,
      component: BillingSettings,
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProfileSettings;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          الإعدادات
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة إعدادات الحساب والنظام</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-white dark:bg-gray-800 shadow dark:shadow-md rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">الإعدادات</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 flex items-center ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${activeTab === tab.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 shadow dark:shadow-md rounded-lg">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Settings Component
const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: '',
    timezone: user?.timezone || 'Asia/Riyadh',
    language: 'ar',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          timezone: formData.timezone
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Profile updated successfully:', data.data);
        alert('تم حفظ الإعدادات بنجاح!');
      } else {
        console.error('Failed to update profile:', data.message);
        alert('فشل في حفظ الإعدادات: ' + (data.message || 'خطأ غير معروف'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">الملف الشخصي</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة معلوماتك الشخصية</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الاسم الأول
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الاسم الأخير
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رقم الهاتف
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            placeholder="+966501234567"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المنطقة الزمنية
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="Asia/Riyadh">الرياض (GMT+3)</option>
              <option value="Asia/Dubai">دبي (GMT+4)</option>
              <option value="Africa/Cairo">القاهرة (GMT+2)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اللغة
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMessages: true,
    newOrders: true,
    lowStock: true,
    systemAlerts: true,
  });

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">إعدادات الإشعارات</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تخصيص تفضيلات الإشعارات</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">قنوات الإشعارات</h3>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'إشعارات البريد الإلكتروني' },
              { key: 'pushNotifications', label: 'الإشعارات الفورية' },
              { key: 'smsNotifications', label: 'الرسائل النصية' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">أنواع الإشعارات</h3>
          <div className="space-y-4">
            {[
              { key: 'newMessages', label: 'رسائل جديدة' },
              { key: 'newOrders', label: 'طلبات جديدة' },
              { key: 'lowStock', label: 'تنبيهات المخزون' },
              { key: 'systemAlerts', label: 'تنبيهات النظام' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Security Settings Component
const SecuritySettings: React.FC = () => {
  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">إعدادات الأمان</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة كلمة المرور والأمان</p>
      </div>

      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
          <div className="flex">
            <ShieldCheckIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">تحديث كلمة المرور</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                يُنصح بتحديث كلمة المرور بانتظام لضمان أمان حسابك
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              كلمة المرور الحالية
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            تحديث كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
};

// Appearance Settings Component
const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">إعدادات المظهر</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تخصيص مظهر المنصة</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">المظهر</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: 'light', label: 'فاتح', preview: 'bg-white border text-gray-900' },
              { value: 'dark', label: 'داكن', preview: 'bg-gray-900 border text-white' },
              { value: 'system', label: 'نظام الجهاز', preview: 'bg-gradient-to-br from-white to-gray-900 border text-gray-800' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 ${theme === option.value
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <div className={`h-24 w-full rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 ${option.preview} flex items-center justify-center`}>
                  <span className="text-2xl">Aa</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${theme === option.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {option.label}
                  </span>
                  {theme === option.value && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Integration Settings Component (بدون AI)
const IntegrationSettings: React.FC = () => {
  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">التكاملات</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة التكاملات مع الخدمات الخارجية</p>
      </div>

      {/* Facebook Integration */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">📘</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Facebook Messenger</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">ربط صفحات الفيسبوك لاستقبال الرسائل</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">حالة الاتصال: <span className="text-green-600 dark:text-green-400 font-medium">متصل</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">آخر نشاط: منذ 5 دقائق</p>
          </div>
          <div className="flex space-x-2">
            <a
              href="/settings/facebook"
              className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              الإعدادات اليدوية
            </a>
            <a
              href="/settings/facebook-oauth"
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              الربط الآمن
            </a>
          </div>
        </div>
      </div>

      {/* Other Integrations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">التكاملات الأخرى</h3>
        {[
          { name: 'WhatsApp Business', status: 'غير متصل', color: 'red', link: '#', icon: '💬' },
          { name: 'Google Analytics', status: 'متصل', color: 'green', link: '#', icon: '📊' },
          { name: 'Stripe Payments', status: 'غير متصل', color: 'red', link: '#', icon: '💳' },
          { name: 'Telegram Bot', status: 'إعدادات', color: 'blue', link: '/settings/telegram', icon: '✈️' },
        ].map((integration) => (
          <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{integration.icon}</span>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{integration.name}</h4>
                <p className={`text-sm ${integration.color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {integration.status}
                </p>
              </div>
            </div>
            <a
              href={integration.link}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 inline-block"
            >
              {integration.status === 'متصل' ? 'إعدادات' : 'ربط'}
            </a>
          </div>
        ))}
      </div>

      {/* Integration Note */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex">
          <span className="text-yellow-400 text-lg mr-2">💡</span>
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">ملاحظة مهمة</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              تم إزالة تكامل الذكاء الصناعي من النظام. النظام يعمل الآن بالردود اليدوية فقط.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Billing Settings Component
const BillingSettings: React.FC = () => {
  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">الفواتير والدفع</h2>
        <p className="text-sm text-gray-600 mt-1">إدارة الفواتير وطرق الدفع</p>
      </div>

      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CreditCardIcon className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-800">الاشتراك النشط</h3>
              <p className="text-sm text-green-700 mt-1">
                باقة متقدم - 299 ريال/شهر - تجديد في 15 فبراير 2024
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">الفواتير الأخيرة</h3>
          <div className="space-y-2">
            {[
              { date: '2024-01-15', amount: '299 ريال', status: 'مدفوع' },
              { date: '2023-12-15', amount: '299 ريال', status: 'مدفوع' },
              { date: '2023-11-15', amount: '299 ريال', status: 'مدفوع' },
            ].map((invoice, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <span className="font-medium">{invoice.date}</span>
                  <span className="text-gray-600 mr-4">{invoice.amount}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 text-sm mr-4">{invoice.status}</span>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                    تحميل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Store Settings Redirect Component
const StoreSettingsRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/settings/store');
  }, [navigate]);

  return (
    <div className="px-6 py-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري التحويل...</p>
      </div>
    </div>
  );
};

export default Settings;

