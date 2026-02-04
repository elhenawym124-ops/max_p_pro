/**
 * Create Ad Page
 * 
 * صفحة إنشاء إعلان جديد (Creative)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  RectangleStackIcon,
  XMarkIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  CreateAdData,
  CALL_TO_ACTION_TYPES,
} from '../../services/facebookAdsService';
import { useAuth } from '../../hooks/useAuthSimple';
import { apiClient } from '../../services/apiClient';

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
}

const CreateAd: React.FC = () => {
  const { adSetId } = useParams<{ adSetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Form data
  const [formData, setFormData] = useState<CreateAdData & {
    pageId?: string;
    imageFile?: File | null;
    videoFile?: File | null;
    uploadedImageHash?: string;
    uploadedVideoId?: string;
    imagePreview?: string;
    videoPreview?: string;
  }>({
    adSetId: adSetId || '',
    name: '',
    status: 'PAUSED',
    creativeType: 'SINGLE_IMAGE',
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'LEARN_MORE',
    linkUrl: '',
    pageId: '',
    imageFile: null,
    videoFile: null,
  });

  const totalSteps = 4;

  useEffect(() => {
    loadFacebookPages();
  }, []);

  const loadFacebookPages = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoadingPages(true);
      const response = await apiClient.get('/facebook-integration/connected-pages');
      if (response.data.success && response.data.pages) {
        setFacebookPages(response.data.pages.filter((p: FacebookPage) => p.status === 'connected'));
        if (response.data.pages.length === 1 && !formData.pageId) {
          setFormData(prev => ({ ...prev, pageId: response.data.pages[0].pageId }));
        }
      }
    } catch (error: any) {
      console.error('Error loading Facebook Pages:', error);
      // لا نعرض خطأ لأن Page اختياري في بعض الحالات
    } finally {
      setLoadingPages(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    if (!file.type.startsWith('image/')) {
      toast.error('الملف المحدد ليس صورة');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error('حجم الصورة كبير جداً. الحد الأقصى 10MB');
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    }));
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video
    if (!file.type.startsWith('video/')) {
      toast.error('الملف المحدد ليس فيديو');
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB
      toast.error('حجم الفيديو كبير جداً. الحد الأقصى 500MB');
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      videoFile: file,
      videoPreview: URL.createObjectURL(file)
    }));
  };

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData(prev => ({ 
      ...prev, 
      imageFile: null,
      imagePreview: undefined,
      uploadedImageHash: undefined
    }));
  };

  const removeVideo = () => {
    if (formData.videoPreview) {
      URL.revokeObjectURL(formData.videoPreview);
    }
    setFormData(prev => ({ 
      ...prev, 
      videoFile: null,
      videoPreview: undefined,
      uploadedVideoId: undefined
    }));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!formData.imageFile) return null;

    try {
      setUploading(true);
      toast.loading('جاري رفع الصورة...', { id: 'upload-image' });

      // Create FormData
      const uploadFormData = new FormData();
      uploadFormData.append('image', formData.imageFile);
      uploadFormData.append('adSetId', formData.adSetId);

      // Upload to backend
      const response = await apiClient.post('/facebook-ads/upload-image', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.hash) {
        toast.success('تم رفع الصورة بنجاح', { id: 'upload-image' });
        return response.data.hash;
      } else {
        throw new Error(response.data.error || 'فشل في رفع الصورة');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error?.response?.data?.error || 'فشل في رفع الصورة', { id: 'upload-image' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!formData.videoFile) return null;

    try {
      setUploading(true);
      toast.loading('جاري رفع الفيديو...', { id: 'upload-video' });

      // Create FormData
      const uploadFormData = new FormData();
      uploadFormData.append('video', formData.videoFile);
      uploadFormData.append('adSetId', formData.adSetId);
      uploadFormData.append('name', formData.name || 'Video Ad');

      // Upload to backend
      const response = await apiClient.post('/facebook-ads/upload-video', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for video upload
      });

      if (response.data.success && response.data.videoId) {
        toast.success('تم رفع الفيديو بنجاح', { id: 'upload-video' });
        return response.data.videoId;
      } else {
        throw new Error(response.data.error || 'فشل في رفع الفيديو');
      }
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error(error?.response?.data?.error || 'فشل في رفع الفيديو', { id: 'upload-video' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم الإعلان');
          return false;
        }
        if (!formData.creativeType) {
          toast.error('يرجى اختيار نوع الإعلان');
          return false;
        }
        return true;
      case 2:
        if (formData.creativeType === 'SINGLE_IMAGE' && !formData.imageFile && !formData.imageUrl) {
          toast.error('يرجى إضافة صورة للإعلان');
          return false;
        }
        if (formData.creativeType === 'SINGLE_VIDEO' && !formData.videoFile && !formData.videoUrl) {
          toast.error('يرجى إضافة فيديو للإعلان');
          return false;
        }
        return true;
      case 3:
        if (!formData.primaryText.trim()) {
          toast.error('يرجى إدخال نص الإعلان');
          return false;
        }
        if (!formData.linkUrl.trim()) {
          toast.error('يرجى إدخال رابط الإعلان');
          return false;
        }
        return true;
      case 4:
        return true; // Review step
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Upload media before moving to next step
    if (currentStep === 2) {
      if (formData.creativeType === 'SINGLE_IMAGE' && formData.imageFile && !formData.uploadedImageHash) {
        const hash = await uploadImage();
        if (hash) {
          setFormData(prev => ({ ...prev, uploadedImageHash: hash }));
        } else {
          return; // Don't proceed if upload failed
        }
      } else if (formData.creativeType === 'SINGLE_VIDEO' && formData.videoFile && !formData.uploadedVideoId) {
        const videoId = await uploadVideo();
        if (videoId) {
          setFormData(prev => ({ ...prev, uploadedVideoId: videoId }));
        } else {
          return; // Don't proceed if upload failed
        }
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      return;
    }

    // Upload media if not already uploaded
    let imageHash = formData.uploadedImageHash;
    let videoId = formData.uploadedVideoId;

    if (formData.creativeType === 'SINGLE_IMAGE' && formData.imageFile && !imageHash) {
      imageHash = await uploadImage();
      if (!imageHash) return;
    } else if (formData.creativeType === 'SINGLE_VIDEO' && formData.videoFile && !videoId) {
      videoId = await uploadVideo();
      if (!videoId) return;
    }

    try {
      setLoading(true);
      
      const adData: CreateAdData = {
        adSetId: formData.adSetId,
        name: formData.name,
        status: formData.status || 'PAUSED',
        creativeType: formData.creativeType,
        primaryText: formData.primaryText,
        headline: formData.headline,
        description: formData.description,
        callToAction: formData.callToAction,
        linkUrl: formData.linkUrl,
        imageUrl: formData.imageUrl,
        videoUrl: formData.videoUrl,
        ...(imageHash && { imageHash }),
        ...(videoId && { videoId }),
        ...(formData.pageId && { pageId: formData.pageId }),
      };

      await facebookAdsService.createAd(adData);
      toast.success('تم إنشاء الإعلان بنجاح!');
      navigate(`/advertising/facebook-ads/campaigns/${adSetId}/adset`);
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الإعلان');
    } finally {
      setLoading(false);
    }
  };

  const creativeTypes = [
    { 
      value: 'SINGLE_IMAGE', 
      label: 'صورة واحدة', 
      icon: PhotoIcon,
      description: 'إعلان بصورة واحدة ونص'
    },
    { 
      value: 'SINGLE_VIDEO', 
      label: 'فيديو واحد', 
      icon: VideoCameraIcon,
      description: 'إعلان بفيديو واحد ونص'
    },
    { 
      value: 'CAROUSEL', 
      label: 'Carousel', 
      icon: RectangleStackIcon,
      description: 'إعلان متعدد الصور (قريباً)'
    },
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">إنشاء إعلان جديد</h1>
        <p className="mt-2 text-sm text-gray-600">
          أنشئ إعلاناً جديداً مع Creative كامل
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
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
                  {step === 2 && 'الوسائط'}
                  {step === 3 && 'النص والمحتوى'}
                  {step === 4 && 'المراجعة'}
                </p>
              </div>
              {step < 4 && (
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
      <div className="bg-white p-8 rounded-lg shadow">
        {/* Step 1: Ad Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">معلومات الإعلان</h2>

            {/* Ad Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الإعلان *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="مثال: إعلان صيف 2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Creative Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                نوع الإعلان *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {creativeTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.creativeType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => handleInputChange('creativeType', type.value)}
                      className={`p-6 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${type.value === 'CAROUSEL' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={type.value === 'CAROUSEL'}
                    >
                      <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Facebook Page */}
            {loadingPages ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : facebookPages.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صفحة Facebook (لربط الإعلان)
                </label>
                <select
                  value={formData.pageId}
                  onChange={(e) => handleInputChange('pageId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">اختر صفحة Facebook</option>
                  {facebookPages.map((page) => (
                    <option key={page.pageId} value={page.pageId}>
                      {page.pageName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  الإعلان سيُنشر من هذه الصفحة
                </p>
              </div>
            ) : null}

            {/* Ad Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الإعلان
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ACTIVE' | 'PAUSED')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="PAUSED">متوقف (سأفعله لاحقاً)</option>
                <option value="ACTIVE">نشط (يبدأ فوراً)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Media */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">الوسائط</h2>

            {/* Image Upload */}
            {formData.creativeType === 'SINGLE_IMAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صورة الإعلان *
                </label>
                
                {formData.imagePreview ? (
                  <div className="relative">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    {formData.uploadedImageHash && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ تم رفع الصورة بنجاح
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">اضغط لاختيار صورة</p>
                    <p className="text-sm text-gray-500 mt-1">JPG, PNG - الحد الأقصى 10MB</p>
                    <p className="text-sm text-gray-500">الحد الأدنى: 600x315 بكسل</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Alternative: Image URL */}
                {!formData.imagePreview && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      أو رابط الصورة
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl || ''}
                      onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Video Upload */}
            {formData.creativeType === 'SINGLE_VIDEO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  فيديو الإعلان *
                </label>
                
                {formData.videoPreview ? (
                  <div className="relative">
                    <video
                      src={formData.videoPreview}
                      controls
                      className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={removeVideo}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    {formData.uploadedVideoId && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ تم رفع الفيديو بنجاح
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">اضغط لاختيار فيديو</p>
                    <p className="text-sm text-gray-500 mt-1">MP4, MOV - الحد الأقصى 500MB</p>
                    <p className="text-sm text-gray-500">المدة الموصى بها: 15-60 ثانية</p>
                  </div>
                )}
                
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />

                {/* Alternative: Video URL */}
                {!formData.videoPreview && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      أو رابط الفيديو
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl || ''}
                      onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}

            {uploading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">جاري الرفع... الرجاء الانتظار</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Copy & Content */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">النص والمحتوى</h2>

            {/* Primary Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                النص الأساسي (Primary Text) *
              </label>
              <textarea
                value={formData.primaryText}
                onChange={(e) => handleInputChange('primaryText', e.target.value)}
                placeholder="اكتب النص الرئيسي للإعلان هنا..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.primaryText.length}/500 حرف
              </p>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان (Headline)
              </label>
              <input
                type="text"
                value={formData.headline || ''}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                placeholder="عنوان جذاب للإعلان"
                maxLength={40}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.headline?.length || 0}/40 حرف
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف (Description)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="وصف مختصر للإعلان"
                rows={3}
                maxLength={125}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.description?.length || 0}/125 حرف
              </p>
            </div>

            {/* Call to Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call to Action
              </label>
              <select
                value={formData.callToAction}
                onChange={(e) => handleInputChange('callToAction', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {CALL_TO_ACTION_TYPES.map((cta) => (
                  <option key={cta.value} value={cta.value}>
                    {cta.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط الإعلان (Destination URL) *
              </label>
              <input
                type="url"
                value={formData.linkUrl || ''}
                onChange={(e) => handleInputChange('linkUrl', e.target.value)}
                placeholder="https://example.com/page"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                الرابط الذي سيتم توجيه المستخدمين إليه عند النقر على الإعلان
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">المراجعة والمعاينة</h2>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                <EyeIcon className="w-5 h-5" />
                {previewMode ? 'إخفاء المعاينة' : 'معاينة الإعلان'}
              </button>
            </div>

            {/* Preview */}
            {previewMode && (
              <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Media */}
                  {formData.creativeType === 'SINGLE_IMAGE' && formData.imagePreview && (
                    <img
                      src={formData.imagePreview}
                      alt="Ad Preview"
                      className="w-full h-auto"
                    />
                  )}
                  {formData.creativeType === 'SINGLE_VIDEO' && formData.videoPreview && (
                    <video
                      src={formData.videoPreview}
                      controls
                      className="w-full h-auto"
                    />
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    {formData.headline && (
                      <h3 className="font-semibold text-gray-900">{formData.headline}</h3>
                    )}
                    <p className="text-gray-700 text-sm">{formData.primaryText}</p>
                    {formData.description && (
                      <p className="text-gray-600 text-xs">{formData.description}</p>
                    )}
                    <button className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                      {CALL_TO_ACTION_TYPES.find(cta => cta.value === formData.callToAction)?.label || 'افعل المزيد'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-4">
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">ملخص الإعلان</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">اسم الإعلان</p>
                    <p className="font-semibold text-gray-900">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">نوع الإعلان</p>
                    <p className="font-semibold text-gray-900">
                      {creativeTypes.find(t => t.value === formData.creativeType)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Call to Action</p>
                    <p className="font-semibold text-gray-900">
                      {CALL_TO_ACTION_TYPES.find(cta => cta.value === formData.callToAction)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الحالة</p>
                    <p className="font-semibold text-gray-900">
                      {formData.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                    </p>
                  </div>
                  {formData.linkUrl && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">رابط الإعلان</p>
                      <p className="font-semibold text-gray-900 text-sm break-all">{formData.linkUrl}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                السابق
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? 'جاري الرفع...' : 'التالي'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || uploading}
                className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    إنشاء الإعلان
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAd;


