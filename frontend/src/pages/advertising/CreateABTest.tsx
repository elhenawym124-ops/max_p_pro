/**
 * Create A/B Test Page
 * 
 * صفحة إنشاء اختبار A/B جديد
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  CreateAdTestData,
  FacebookCampaign,
} from '../../services/facebookAdsService';

const CreateABTest: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [formData, setFormData] = useState<CreateAdTestData>({
    name: '',
    description: '',
    testType: 'CREATIVE',
    campaignId: '',
    variants: [
      { name: 'Variant A' },
      { name: 'Variant B' }
    ],
    trafficSplit: 50,
    minimumResults: 100,
    autoPromote: false,
  });

  const totalSteps = 3;

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const data = await facebookAdsService.getCampaigns();
      setCampaigns(data.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED'));
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast.error('فشل في تحميل الحملات');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleInputChange = (field: keyof CreateAdTestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, variants: updatedVariants }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم الاختبار');
          return false;
        }
        if (!formData.testType) {
          toast.error('يرجى اختيار نوع الاختبار');
          return false;
        }
        return true;
      case 2:
        if (!formData.campaignId) {
          toast.error('يرجى اختيار الحملة');
          return false;
        }
        if (formData.variants.length < 2) {
          toast.error('يرجى إضافة متغيرين على الأقل');
          return false;
        }
        return true;
      case 3:
        return true; // Review step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      await facebookAdsService.createAdTest(formData);
      toast.success('تم إنشاء الاختبار بنجاح');
      navigate('/advertising/facebook-ads/tests');
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const testTypes = [
    { value: 'CREATIVE', label: 'Creative', description: 'اختبار صور أو نصوص مختلفة' },
    { value: 'TARGETING', label: 'Targeting', description: 'اختبار جماهير مستهدفة مختلفة' },
    { value: 'BUDGET', label: 'Budget', description: 'اختبار ميزانيات مختلفة' },
    { value: 'PLACEMENT', label: 'Placement', description: 'اختبار مواقع عرض مختلفة' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/advertising/facebook-ads/tests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          رجوع
        </button>
        <h1 className="text-3xl font-bold text-gray-900">إنشاء اختبار A/B</h1>
        <p className="mt-2 text-sm text-gray-600">
          أنشئ اختبار A/B لتحسين أداء الإعلانات
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm font-medium ${
                    step <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step === 1 && 'معلومات الاختبار'}
                  {step === 2 && 'المتغيرات'}
                  {step === 3 && 'المراجعة'}
                </p>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Test Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الاختبار *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: اختبار Creative - صيف 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="وصف الاختبار..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الاختبار *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {testTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleInputChange('testType', type.value)}
                    className={`p-4 border-2 rounded-lg text-left ${
                      formData.testType === type.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توزيع حركة المرور (Traffic Split)
              </label>
              <input
                type="number"
                value={formData.trafficSplit}
                onChange={(e) => handleInputChange('trafficSplit', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={10}
                max={90}
                step={10}
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.trafficSplit}% / {100 - formData.trafficSplit}%
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Variants */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحملة *
              </label>
              {loadingCampaigns ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    لا توجد حملات متاحة. يرجى إنشاء حملة أولاً.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.campaignId}
                  onChange={(e) => handleInputChange('campaignId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">اختر الحملة</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المتغيرات (Variants)
              </label>
              {formData.variants.map((variant, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">
                    {variant.name || `Variant ${String.fromCharCode(65 + index)}`}
                  </div>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={`اسم Variant ${String.fromCharCode(65 + index)}`}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    سيتم إضافة المزيد من الحقول حسب نوع الاختبار في المرحلة القادمة
                  </p>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للنتائج (Minimum Results)
              </label>
              <input
                type="number"
                value={formData.minimumResults}
                onChange={(e) => handleInputChange('minimumResults', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={50}
                step={50}
              />
              <p className="mt-1 text-sm text-gray-500">
                عدد التحويلات المطلوبة لتحديد الفائز
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoPromote"
                checked={formData.autoPromote}
                onChange={(e) => handleInputChange('autoPromote', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="autoPromote" className="text-sm text-gray-700">
                تعزيز الفائز تلقائياً عند الوصول لثقة إحصائية 95%
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-gray-900">مراجعة المعلومات</h3>
              
              <div>
                <span className="text-sm text-gray-500">اسم الاختبار:</span>
                <p className="font-medium">{formData.name}</p>
              </div>

              {formData.description && (
                <div>
                  <span className="text-sm text-gray-500">الوصف:</span>
                  <p className="font-medium">{formData.description}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">نوع الاختبار:</span>
                <p className="font-medium">
                  {testTypes.find(t => t.value === formData.testType)?.label}
                </p>
              </div>

              <div>
                <span className="text-sm text-gray-500">الحملة:</span>
                <p className="font-medium">
                  {campaigns.find(c => c.id === formData.campaignId)?.name || '-'}
                </p>
              </div>

              <div>
                <span className="text-sm text-gray-500">عدد المتغيرات:</span>
                <p className="font-medium">{formData.variants.length}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">توزيع حركة المرور:</span>
                <p className="font-medium">
                  {formData.trafficSplit}% / {100 - formData.trafficSplit}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateABTest;


