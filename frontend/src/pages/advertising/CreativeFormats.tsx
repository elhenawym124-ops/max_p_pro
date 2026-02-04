/**
 * 🎬 Creative Formats
 * 
 * صفحة إنشاء تنسيقات إعلانية متقدمة (Collection, Stories/Reels, Instant Experience)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Layers,
  Film,
  Smartphone,
  Image,
  Video,
  Type,
  Link,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Grid,
  Play,
  Zap
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

type CreativeType = 'collection' | 'stories' | 'instant';

const CreativeFormats: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<CreativeType>('collection');

  // Collection Creative State
  const [collectionData, setCollectionData] = useState({
    pageId: '',
    name: '',
    coverImageHash: '',
    coverVideoId: '',
    headline: '',
    primaryText: '',
    products: [''],
    catalogId: '',
    linkUrl: ''
  });

  // Stories/Reels Creative State
  const [storiesData, setStoriesData] = useState({
    pageId: '',
    instagramAccountId: '',
    name: '',
    videoId: '',
    primaryText: '',
    linkUrl: '',
    callToAction: 'LEARN_MORE',
    format: 'STORIES' as 'STORIES' | 'REELS'
  });

  // Instant Experience State
  const [instantData, setInstantData] = useState({
    pageId: '',
    name: '',
    components: [] as any[]
  });

  const creativeTypes = [
    {
      id: 'collection' as const,
      name: 'Collection',
      nameAr: 'مجموعة',
      description: 'اعرض منتجات متعددة في تجربة تسوق غامرة',
      icon: Grid,
      color: 'blue'
    },
    {
      id: 'stories' as const,
      name: 'Stories/Reels',
      nameAr: 'ستوريز/ريلز',
      description: 'إعلانات فيديو عمودية للقصص والريلز',
      icon: Film,
      color: 'pink'
    },
    {
      id: 'instant' as const,
      name: 'Instant Experience',
      nameAr: 'تجربة فورية',
      description: 'صفحة هبوط تفاعلية داخل Facebook',
      icon: Smartphone,
      color: 'purple'
    }
  ];

  const ctaOptions = [
    { value: 'LEARN_MORE', label: 'اعرف المزيد' },
    { value: 'SHOP_NOW', label: 'تسوق الآن' },
    { value: 'SIGN_UP', label: 'سجل الآن' },
    { value: 'WATCH_MORE', label: 'شاهد المزيد' },
    { value: 'CONTACT_US', label: 'تواصل معنا' },
    { value: 'GET_OFFER', label: 'احصل على العرض' }
  ];

  const addProduct = () => {
    if (collectionData.products.length < 10) {
      setCollectionData(prev => ({
        ...prev,
        products: [...prev.products, '']
      }));
    }
  };

  const removeProduct = (index: number) => {
    if (collectionData.products.length > 1) {
      setCollectionData(prev => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index)
      }));
    }
  };

  const updateProduct = (index: number, value: string) => {
    const newProducts = [...collectionData.products];
    newProducts[index] = value;
    setCollectionData(prev => ({ ...prev, products: newProducts }));
  };

  const handleCreateCollection = async () => {
    if (!collectionData.pageId) {
      toast.error('يرجى إدخال معرف الصفحة');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        pageId: collectionData.pageId,
        name: collectionData.name || `Collection - ${new Date().toLocaleDateString('ar-EG')}`
      };

      if (collectionData.coverImageHash) payload.coverImageHash = collectionData.coverImageHash;
      if (collectionData.coverVideoId) payload.coverVideoId = collectionData.coverVideoId;
      if (collectionData.headline) payload.headline = collectionData.headline;
      if (collectionData.primaryText) payload.primaryText = collectionData.primaryText;
      if (collectionData.catalogId) payload.catalogId = collectionData.catalogId;
      if (collectionData.linkUrl) payload.linkUrl = collectionData.linkUrl;
      
      const filledProducts = collectionData.products.filter(p => p.trim());
      if (filledProducts.length > 0) payload.products = filledProducts;

      await facebookAdsService.createCollectionCreative(payload);
      toast.success('تم إنشاء Collection Creative بنجاح! 🎉');
      navigate('/advertising/facebook-ads');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.error || 'فشل في الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStories = async () => {
    if (!storiesData.pageId || !storiesData.videoId) {
      toast.error('يرجى إدخال معرف الصفحة ومعرف الفيديو');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        pageId: storiesData.pageId,
        videoId: storiesData.videoId,
        format: storiesData.format
      };

      if (storiesData.instagramAccountId) payload.instagramAccountId = storiesData.instagramAccountId;
      if (storiesData.name) payload.name = storiesData.name;
      if (storiesData.primaryText) payload.primaryText = storiesData.primaryText;
      if (storiesData.linkUrl) payload.linkUrl = storiesData.linkUrl;
      if (storiesData.callToAction) payload.callToAction = storiesData.callToAction;

      await facebookAdsService.createStoriesReelsCreative(payload);
      toast.success('تم إنشاء Stories/Reels Creative بنجاح! 🎉');
      navigate('/advertising/facebook-ads');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.error || 'فشل في الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstant = async () => {
    if (!instantData.pageId) {
      toast.error('يرجى إدخال معرف الصفحة');
      return;
    }

    try {
      setLoading(true);
      
      await facebookAdsService.createInstantExperience({
        pageId: instantData.pageId,
        name: instantData.name || `Instant Experience - ${new Date().toLocaleDateString('ar-EG')}`,
        components: instantData.components.length > 0 ? instantData.components : undefined
      });
      
      toast.success('تم إنشاء Instant Experience بنجاح! 🎉');
      navigate('/advertising/facebook-ads');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.error || 'فشل في الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (activeType) {
      case 'collection':
        handleCreateCollection();
        break;
      case 'stories':
        handleCreateStories();
        break;
      case 'instant':
        handleCreateInstant();
        break;
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/advertising/facebook-ads')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            تنسيقات إعلانية متقدمة
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إنشاء إعلانات بتنسيقات متقدمة لتجربة مستخدم أفضل</p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creativeTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`p-6 rounded-xl border-2 transition-all text-right ${
                isActive
                  ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                  : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <Icon className={`w-8 h-8 ${isActive ? `text-${type.color}-600 dark:text-${type.color}-400` : 'text-gray-400 dark:text-gray-500'}`} />
                {isActive && <CheckCircle className={`w-5 h-5 text-${type.color}-600 dark:text-${type.color}-400`} />}
              </div>
              <h3 className={`font-bold mt-3 ${isActive ? `text-${type.color}-900 dark:text-${type.color}-100` : 'text-gray-900 dark:text-gray-100'}`}>
                {type.nameAr}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.name}</p>
              <p className={`text-sm mt-2 ${isActive ? `text-${type.color}-700 dark:text-${type.color}-300` : 'text-gray-600 dark:text-gray-500'}`}>
                {type.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Collection Form */}
        {activeType === 'collection' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">معرف الصفحة *</label>
                <input
                  type="text"
                  value={collectionData.pageId}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, pageId: e.target.value }))}
                  placeholder="أدخل معرف صفحة Facebook"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الإعلان</label>
                <input
                  type="text"
                  value={collectionData.name}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اختياري"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
              <input
                type="text"
                value={collectionData.headline}
                onChange={(e) => setCollectionData(prev => ({ ...prev, headline: e.target.value }))}
                placeholder="عنوان جذاب للمجموعة"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النص الأساسي</label>
              <textarea
                value={collectionData.primaryText}
                onChange={(e) => setCollectionData(prev => ({ ...prev, primaryText: e.target.value }))}
                placeholder="وصف المجموعة"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">معرفات المنتجات</label>
                <button
                  onClick={addProduct}
                  disabled={collectionData.products.length >= 10}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  إضافة منتج
                </button>
              </div>
              <div className="space-y-2">
                {collectionData.products.map((product, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={product}
                      onChange={(e) => updateProduct(index, e.target.value)}
                      placeholder={`معرف المنتج ${index + 1}`}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                    {collectionData.products.length > 1 && (
                      <button
                        onClick={() => removeProduct(index)}
                        className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط الوجهة</label>
              <input
                type="url"
                value={collectionData.linkUrl}
                onChange={(e) => setCollectionData(prev => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* Stories/Reels Form */}
        {activeType === 'stories' && (
          <div className="p-6 space-y-6">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setStoriesData(prev => ({ ...prev, format: 'STORIES' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  storiesData.format === 'STORIES'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                }`}
              >
                <Play className="w-5 h-5 mx-auto mb-1" />
                Stories
              </button>
              <button
                onClick={() => setStoriesData(prev => ({ ...prev, format: 'REELS' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  storiesData.format === 'REELS'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200'
                }`}
              >
                <Film className="w-5 h-5 mx-auto mb-1" />
                Reels
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">معرف الصفحة *</label>
                <input
                  type="text"
                  value={storiesData.pageId}
                  onChange={(e) => setStoriesData(prev => ({ ...prev, pageId: e.target.value }))}
                  placeholder="أدخل معرف صفحة Facebook"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">معرف حساب Instagram</label>
                <input
                  type="text"
                  value={storiesData.instagramAccountId}
                  onChange={(e) => setStoriesData(prev => ({ ...prev, instagramAccountId: e.target.value }))}
                  placeholder="اختياري"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرف الفيديو *</label>
              <input
                type="text"
                value={storiesData.videoId}
                onChange={(e) => setStoriesData(prev => ({ ...prev, videoId: e.target.value }))}
                placeholder="أدخل معرف الفيديو من Facebook"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">يجب أن يكون الفيديو بتنسيق عمودي (9:16)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النص</label>
              <textarea
                value={storiesData.primaryText}
                onChange={(e) => setStoriesData(prev => ({ ...prev, primaryText: e.target.value }))}
                placeholder="نص قصير للإعلان"
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رابط الوجهة</label>
                <input
                  type="url"
                  value={storiesData.linkUrl}
                  onChange={(e) => setStoriesData(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">زر الإجراء</label>
                <select
                  value={storiesData.callToAction}
                  onChange={(e) => setStoriesData(prev => ({ ...prev, callToAction: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  {ctaOptions.map((cta) => (
                    <option key={cta.value} value={cta.value}>{cta.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Instant Experience Form */}
        {activeType === 'instant' && (
          <div className="p-6 space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-purple-900">Instant Experience</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    صفحة هبوط تفاعلية تفتح فوراً داخل Facebook بدون مغادرة التطبيق
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">معرف الصفحة *</label>
                <input
                  type="text"
                  value={instantData.pageId}
                  onChange={(e) => setInstantData(prev => ({ ...prev, pageId: e.target.value }))}
                  placeholder="أدخل معرف صفحة Facebook"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التجربة</label>
                <input
                  type="text"
                  value={instantData.name}
                  onChange={(e) => setInstantData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اختياري"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                سيتم إنشاء تجربة فورية أساسية. يمكنك تخصيصها لاحقاً من Facebook Ads Manager.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={() => navigate('/advertising/facebook-ads')}
            className="px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                إنشاء الإعلان
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreativeFormats;
