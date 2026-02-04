/**
 * 👁️ Ad Preview
 * 
 * معاينة الإعلانات قبل النشر
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Eye,
  Smartphone,
  Monitor,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Facebook,
  Instagram,
  MessageCircle,
  Layout,
  Image
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

type PreviewFormat = 'DESKTOP_FEED_STANDARD' | 'MOBILE_FEED_STANDARD' | 'INSTAGRAM_STANDARD' | 'INSTAGRAM_STORY' | 'MESSENGER_MOBILE_INBOX_MEDIA' | 'RIGHT_COLUMN_STANDARD';

const AdPreview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<PreviewFormat>('MOBILE_FEED_STANDARD');

  const [formData, setFormData] = useState({
    creativeId: ''
  });

  const previewFormats = [
    { id: 'MOBILE_FEED_STANDARD' as const, label: 'موبايل - Feed', icon: Smartphone, platform: 'facebook' },
    { id: 'DESKTOP_FEED_STANDARD' as const, label: 'سطح المكتب - Feed', icon: Monitor, platform: 'facebook' },
    { id: 'INSTAGRAM_STANDARD' as const, label: 'Instagram Feed', icon: Instagram, platform: 'instagram' },
    { id: 'INSTAGRAM_STORY' as const, label: 'Instagram Story', icon: Smartphone, platform: 'instagram' },
    { id: 'MESSENGER_MOBILE_INBOX_MEDIA' as const, label: 'Messenger', icon: MessageCircle, platform: 'messenger' },
    { id: 'RIGHT_COLUMN_STANDARD' as const, label: 'العمود الأيمن', icon: Layout, platform: 'facebook' }
  ];

  const handlePreview = async () => {
    if (!formData.creativeId.trim()) {
      toast.error('يرجى إدخال معرف الإعلان الإبداعي');
      return;
    }

    try {
      setLoading(true);
      const result = await facebookAdsService.getAdPreview(formData.creativeId, selectedFormat);
      setPreviewData(result);
      toast.success('تم تحميل المعاينة بنجاح');
    } catch (error: any) {
      console.error('Error loading preview:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل المعاينة');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'blue';
      case 'instagram': return 'pink';
      case 'messenger': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/advertising/facebook-ads')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-7 h-7 text-indigo-600" />
            معاينة الإعلان
          </h1>
          <p className="text-gray-600 mt-1">شاهد كيف سيظهر إعلانك على مختلف المنصات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Creative ID Input */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">إعدادات المعاينة</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  معرف الإعلان الإبداعي (Creative ID) *
                </label>
                <input
                  type="text"
                  value={formData.creativeId}
                  onChange={(e) => setFormData({ creativeId: e.target.value })}
                  placeholder="أدخل معرف Creative"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={loading || !formData.creativeId.trim()}
                className="w-full py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    عرض المعاينة
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">تنسيق العرض</h2>
            
            <div className="space-y-2">
              {previewFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                const color = getPlatformColor(format.platform);
                
                return (
                  <button
                    key={format.id}
                    onClick={() => {
                      setSelectedFormat(format.id);
                      if (previewData) handlePreview();
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? `border-${color}-500 bg-${color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? `text-${color}-600` : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${isSelected ? `text-${color}-700` : 'text-gray-700'}`}>
                      {format.label}
                    </span>
                    {format.platform === 'instagram' && (
                      <Instagram className="w-4 h-4 text-pink-500 mr-auto" />
                    )}
                    {format.platform === 'facebook' && (
                      <Facebook className="w-4 h-4 text-blue-500 mr-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">المعاينة</h2>
              {previewData && (
                <button
                  onClick={handlePreview}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 min-h-[500px] flex items-center justify-center bg-gray-100">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">جاري تحميل المعاينة...</p>
                </div>
              ) : previewData ? (
                <div className="w-full max-w-md">
                  {/* Device Frame */}
                  <div className={`mx-auto ${
                    selectedFormat.includes('MOBILE') || selectedFormat.includes('STORY')
                      ? 'max-w-[375px]'
                      : 'max-w-full'
                  }`}>
                    {selectedFormat.includes('STORY') ? (
                      // Story Format
                      <div className="bg-black rounded-3xl p-2 shadow-2xl">
                        <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-[9/16]">
                          {previewData.body ? (
                            <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-white">
                              <Image className="w-16 h-16 opacity-50" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedFormat.includes('MOBILE') ? (
                      // Mobile Format
                      <div className="bg-gray-800 rounded-3xl p-3 shadow-2xl">
                        <div className="bg-white rounded-2xl overflow-hidden">
                          {previewData.body ? (
                            <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                          ) : (
                            <div className="aspect-square flex items-center justify-center bg-gray-100">
                              <Image className="w-16 h-16 text-gray-300" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Desktop Format
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {previewData.body ? (
                          <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                        ) : (
                          <div className="aspect-video flex items-center justify-center bg-gray-100">
                            <Image className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">أدخل معرف الإعلان الإبداعي لعرض المعاينة</p>
                  <p className="text-sm text-gray-400">يمكنك الحصول على المعرف من صفحة إدارة الإعلانات</p>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-medium text-indigo-900 mb-2">💡 نصائح للمعاينة</h3>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• تأكد من أن الإعلان يظهر بشكل جيد على جميع الأجهزة</li>
              <li>• راجع النصوص والصور قبل النشر</li>
              <li>• اختبر الروابط للتأكد من عملها بشكل صحيح</li>
              <li>• تحقق من ظهور زر الإجراء بوضوح</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdPreview;
