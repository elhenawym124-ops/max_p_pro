import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { getBaseDomain } from '../../utils/storeUrl';
import toast from 'react-hot-toast';

const PublicMerchantRegister: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    commissionRate: 10.0,
    autoFulfill: false,
    webhookUrl: ''
  });

  // بناء رابط الدخول بعد التسجيل
  const getLoginUrl = () => {
    const baseDomain = getBaseDomain();
    const protocol = window.location.protocol;
    const isProduction = !baseDomain.includes('localhost');
    
    if (isProduction) {
      return `${protocol}//${baseDomain}/auth/login`;
    }
    return `${protocol}//${baseDomain}/auth/login`;
  };

  // استخراج subdomain من URL الحالي
  const getCurrentSubdomain = (): string | null => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // في الإنتاج: storename.maxp-ai.pro -> storename
    if (parts.length >= 3 && parts[0] !== 'www' && !hostname.includes('localhost')) {
      return parts[0];
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // استخدام route العام الذي يستخرج الشركة من subdomain
      // الـ apiClient يضيف subdomain تلقائياً في headers
      const response = await apiClient.post('/public/merchants/register', formData);
      
      if (response.data.success) {
        toast.success('تم تسجيل التاجر بنجاح! سيتم مراجعة طلبك قريباً');
        // توجيه إلى صفحة تسجيل الدخول
        window.location.href = getLoginUrl();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className={`max-w-2xl mx-auto ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
          تسجيل تاجر جديد
        </h1>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          انضم كتاجر للدروب شيبنج وابدأ في بيع منتجاتك
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              اسم التاجر
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="اسم التاجر أو الشركة"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              الهاتف
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="01xxxxxxxxx"
            />
          </div>

          {/* Address */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              العنوان
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="عنوان التاجر"
            />
          </div>

          {/* Commission Rate */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              نسبة العمولة (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              نسبة العمولة التي يحصل عليها التاجر من كل طلب
            </p>
          </div>

          {/* Webhook URL */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Webhook URL (اختياري)
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="https://example.com/webhook"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              رابط Webhook لإرسال إشعارات الطلبات تلقائياً
            </p>
          </div>

          {/* Auto Fulfill */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoFulfill"
              checked={formData.autoFulfill}
              onChange={(e) => setFormData({ ...formData, autoFulfill: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoFulfill" className={`mr-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              تفعيل الوفاء التلقائي للطلبات
            </label>
          </div>

          {/* Terms */}
          <div className={`${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
            <h3 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-900'} mb-2`}>
              شروط وأحكام البرنامج
            </h3>
            <ul className={`text-sm space-y-1 list-disc list-inside ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
              <li>التاجر مسؤول عن توفير المنتجات وتوصيلها</li>
              <li>العمولات تُحسب تلقائياً عند تأكيد الطلب</li>
              <li>يمكن ربط منتجات التاجر بمنتجات المنصة</li>
              <li>الطلبات تُرسل تلقائياً للتاجر عند التأكيد</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل كتاجر'}
            </button>
            <button
              type="button"
              onClick={() => window.location.href = getLoginUrl()}
              className={`px-6 py-3 border rounded-lg transition ${
                isDark 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              لدي حساب بالفعل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMerchantRegister;
