/**
 * Custom Audience Details Page
 * 
 * صفحة تفاصيل الجمهور المخصص
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrashIcon,
  UserGroupIcon,
  CalendarIcon,
  TagIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookCustomAudience,
} from '../../services/facebookAdsService';

const CustomAudienceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audience, setAudience] = useState<FacebookCustomAudience | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAudience();
    }
  }, [id]);

  const loadAudience = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await facebookAdsService.getCustomAudience(id);
      setAudience(data);
    } catch (error: any) {
      console.error('Error loading audience:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الجمهور');
      navigate('/advertising/facebook-ads/audiences');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('هل أنت متأكد من حذف هذا الجمهور؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await facebookAdsService.deleteCustomAudience(id);
      toast.success('تم حذف الجمهور بنجاح');
      navigate('/advertising/facebook-ads/audiences');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف الجمهور');
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CUSTOMER_LIST: 'قائمة عملاء',
      WEBSITE: 'زوار الموقع',
      ENGAGEMENT: 'المتفاعلين',
      APP_ACTIVITY: 'نشاط التطبيق',
      VIDEO_VIEW: 'مشاهدي الفيديو',
    };
    return types[type] || type;
  };

  const getEventTypeLabel = (eventType?: string) => {
    if (!eventType) return '-';
    const types: Record<string, string> = {
      ALL_VISITORS: 'جميع الزوار',
      PURCHASE: 'المشترون',
      ADD_TO_CART: 'أضافوا للعربة',
      VIEW_CONTENT: 'شاهدوا المحتوى',
    };
    return types[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!audience) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">لم يتم العثور على الجمهور</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold text-gray-900">{audience.name}</h1>
          {audience.description && (
            <p className="mt-2 text-sm text-gray-600">{audience.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            <TrashIcon className="w-5 h-5" />
            حذف
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">الحالة</p>
              <p className="mt-1">
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    audience.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {audience.status === 'ACTIVE' ? 'نشط' : 'محذوف'}
                </span>
              </p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Audience Size Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">حجم الجمهور</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {audience.audienceSize ? audience.audienceSize.toLocaleString() : '-'}
              </p>
            </div>
            <EyeIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Type Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">نوع الجمهور</p>
              <p className="mt-1 font-medium text-gray-900">
                {getAudienceTypeLabel(audience.audienceType)}
              </p>
            </div>
            <TagIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">التفاصيل</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">معرف الجمهور على Facebook</p>
            <p className="mt-1 font-mono text-sm text-gray-900">
              {audience.facebookAudienceId || '-'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">تاريخ الإنشاء</p>
            <p className="mt-1 text-gray-900">
              {new Date(audience.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {audience.audienceType === 'WEBSITE' && (
            <>
              <div>
                <p className="text-sm text-gray-600">Pixel ID</p>
                <p className="mt-1 font-mono text-sm text-gray-900">
                  {audience.pixelId || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">نوع الحدث</p>
                <p className="mt-1 text-gray-900">
                  {getEventTypeLabel(audience.eventType)}
                </p>
              </div>

              {audience.retentionDays && (
                <div>
                  <p className="text-sm text-gray-600">مدة الاحتفاظ</p>
                  <p className="mt-1 text-gray-900">
                    {audience.retentionDays} يوم
                  </p>
                </div>
              )}
            </>
          )}

          {audience.audienceType === 'CUSTOMER_LIST' && audience.customerListId && (
            <div>
              <p className="text-sm text-gray-600">قائمة العملاء</p>
              <p className="mt-1 text-gray-900">
                ID: {audience.customerListId}
              </p>
            </div>
          )}

          {audience.matchRate && (
            <div>
              <p className="text-sm text-gray-600">نسبة المطابقة</p>
              <p className="mt-1 text-gray-900">
                {audience.matchRate.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lookalike Audiences */}
      {audience.lookalikeAudiences && audience.lookalikeAudiences.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">الجماهير المشابهة</h2>
          <div className="space-y-3">
            {audience.lookalikeAudiences.map((lookalike) => (
              <div
                key={lookalike.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{lookalike.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      نسبة الشبه: {lookalike.ratio}% | الدولة: {lookalike.country}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      lookalike.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {lookalike.status === 'ACTIVE' ? 'نشط' : 'محذوف'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomAudienceDetails;

