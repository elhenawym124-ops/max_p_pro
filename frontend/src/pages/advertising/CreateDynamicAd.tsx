/**
 * Create Dynamic Ad Page
 * 
 * صفحة إنشاء Dynamic Product Ad
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  CreateDynamicAdData,
  FacebookProductCatalog,
} from '../../services/facebookAdsService';

const CreateDynamicAd: React.FC = () => {
  const { adSetId } = useParams<{ adSetId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<FacebookProductCatalog[]>([]);
  const [productSets, setProductSets] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateDynamicAdData>({
    name: '',
    catalogId: '',
    productSetId: '',
    status: 'PAUSED',
    headline: '',
    description: '',
    callToAction: 'SHOP_NOW',
  });

  const totalSteps = 3;

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (formData.catalogId) {
      loadProductSets();
    }
  }, [formData.catalogId]);

  const loadCatalogs = async () => {
    try {
      setLoadingData(true);
      const data = await facebookAdsService.getCatalogs();
      setCatalogs(data.filter(c => c.status === 'ACTIVE'));
    } catch (error: any) {
      console.error('Error loading catalogs:', error);
      toast.error('فشل في تحميل Catalogs');
    } finally {
      setLoadingData(false);
    }
  };

  const loadProductSets = async () => {
    if (!formData.catalogId) return;

    try {
      const sets = await facebookAdsService.getProductSets(formData.catalogId);
      setProductSets(sets);
    } catch (error: any) {
      console.error('Error loading product sets:', error);
      toast.error('فشل في تحميل Product Sets');
    }
  };

  const handleInputChange = (field: keyof CreateDynamicAdData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم الإعلان');
          return false;
        }
        if (!formData.catalogId) {
          toast.error('يرجى اختيار Catalog');
          return false;
        }
        return true;
      case 2:
        if (!formData.productSetId) {
          toast.error('يرجى اختيار Product Set');
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
    if (!validateStep(currentStep) || !adSetId) return;

    try {
      setLoading(true);
      await facebookAdsService.createDynamicAd(adSetId, formData);
      toast.success('تم إنشاء Dynamic Ad بنجاح');
      navigate(-1); // رجوع للصفحة السابقة
    } catch (error: any) {
      console.error('Error creating dynamic ad:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء Dynamic Ad');
    } finally {
      setLoading(false);
    }
  };

  if (!adSetId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">معرف AdSet غير موجود</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          رجوع
        </button>
        <h1 className="text-3xl font-bold text-gray-900">إنشاء Dynamic Product Ad</h1>
        <p className="mt-2 text-sm text-gray-600">
          أنشئ إعلان ديناميكي للمنتجات من Catalog
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
                  {step === 1 && 'معلومات الإعلان'}
                  {step === 2 && 'المنتجات'}
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
        {/* Step 1: Ad Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الإعلان *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: Dynamic Ad - منتجات صيف 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Catalog *
              </label>
              {loadingData ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : catalogs.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    لا توجد Catalogs متاحة. يرجى إنشاء Catalog أولاً.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.catalogId}
                  onChange={(e) => handleInputChange('catalogId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">اختر Catalog</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name} ({catalog.syncedProducts || 0} منتج)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان (Headline)
              </label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: تسوق الآن واحصل على خصم 20%"
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
                rows={4}
                placeholder="وصف الإعلان..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call to Action
              </label>
              <select
                value={formData.callToAction}
                onChange={(e) => handleInputChange('callToAction', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="SHOP_NOW">تسوق الآن</option>
                <option value="LEARN_MORE">اعرف المزيد</option>
                <option value="SIGN_UP">سجل الآن</option>
                <option value="DOWNLOAD">تحميل</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Product Set */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Set *
              </label>
              {productSets.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    لا توجد Product Sets متاحة في هذا Catalog. يمكنك إنشاء Product Set من صفحة Catalog.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.productSetId}
                  onChange={(e) => handleInputChange('productSetId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">اختر Product Set</option>
                  {productSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.product_count || 0} منتج)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> Dynamic Ads ستعرض المنتجات تلقائياً من Product Set المختار.
                يمكنك إنشاء Product Set جديد من صفحة Catalog إذا لزم الأمر.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-gray-900">مراجعة المعلومات</h3>
              
              <div>
                <span className="text-sm text-gray-500">اسم الإعلان:</span>
                <p className="font-medium">{formData.name}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Catalog:</span>
                <p className="font-medium">
                  {catalogs.find(c => c.id === formData.catalogId)?.name || '-'}
                </p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Product Set:</span>
                <p className="font-medium">
                  {productSets.find(s => s.id === formData.productSetId)?.name || '-'}
                </p>
              </div>

              {formData.headline && (
                <div>
                  <span className="text-sm text-gray-500">العنوان:</span>
                  <p className="font-medium">{formData.headline}</p>
                </div>
              )}

              {formData.description && (
                <div>
                  <span className="text-sm text-gray-500">الوصف:</span>
                  <p className="font-medium">{formData.description}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">Call to Action:</span>
                <p className="font-medium">
                  {formData.callToAction === 'SHOP_NOW' ? 'تسوق الآن' :
                   formData.callToAction === 'LEARN_MORE' ? 'اعرف المزيد' :
                   formData.callToAction === 'SIGN_UP' ? 'سجل الآن' : 'تحميل'}
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
              {loading ? 'جاري الإنشاء...' : 'إنشاء Dynamic Ad'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateDynamicAd;


