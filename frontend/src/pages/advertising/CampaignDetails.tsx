/**
 * Campaign Details Page
 * 
 * صفحة تفاصيل الحملة الإعلانية
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { 
  facebookAdsService,
  FacebookCampaign,
  CAMPAIGN_OBJECTIVES,
} from '../../services/facebookAdsService';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<FacebookCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  const loadCampaign = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await facebookAdsService.getCampaign(id);
      setCampaign(data);
    } catch (error: any) {
      console.error('Error loading campaign:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الحملة');
      navigate('/advertising/facebook-ads');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaign();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const handlePause = async () => {
    if (!id) return;
    try {
      await facebookAdsService.pauseCampaign(id);
      toast.success('تم إيقاف الحملة');
      await loadCampaign();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في إيقاف الحملة');
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await facebookAdsService.resumeCampaign(id);
      toast.success('تم استئناف الحملة');
      await loadCampaign();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في استئناف الحملة');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الحملة؟')) {
      return;
    }
    
    try {
      await facebookAdsService.deleteCampaign(id);
      toast.success('تم حذف الحملة');
      navigate('/advertising/facebook-ads');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف الحملة');
    }
  };

  const getObjectiveLabel = (objective: string) => {
    const obj = CAMPAIGN_OBJECTIVES.find(o => o.value === objective);
    return obj?.label || objective;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      DELETED: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ACTIVE: 'نشط',
      PAUSED: 'متوقف',
      ARCHIVED: 'مؤرشف',
      DELETED: 'محذوف',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">الحملة غير موجودة</p>
        <button
          onClick={() => navigate('/advertising/facebook-ads')}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/advertising/facebook-ads')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              تم الإنشاء: {new Date(campaign.createdAt).toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          {campaign.status === 'ACTIVE' ? (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2 text-yellow-700 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50"
            >
              <PauseIcon className="w-5 h-5" />
              إيقاف
            </button>
          ) : campaign.status === 'PAUSED' ? (
            <button
              onClick={handleResume}
              className="flex items-center gap-2 px-4 py-2 text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50"
            >
              <PlayIcon className="w-5 h-5" />
              استئناف
            </button>
          ) : null}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            <TrashIcon className="w-5 h-5" />
            حذف
          </button>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات الحملة</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">اسم الحملة</p>
              <p className="font-medium text-gray-900">{campaign.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">الهدف</p>
              <p className="font-medium text-gray-900">{getObjectiveLabel(campaign.objective)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">الحالة</p>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>
            </div>
            {campaign.facebookCampaignId && (
              <div>
                <p className="text-sm text-gray-600">Facebook Campaign ID</p>
                <p className="font-medium text-gray-900 font-mono text-sm">{campaign.facebookCampaignId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">الميزانية</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">نوع الميزانية</p>
              <p className="font-medium text-gray-900">
                {campaign.budgetType === 'DAILY' ? 'يومية' : 'إجمالية'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">مبلغ الميزانية</p>
              <p className="font-medium text-gray-900 text-xl">
                {campaign.budgetAmount.toLocaleString()} EGP
                {campaign.budgetType === 'DAILY' && <span className="text-sm text-gray-600"> / يوم</span>}
              </p>
            </div>
            {campaign.startDate && (
              <div>
                <p className="text-sm text-gray-600">تاريخ البدء</p>
                <p className="font-medium text-gray-900">
                  {new Date(campaign.startDate).toLocaleDateString('ar-EG')}
                </p>
              </div>
            )}
            {campaign.endDate && (
              <div>
                <p className="text-sm text-gray-600">تاريخ الانتهاء</p>
                <p className="font-medium text-gray-900">
                  {new Date(campaign.endDate).toLocaleDateString('ar-EG')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AdSets */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">مجموعات الإعلانات</h2>
          <button
            onClick={() => navigate(`/advertising/facebook-ads/campaigns/${id}/adsets/create`)}
            className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة مجموعة إعلانات
          </button>
        </div>

        {!campaign.adSets || campaign.adSets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 mb-4">لا توجد مجموعات إعلانات</p>
            <button
              onClick={() => navigate(`/advertising/facebook-ads/campaigns/${id}/adsets/create`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5" />
              إضافة مجموعة إعلانات
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {campaign.adSets.map((adSet) => (
              <div key={adSet.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{adSet.name}</h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">الميزانية:</span> {adSet.budgetAmount.toLocaleString()} EGP
                      {adSet.budgetType === 'DAILY' && ' / يوم'}
                    </div>
                    {adSet.ads && adSet.ads.length > 0 && (
                      <div className="mt-1 text-sm text-gray-500">
                        {adSet.ads.length} إعلان
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/advertising/facebook-ads/adsets/${adSet.id}/ads/create`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      title="إنشاء إعلان جديد"
                    >
                      <PlusIcon className="w-4 h-4" />
                      إعلان جديد
                    </button>
                    <button
                      onClick={() => navigate(`/advertising/facebook-ads/adsets/${adSet.id}/dynamic-ads/create`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                      title="إنشاء Dynamic Ad"
                    >
                      <ShoppingBagIcon className="w-4 h-4" />
                      Dynamic Ad
                    </button>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(adSet.status)}`}>
                      {getStatusLabel(adSet.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetails;

