/**
 * Facebook Ads Dashboard
 * 
 * لوحة تحكم لإدارة إعلانات Facebook
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { 
  facebookAdsService,
  FacebookCampaign,
  CAMPAIGN_OBJECTIVES 
} from '../../services/facebookAdsService';

const FacebookAdsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getCampaigns();
      setCampaigns(data);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الحملات');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const handleCreateCampaign = () => {
    navigate('/advertising/facebook-ads/campaigns/create');
  };

  const handleCreateFullAd = () => {
    navigate('/advertising/facebook-ads/create-ad');
  };

  const handleViewCampaign = (id: string) => {
    navigate(`/advertising/facebook-ads/campaigns/${id}`);
  };

  const handlePauseCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.pauseCampaign(id);
      toast.success('تم إيقاف الحملة');
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في إيقاف الحملة');
    }
  };

  const handleResumeCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.resumeCampaign(id);
      toast.success('تم استئناف الحملة');
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في استئناف الحملة');
    }
  };

  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه الحملة؟')) {
      return;
    }
    
    try {
      await facebookAdsService.deleteCampaign(id);
      toast.success('تم حذف الحملة');
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف الحملة');
    }
  };

  // Calculate statistics
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    paused: campaigns.filter(c => c.status === 'PAUSED').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budgetAmount, 0),
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
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة إعلانات Facebook</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            أنشئ وأدر حملاتك الإعلانية على Facebook مباشرة من هنا
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={handleCreateCampaign}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <PlusIcon className="w-5 h-5" />
            حملة فقط
          </button>
          <button
            onClick={handleCreateFullAd}
            className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            🚀 إنشاء إعلان كامل
          </button>
        </div>
      </div>

      {/* Quick Actions - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/advertising/facebook-ads/audiences')}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border-0 dark:border dark:border-gray-700"
        >
          <UserGroupIcon className="w-8 h-8 text-purple-500 dark:text-purple-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">الجماهير</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الجماهير المستهدفة</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/automation-rules')}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border-0 dark:border dark:border-gray-700"
        >
          <ChartBarIcon className="w-8 h-8 text-yellow-500 dark:text-yellow-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">قواعد الأتمتة</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">أتمتة إدارة الحملات</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/reports')}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border-0 dark:border dark:border-gray-700"
        >
          <EyeIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">التقارير</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">تقارير الأداء المتقدمة</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/catalogs')}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border-0 dark:border dark:border-gray-700"
        >
          <ShoppingCartIcon className="w-8 h-8 text-green-500 dark:text-green-400 mb-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">الكتالوجات</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة كتالوجات المنتجات</p>
        </button>
      </div>

      {/* Quick Actions - Row 2 (v22.0 Features) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => navigate('/advertising/facebook-ads/lead-forms')}
          className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border border-blue-100 dark:border-blue-800"
        >
          <span className="text-2xl mb-2 block">📋</span>
          <h3 className="font-medium text-gray-900 dark:text-white">نماذج Lead</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">جمع بيانات العملاء</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/dco')}
          className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border border-purple-100 dark:border-purple-800"
        >
          <span className="text-2xl mb-2 block">✨</span>
          <h3 className="font-medium text-gray-900 dark:text-white">DCO</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">تحسين ديناميكي</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/advantage-plus')}
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border border-green-100 dark:border-green-800"
        >
          <span className="text-2xl mb-2 block">🛒</span>
          <h3 className="font-medium text-gray-900 dark:text-white">Advantage+</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">حملات تسوق ذكية</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/conversions')}
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border border-orange-100 dark:border-orange-800"
        >
          <span className="text-2xl mb-2 block">📊</span>
          <h3 className="font-medium text-gray-900 dark:text-white">CAPI</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">تتبع التحويلات</p>
        </button>
        <button
          onClick={() => navigate('/advertising/facebook-ads/creative-formats')}
          className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl shadow dark:shadow-gray-900/20 hover:shadow-md transition-all text-right border border-pink-100 dark:border-pink-800"
        >
          <span className="text-2xl mb-2 block">🎬</span>
          <h3 className="font-medium text-gray-900 dark:text-white">تنسيقات</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Stories & Reels</p>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الحملات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">حملات نشطة</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <PlayIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">حملات متوقفة</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.paused}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <PauseIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الميزانية</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalBudget.toLocaleString()} {campaigns[0]?.adAccountId ? 'EGP' : ''}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">الحملات الإعلانية</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <ChartBarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد حملات إعلانية</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">ابدأ بإنشاء حملة إعلانية جديدة</p>
            <button
              onClick={handleCreateCampaign}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              <PlusIcon className="w-5 h-5" />
              إنشاء حملة جديدة
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => handleViewCampaign(campaign.id)}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(campaign.status)} dark:bg-opacity-20`}>
                        {getStatusLabel(campaign.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        <span className="font-medium">الهدف:</span> {getObjectiveLabel(campaign.objective)}
                      </span>
                      <span>
                        <span className="font-medium">الميزانية:</span> {campaign.budgetAmount.toLocaleString()} {campaign.budgetType === 'DAILY' ? 'EGP/يوم' : 'EGP'}
                      </span>
                      {campaign.startDate && (
                        <span>
                          <span className="font-medium">تاريخ البدء:</span> {new Date(campaign.startDate).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                    {campaign.adSets && campaign.adSets.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {campaign.adSets.length} مجموعة إعلانات
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === 'ACTIVE' ? (
                      <button
                        onClick={(e) => handlePauseCampaign(campaign.id, e)}
                        className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                        title="إيقاف"
                      >
                        <PauseIcon className="w-5 h-5" />
                      </button>
                    ) : campaign.status === 'PAUSED' ? (
                      <button
                        onClick={(e) => handleResumeCampaign(campaign.id, e)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        title="استئناف"
                      >
                        <PlayIcon className="w-5 h-5" />
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="حذف"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
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

export default FacebookAdsDashboard;

