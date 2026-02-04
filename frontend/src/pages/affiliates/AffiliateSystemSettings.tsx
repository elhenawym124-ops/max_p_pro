import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuthSimple';
import { getBaseDomain } from '../../utils/storeUrl';
import toast from 'react-hot-toast';
import { LinkIcon, ClipboardDocumentIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const AffiliateSystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const { user } = useAuth();
  const isDark = actualTheme === 'dark';
  const [loading, setLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    commissionType: 'PERCENTAGE',
    commissionRate: 5.0,
    cookieDuration: 30,
    termsAndConditions: '',
    isActive: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/affiliate-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching affiliate settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.put('/affiliate-settings', settings);

      if (response.data.success) {
        toast.success('تم تحديث إعدادات نظام المسوقين بنجاح!');
        setSettings(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className={`w-full ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
        <div className="flex items-center mb-6">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-4">
            <Cog6ToothIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>إعدادات نظام المسوقين</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
              تحكم في عمولات المسوقين، الشروط والأحكام، وروابط التسجيل
            </p>
          </div>
        </div>

        {/* Invitation Link Section */}
        {user?.company && (
          <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
            <h3 className={`text-lg font-semibold mb-3 flex items-center ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
              <LinkIcon className="h-6 w-6 mr-2" />
              رابط دعوة المسوقين
            </h3>

            {!user.company.slug ? (
              <div className={`text-sm p-3 rounded bg-amber-100 text-amber-800 border border-amber-200`}>
                ⚠️ برجاء إعداد "رابط الشركة" (Slug) في إعدادات الشركة لتمكين رابط الدعوة.
              </div>
            ) : (
              <>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  شارك هذا الرابط مع المسوقين ليقوموا بالتسجيل في برنامجك. عند التسجيل، سيتم ربطهم بشركتك تلقائياً.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={(() => {
                      const baseDomain = getBaseDomain();
                      const protocol = window.location.protocol;
                      const slug = user.company!.slug;
                      if (!baseDomain.includes('localhost')) {
                        return `${protocol}//${slug}.${baseDomain}/affiliate-register`;
                      }
                      return `${protocol}//${baseDomain}/affiliate-register/${slug}`;
                    })()}
                    className={`flex-1 px-4 py-3 border rounded-lg text-sm font-mono ${isDark
                      ? 'bg-gray-800 border-gray-600 text-gray-300'
                      : 'bg-white border-gray-300 text-gray-600'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const baseDomain = getBaseDomain();
                      const protocol = window.location.protocol;
                      const slug = user!.company!.slug;
                      const link = !baseDomain.includes('localhost')
                        ? `${protocol}//${slug}.${baseDomain}/affiliate-register`
                        : `${protocol}//${baseDomain}/affiliate-register/${slug}`;

                      navigator.clipboard.writeText(link);
                      toast.success('تم نسخ الرابط بنجاح');
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center font-semibold"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                    نسخ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Program Status */}
          <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>حالة النظام</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>تفعيل أو تعطيل تسجيل مسوقين جدد</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.isActive}
                  onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold border-b pb-2 ${isDark ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              إعدادات العمولة الافتراضية
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              هذه الإعدادات ستطبق تلقائياً على أي مسوق جديد يقوم بالتسجيل. يمكنك تعديل عمولة كل مسوق لاحقاً بشكل فردي.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  نوع العمولة للمسوق
                </label>
                <select
                  value={settings.commissionType}
                  onChange={(e) => setSettings({ ...settings, commissionType: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="PERCENTAGE">نسبة مئوية (%)</option>
                  <option value="MARKUP">هامش ربح ثابت</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  {settings.commissionType === 'PERCENTAGE' ? 'النسبة للافتراضية للمسوق (%)' : 'المبلغ الثابت الافتراضي للمسوق'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.commissionRate}
                  onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>
            </div>

            <h2 className={`text-xl font-semibold border-b pb-2 pt-6 ${isDark ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              هامش ربح المنصة (بين التاجر والمسوق)
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              هذا الهامش سيتم إضافته تلقائياً على سعر التاجر ليكون هو "سعر التكلفة" الذي يراه المسوق.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  نوع ربح المنصة
                </label>
                <select
                  value={(settings as any).platformMarginType || 'FIXED'}
                  onChange={(e) => setSettings({ ...settings, platformMarginType: e.target.value } as any)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="FIXED">مبلغ ثابت لكل قطعة</option>
                  <option value="PERCENTAGE">نسبة مئوية من سعر التاجر (%)</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  قيمة ربح المنصة
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={(settings as any).platformMarginValue || 0}
                  onChange={(e) => setSettings({ ...settings, platformMarginValue: parseFloat(e.target.value) } as any)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                مدة الكوكيز (أيام)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.cookieDuration}
                onChange={(e) => setSettings({ ...settings, cookieDuration: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                الفترة التي يتم فيها احتساب العمولة للمسوق بعد زيارة العميل للرابط (الافتراضي 30 يوم).
              </p>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold border-b pb-2 ${isDark ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              الشروط والأحكام
            </h2>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                نص الشروط والأحكام
              </label>
              <textarea
                rows={6}
                value={settings.termsAndConditions}
                onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                placeholder="اكتب هنا الشروط التي يجب أن يوافق عليها المسوق عند التسجيل..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                سيظهر هذا النص في صفحة تسجيل المسوقين.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateSystemSettings;

