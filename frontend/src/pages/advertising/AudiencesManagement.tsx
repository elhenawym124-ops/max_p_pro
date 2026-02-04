/**
 * Audiences Management Page
 * 
 * صفحة إدارة الجماهير (Custom & Lookalike Audiences)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookCustomAudience,
  FacebookLookalikeAudience,
} from '../../services/facebookAdsService';

const AudiencesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'custom' | 'lookalike'>('custom');
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<FacebookLookalikeAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAudiences();
  }, [activeTab]);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      if (activeTab === 'custom') {
        const data = await facebookAdsService.getCustomAudiences();
        setCustomAudiences(data);
      } else {
        const data = await facebookAdsService.getLookalikeAudiences();
        setLookalikeAudiences(data);
      }
    } catch (error: any) {
      console.error('Error loading audiences:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الجماهير');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAudiences();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const handleCreateCustomAudience = () => {
    navigate('/advertising/facebook-ads/audiences/custom/create');
  };

  const handleCreateLookalikeAudience = () => {
    navigate('/advertising/facebook-ads/audiences/lookalike/create');
  };

  const handleDeleteCustomAudience = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذا الجمهور؟')) return;

    try {
      await facebookAdsService.deleteCustomAudience(id);
      toast.success('تم حذف الجمهور بنجاح');
      await loadAudiences();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف الجمهور');
    }
  };

  const handleViewAudience = (id: string) => {
    if (activeTab === 'custom') {
      navigate(`/advertising/facebook-ads/audiences/custom/${id}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الجماهير</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            أدر الجماهير المخصصة والجماهير المشابهة لحملاتك الإعلانية
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
            onClick={activeTab === 'custom' ? handleCreateCustomAudience : handleCreateLookalikeAudience}
            className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="w-5 h-5" />
            {activeTab === 'custom' ? 'جمهور مخصص جديد' : 'جمهور مشابه جديد'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              الجماهير المخصصة ({customAudiences.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('lookalike')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lookalike'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              الجماهير المشابهة ({lookalikeAudiences.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Custom Audiences Tab */}
      {activeTab === 'custom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 overflow-hidden border-0 dark:border dark:border-gray-700">
          {customAudiences.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">لا توجد جماهير مخصصة</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ابدأ بإنشاء جمهور مخصص جديد لحملاتك الإعلانية
              </p>
              <button
                onClick={handleCreateCustomAudience}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="w-5 h-5" />
                إنشاء جمهور مخصص جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الاسم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحجم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الإنشاء
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {customAudiences.map((audience) => (
                    <tr
                      key={audience.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => handleViewAudience(audience.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{audience.name}</div>
                        {audience.description && (
                          <div className="text-sm text-gray-500">{audience.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getAudienceTypeLabel(audience.audienceType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {audience.audienceSize ? audience.audienceSize.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            audience.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {audience.status === 'ACTIVE' ? 'نشط' : 'محذوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(audience.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAudience(audience.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteCustomAudience(audience.id, e)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lookalike Audiences Tab */}
      {activeTab === 'lookalike' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 overflow-hidden border-0 dark:border dark:border-gray-700">
          {lookalikeAudiences.length === 0 ? (
            <div className="text-center py-12">
              <SparklesIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">لا توجد جماهير مشابهة</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ابدأ بإنشاء جمهور مشابه جديد بناءً على جمهورك المخصص
              </p>
              <button
                onClick={handleCreateLookalikeAudience}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                <PlusIcon className="w-5 h-5" />
                إنشاء جمهور مشابه جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      الاسم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      المصدر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      نسبة الشبه
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      الحجم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      تاريخ الإنشاء
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {lookalikeAudiences.map((audience) => (
                    <tr key={audience.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{audience.name}</div>
                        {audience.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{audience.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {audience.sourceAudience?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {audience.ratio}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {audience.audienceSize ? audience.audienceSize.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            audience.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {audience.status === 'ACTIVE' ? 'نشط' : 'محذوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(audience.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudiencesManagement;

