/**
 * A/B Tests Management Page
 * 
 * صفحة إدارة اختبارات A/B للإعلانات
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookAdTest,
} from '../../services/facebookAdsService';
import { useTheme } from '../../hooks/useTheme';

const ABTestsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { derivedTheme } = useTheme();
  const [tests, setTests] = useState<FacebookAdTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'>('all');

  useEffect(() => {
    loadTests();
  }, [filter]);

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAdTests(
        filter === 'all' ? undefined : filter
      );
      setTests(data);
    } catch (error: any) {
      console.error('Error loading tests:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الاختبارات');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.startAdTest(id);
      toast.success('تم بدء الاختبار بنجاح');
      loadTests();
    } catch (error: any) {
      console.error('Error starting test:', error);
      toast.error(error?.response?.data?.error || 'فشل في بدء الاختبار');
    }
  };

  const handlePauseTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await facebookAdsService.pauseAdTest(id);
      toast.success('تم إيقاف الاختبار بنجاح');
      loadTests();
    } catch (error: any) {
      console.error('Error pausing test:', error);
      toast.error(error?.response?.data?.error || 'فشل في إيقاف الاختبار');
    }
  };

  const handleDeleteTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;

    try {
      await facebookAdsService.deleteAdTest(id);
      toast.success('تم حذف الاختبار بنجاح');
      loadTests();
    } catch (error: any) {
      console.error('Error deleting test:', error);
      toast.error(error?.response?.data?.error || 'فشل في حذف الاختبار');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: derivedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800',
      RUNNING: derivedTheme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800',
      PAUSED: derivedTheme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
      COMPLETED: derivedTheme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800',
      ARCHIVED: derivedTheme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600',
    };
    return badges[status as keyof typeof badges] || (derivedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800');
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'مسودة',
      RUNNING: 'قيد التشغيل',
      PAUSED: 'متوقف',
      COMPLETED: 'مكتمل',
      ARCHIVED: 'مؤرشف',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTestTypeLabel = (type: string) => {
    const labels = {
      CREATIVE: 'Creative',
      TARGETING: 'Targeting',
      BUDGET: 'Budget',
      PLACEMENT: 'Placement',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>اختبارات A/B</h1>
          <p className={`mt-2 text-sm ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            إدارة اختبارات A/B لتحسين أداء الإعلانات
          </p>
        </div>
        <button
          onClick={() => navigate('/advertising/facebook-ads/tests/create')}
          className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5" />
          إنشاء اختبار جديد
        </button>
      </div>

      {/* Filters */}
      <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} p-4 rounded-lg shadow`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>التصفية:</span>
          {['all', 'DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : derivedTheme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'الكل' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Tests List */}
      <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-lg shadow`}>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className={`mt-4 ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>جاري التحميل...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className={`w-16 h-16 ${derivedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
            <p className={`mb-4 ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>لا توجد اختبارات</p>
            <button
              onClick={() => navigate('/advertising/facebook-ads/tests/create')}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5" />
              إنشاء اختبار جديد
            </button>
          </div>
        ) : (
          <div className={`divide-y ${derivedTheme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {tests.map((test) => (
              <div
                key={test.id}
                onClick={() => navigate(`/advertising/facebook-ads/tests/${test.id}`)}
                className={`p-6 ${derivedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-semibold ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{test.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(test.status)}`}>
                        {getStatusLabel(test.status)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${derivedTheme === 'dark' ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-800'}`}>
                        {getTestTypeLabel(test.testType)}
                      </span>
                    </div>
                    {test.description && (
                      <p className={`mt-1 text-sm ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{test.description}</p>
                    )}
                    <div className={`mt-3 flex items-center gap-6 text-sm ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {test.variantsList && (
                        <span>{test.variantsList.length} متغير</span>
                      )}
                      {test.totalImpressions > 0 && (
                        <>
                          <span>{test.totalImpressions.toLocaleString()} مشاهدة</span>
                          <span>{test.totalClicks.toLocaleString()} نقرة</span>
                          {test.confidenceLevel && (
                            <span className={`font-medium ${derivedTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                              {test.confidenceLevel.toFixed(1)}% ثقة
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status === 'DRAFT' && (
                      <button
                        onClick={(e) => handleStartTest(test.id, e)}
                        className={`p-2 ${derivedTheme === 'dark' ? 'text-green-400 hover:bg-green-900' : 'text-green-600 hover:bg-green-50'} rounded-lg`}
                        title="بدء الاختبار"
                      >
                        <PlayIcon className="w-5 h-5" />
                      </button>
                    )}
                    {test.status === 'RUNNING' && (
                      <button
                        onClick={(e) => handlePauseTest(test.id, e)}
                        className={`p-2 ${derivedTheme === 'dark' ? 'text-yellow-400 hover:bg-yellow-900' : 'text-yellow-600 hover:bg-yellow-50'} rounded-lg`}
                        title="إيقاف الاختبار"
                      >
                        <PauseIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/advertising/facebook-ads/tests/${test.id}`);
                      }}
                      className={`p-2 ${derivedTheme === 'dark' ? 'text-indigo-400 hover:bg-indigo-900' : 'text-indigo-600 hover:bg-indigo-50'} rounded-lg`}
                      title="عرض التفاصيل"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    {test.status !== 'RUNNING' && (
                      <button
                        onClick={(e) => handleDeleteTest(test.id, e)}
                        className={`p-2 ${derivedTheme === 'dark' ? 'text-red-400 hover:bg-red-900' : 'text-red-600 hover:bg-red-50'} rounded-lg`}
                        title="حذف"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
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

export default ABTestsManagement;

