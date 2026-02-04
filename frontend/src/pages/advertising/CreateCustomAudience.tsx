/**
 * Create Custom Audience Page
 * 
 * صفحة إنشاء جمهور مخصص جديد
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
  CreateCustomAudienceData,
  FacebookAdAccount,
} from '../../services/facebookAdsService';

const CreateCustomAudience: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form data
  const [formData, setFormData] = useState<CreateCustomAudienceData>({
    name: '',
    description: '',
    audienceType: 'CUSTOMER_LIST',
    adAccountId: '',
    customerList: [],
    pixelId: '',
    eventType: 'ALL_VISITORS',
    retentionDays: 30,
    engagementType: 'PAGE_LIKES',
  });

  const totalSteps = 3;

  useEffect(() => {
    loadAdAccounts();
  }, []);

  const loadAdAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accounts = await facebookAdsService.getAdAccounts();
      setAdAccounts(accounts);
      if (accounts.length > 0 && !formData.adAccountId) {
        setFormData(prev => ({ ...prev, adAccountId: accounts[0].id }));
      }
    } catch (error: any) {
      console.error('Error loading Ad Accounts:', error);
      toast.error('فشل في تحميل حسابات Facebook Ads');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleInputChange = (field: keyof CreateCustomAudienceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم الجمهور');
          return false;
        }
        if (!formData.audienceType) {
          toast.error('يرجى اختيار نوع الجمهور');
          return false;
        }
        return true;
      case 2:
        if (formData.audienceType === 'CUSTOMER_LIST' && (!formData.customerList || formData.customerList.length === 0)) {
          toast.error('يرجى إضافة قائمة عملاء');
          return false;
        }
        if (formData.audienceType === 'WEBSITE' && !formData.pixelId) {
          toast.error('يرجى إدخال Pixel ID');
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
      await facebookAdsService.createCustomAudience(formData);
      toast.success('تم إنشاء الجمهور بنجاح');
      navigate('/advertising/facebook-ads/audiences');
    } catch (error: any) {
      console.error('Error creating custom audience:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الجمهور');
    } finally {
      setLoading(false);
    }
  };

  const audienceTypes = [
    { value: 'CUSTOMER_LIST', label: 'قائمة عملاء', description: 'جمهور من قائمة عملائك' },
    { value: 'WEBSITE', label: 'زوار الموقع', description: 'جمهور من زوار موقعك (Pixel)' },
    { value: 'ENGAGEMENT', label: 'المتفاعلين', description: 'جمهور من الأشخاص الذين تفاعلوا مع محتواك' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/advertising/facebook-ads/audiences')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            رجوع
          </button>
          <h1 className="text-3xl font-bold text-gray-900">إنشاء جمهور مخصص جديد</h1>
          <p className="mt-2 text-sm text-gray-600">
            اتبع الخطوات لإنشاء جمهور مخصص لحملاتك الإعلانية
          </p>
        </div>
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
                  {step === 1 && 'معلومات الجمهور'}
                  {step === 2 && 'الإعدادات'}
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
        {/* Step 1: Audience Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الجمهور *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: عملاء نشطون - يناير 2025"
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
                placeholder="وصف مختصر للجمهور..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الجمهور *
              </label>
              <div className="grid grid-cols-1 gap-4">
                {audienceTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`cursor-pointer p-4 border-2 rounded-lg transition ${
                      formData.audienceType === type.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audienceType"
                      value={type.value}
                      checked={formData.audienceType === type.value}
                      onChange={(e) => handleInputChange('audienceType', e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Settings */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {formData.audienceType === 'CUSTOMER_LIST' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  قائمة العملاء *
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  يمكنك رفع ملف CSV أو إدخال العملاء يدوياً
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500">
                    ميزة رفع الملف قيد التطوير. سيتم إضافتها قريباً.
                  </p>
                </div>
              </div>
            )}

            {formData.audienceType === 'WEBSITE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook Pixel ID *
                  </label>
                  <input
                    type="text"
                    value={formData.pixelId}
                    onChange={(e) => handleInputChange('pixelId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="123456789012345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الحدث
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL_VISITORS">جميع الزوار</option>
                    <option value="PURCHASE">المشترون</option>
                    <option value="ADD_TO_CART">أضافوا للعربة</option>
                    <option value="VIEW_CONTENT">شاهدوا المحتوى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدة الاحتفاظ (أيام)
                  </label>
                  <input
                    type="number"
                    value={formData.retentionDays}
                    onChange={(e) => handleInputChange('retentionDays', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min={1}
                    max={180}
                  />
                </div>
              </>
            )}

            {formData.audienceType === 'ENGAGEMENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع التفاعل
                </label>
                <select
                  value={formData.engagementType}
                  onChange={(e) => handleInputChange('engagementType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="PAGE_LIKES">معجبو الصفحة</option>
                  <option value="POST_ENGAGEMENT">المتفاعلون مع المنشورات</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-gray-900">مراجعة المعلومات</h3>
              
              <div>
                <span className="text-sm text-gray-500">الاسم:</span>
                <p className="font-medium">{formData.name}</p>
              </div>

              {formData.description && (
                <div>
                  <span className="text-sm text-gray-500">الوصف:</span>
                  <p className="font-medium">{formData.description}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">النوع:</span>
                <p className="font-medium">
                  {audienceTypes.find(t => t.value === formData.audienceType)?.label}
                </p>
              </div>

              {formData.audienceType === 'WEBSITE' && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Pixel ID:</span>
                    <p className="font-medium">{formData.pixelId}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">نوع الحدث:</span>
                    <p className="font-medium">{formData.eventType}</p>
                  </div>
                </>
              )}
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
              {loading ? 'جاري الإنشاء...' : 'إنشاء الجمهور'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCustomAudience;


