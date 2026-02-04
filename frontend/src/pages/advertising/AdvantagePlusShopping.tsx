/**
 * 🛒 Advantage+ Shopping Campaign
 * 
 * صفحة إنشاء حملات التسوق الذكية من Facebook
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ShoppingBag,
  Sparkles,
  Globe,
  DollarSign,
  Target,
  Zap,
  CheckCircle,
  Loader2,
  ArrowLeft,
  TrendingUp
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

const AdvantagePlusShopping: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    status: 'PAUSED' as 'ACTIVE' | 'PAUSED',
    budgetType: 'DAILY' as 'DAILY' | 'LIFETIME',
    budgetAmount: 50,
    catalogId: '',
    pixelId: '',
    countryTargeting: ['SA', 'AE', 'EG']
  });

  const countries = [
    { code: 'SA', name: 'السعودية', flag: '🇸🇦' },
    { code: 'AE', name: 'الإمارات', flag: '🇦🇪' },
    { code: 'EG', name: 'مصر', flag: '🇪🇬' },
    { code: 'KW', name: 'الكويت', flag: '🇰🇼' },
    { code: 'QA', name: 'قطر', flag: '🇶🇦' },
    { code: 'BH', name: 'البحرين', flag: '🇧🇭' },
    { code: 'OM', name: 'عمان', flag: '🇴🇲' },
    { code: 'JO', name: 'الأردن', flag: '🇯🇴' },
    { code: 'LB', name: 'لبنان', flag: '🇱🇧' },
    { code: 'MA', name: 'المغرب', flag: '🇲🇦' }
  ];

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoadingCatalogs(true);
      const data = await facebookAdsService.getCatalogs();
      setCatalogs(data);
    } catch (error) {
      console.error('Error loading catalogs:', error);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const toggleCountry = (code: string) => {
    setFormData(prev => ({
      ...prev,
      countryTargeting: prev.countryTargeting.includes(code)
        ? prev.countryTargeting.filter(c => c !== code)
        : [...prev.countryTargeting, code]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الحملة');
      return;
    }

    if (!formData.pixelId.trim()) {
      toast.error('يرجى إدخال معرف Facebook Pixel');
      return;
    }

    if (formData.budgetAmount < 1) {
      toast.error('يرجى إدخال ميزانية صحيحة');
      return;
    }

    if (formData.countryTargeting.length === 0) {
      toast.error('يرجى اختيار دولة واحدة على الأقل');
      return;
    }

    try {
      setLoading(true);
      const campaignPayload: any = {
        name: formData.name,
        status: formData.status,
        budgetType: formData.budgetType,
        budgetAmount: formData.budgetAmount,
        pixelId: formData.pixelId,
        countryTargeting: formData.countryTargeting
      };
      if (formData.catalogId) campaignPayload.catalogId = formData.catalogId;
      await facebookAdsService.createAdvantagePlusShoppingCampaign(campaignPayload);

      toast.success('تم إنشاء حملة Advantage+ Shopping بنجاح! 🛒');
      navigate('/advertising/facebook-ads');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الحملة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/advertising/facebook-ads')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-green-600 dark:text-green-400" />
            حملة Advantage+ Shopping
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">حملات تسوق ذكية تستخدم الذكاء الاصطناعي لتحقيق أفضل النتائج</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
          <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">تحسين تلقائي</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">الذكاء الاصطناعي يحسن الإعلانات تلقائياً</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <Target className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">استهداف ذكي</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">يصل للعملاء الأكثر احتمالاً للشراء</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
          <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">أداء أفضل</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">تكلفة أقل لكل عملية شراء</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800">
          <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">إعداد سريع</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">إعداد بسيط وسريع للحملة</p>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700">
        {/* Campaign Name */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات الحملة</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الحملة *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: حملة التسوق - رمضان 2025"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">معرف Facebook Pixel *</label>
              <input
                type="text"
                value={formData.pixelId}
                onChange={(e) => setFormData(prev => ({ ...prev, pixelId: e.target.value }))}
                placeholder="أدخل معرف الـ Pixel"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مطلوب لتتبع التحويلات والمبيعات</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كتالوج المنتجات</label>
              {loadingCatalogs ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التحميل...
                </div>
              ) : (
                <select
                  value={formData.catalogId}
                  onChange={(e) => setFormData(prev => ({ ...prev, catalogId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">بدون كتالوج (اختياري)</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            الميزانية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع الميزانية</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, budgetType: 'DAILY' }))}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    formData.budgetType === 'DAILY'
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="font-medium">يومية</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">إنفاق يومي ثابت</div>
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, budgetType: 'LIFETIME' }))}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    formData.budgetType === 'LIFETIME'
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="font-medium">إجمالية</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">لكامل مدة الحملة</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المبلغ ({formData.budgetType === 'DAILY' ? 'يومياً' : 'إجمالي'}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="number"
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetAmount: Number(e.target.value) }))}
                  min={1}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Country Targeting */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            الدول المستهدفة
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {countries.map((country) => {
              const isSelected = formData.countryTargeting.includes(country.code);
              return (
                <button
                  key={country.code}
                  onClick={() => toggleCountry(country.code)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-1">{country.flag}</div>
                  <div className={`text-sm font-medium ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {country.name}
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">حالة الحملة</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setFormData(prev => ({ ...prev, status: 'PAUSED' }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                formData.status === 'PAUSED'
                  ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white">متوقفة</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">ستبدأ عند التفعيل يدوياً</div>
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, status: 'ACTIVE' }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                formData.status === 'ACTIVE'
                  ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white">نشطة</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">ستبدأ فوراً بعد الإنشاء</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 flex gap-3 justify-end">
          <button
            onClick={() => navigate('/advertising/facebook-ads')}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-white bg-green-600 dark:bg-green-500 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                إنشاء الحملة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvantagePlusShopping;
