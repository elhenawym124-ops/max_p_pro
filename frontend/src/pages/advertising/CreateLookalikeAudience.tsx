/**
 * Create Lookalike Audience Page
 * 
 * صفحة إنشاء جمهور مشابه جديد
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  CreateLookalikeAudienceData,
  FacebookCustomAudience,
  FacebookAdAccount,
} from '../../services/facebookAdsService';

const CreateLookalikeAudience: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateLookalikeAudienceData>({
    name: '',
    description: '',
    sourceAudienceId: '',
    country: 'EG',
    ratio: 1,
    adAccountId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [audiences, accounts] = await Promise.all([
        facebookAdsService.getCustomAudiences(),
        facebookAdsService.getAdAccounts(),
      ]);
      
      setCustomAudiences(audiences.filter(a => a.status === 'ACTIVE'));
      setAdAccounts(accounts);
      
      if (accounts.length > 0 && !formData.adAccountId) {
        setFormData(prev => ({ ...prev, adAccountId: accounts[0].id }));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: keyof CreateLookalikeAudienceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sourceAudienceId || !formData.country) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      await facebookAdsService.createLookalikeAudience(formData);
      toast.success('تم إنشاء الجمهور المشابه بنجاح');
      navigate('/advertising/facebook-ads/audiences');
    } catch (error: any) {
      console.error('Error creating lookalike audience:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الجمهور المشابه');
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    { value: 'EG', label: 'مصر' },
    { value: 'SA', label: 'السعودية' },
    { value: 'AE', label: 'الإمارات' },
    { value: 'KW', label: 'الكويت' },
    { value: 'QA', label: 'قطر' },
    { value: 'US', label: 'الولايات المتحدة' },
    { value: 'GB', label: 'المملكة المتحدة' },
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/advertising/facebook-ads/audiences')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          رجوع
        </button>
        <h1 className="text-3xl font-bold text-gray-900">إنشاء جمهور مشابه</h1>
        <p className="mt-2 text-sm text-gray-600">
          أنشئ جمهوراً مشابهاً للجمهور المخصص الخاص بك
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم الجمهور المشابه *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: جمهور مشابه - عملاء نشطون"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الوصف (اختياري)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            placeholder="وصف مختصر..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الجمهور المصدر *
          </label>
          {customAudiences.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                لا توجد جماهير مخصصة متاحة. يرجى إنشاء جمهور مخصص أولاً.
              </p>
            </div>
          ) : (
            <select
              value={formData.sourceAudienceId}
              onChange={(e) => handleInputChange('sourceAudienceId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">اختر الجمهور المصدر</option>
              {customAudiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name} ({audience.audienceSize?.toLocaleString() || 0})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الدولة *
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة الشبه *
            </label>
            <select
              value={formData.ratio}
              onChange={(e) => handleInputChange('ratio', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}% - {ratio === 1 ? 'أكثر تشابه' : ratio === 10 ? 'أقل تشابه' : `${ratio}%`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              كلما انخفضت النسبة، زاد التشابه (وأصغر الجمهور)
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/advertising/facebook-ads/audiences')}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || customAudiences.length === 0}
            className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الجمهور المشابه'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLookalikeAudience;

