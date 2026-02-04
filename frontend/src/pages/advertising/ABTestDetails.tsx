/**
 * A/B Test Details Page
 * 
 * صفحة تفاصيل اختبار A/B مع النتائج والتحليل
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  BeakerIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookAdTest,
  FacebookAdTestVariant,
} from '../../services/facebookAdsService';

const ABTestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<FacebookAdTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (id) {
      loadTest();
    }
  }, [id]);

  const loadTest = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAdTest(id!);
      setTest(data);
    } catch (error: any) {
      console.error('Error loading test:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (!id) return;
    try {
      await facebookAdsService.startAdTest(id);
      toast.success('تم بدء الاختبار بنجاح');
      loadTest();
    } catch (error: any) {
      console.error('Error starting test:', error);
      toast.error(error?.response?.data?.error || 'فشل في بدء الاختبار');
    }
  };

  const handlePauseTest = async () => {
    if (!id) return;
    try {
      await facebookAdsService.pauseAdTest(id);
      toast.success('تم إيقاف الاختبار بنجاح');
      loadTest();
    } catch (error: any) {
      console.error('Error pausing test:', error);
      toast.error(error?.response?.data?.error || 'فشل في إيقاف الاختبار');
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      const result = await facebookAdsService.analyzeAdTest(id);
      setAnalysis(result.analysis);
      setTest(result.test);
      toast.success('تم تحليل النتائج بنجاح');
    } catch (error: any) {
      console.error('Error analyzing test:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحليل النتائج');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePromoteWinner = async () => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من تعزيز الفائز؟ سيتم إيقاف المتغيرات الأخرى.')) return;

    try {
      await facebookAdsService.promoteWinner(id);
      toast.success('تم تعزيز الفائز بنجاح');
      loadTest();
    } catch (error: any) {
      console.error('Error promoting winner:', error);
      toast.error(error?.response?.data?.error || 'فشل في تعزيز الفائز');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: 'bg-gray-100 text-gray-800',
      RUNNING: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-gray-100 text-gray-600',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">الاختبار غير موجود</p>
      </div>
    );
  }

  const variants = test.variantsList || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/advertising/facebook-ads/tests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          رجوع
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{test.name}</h1>
            {test.description && (
              <p className="mt-2 text-sm text-gray-600">{test.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(test.status)}`}>
              {getStatusLabel(test.status)}
            </span>
            {test.status === 'DRAFT' && (
              <button
                onClick={handleStartTest}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <PlayIcon className="w-5 h-5" />
                بدء الاختبار
              </button>
            )}
            {test.status === 'RUNNING' && (
              <>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  {analyzing ? 'جارٍ التحليل...' : 'تحليل النتائج'}
                </button>
                <button
                  onClick={handlePauseTest}
                  className="flex items-center gap-2 px-4 py-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100"
                >
                  <PauseIcon className="w-5 h-5" />
                  إيقاف
                </button>
              </>
            )}
            {test.status === 'PAUSED' && (
              <button
                onClick={handleStartTest}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <PlayIcon className="w-5 h-5" />
                استئناف
              </button>
            )}
            {test.winnerVariantId && test.status === 'RUNNING' && (
              <button
                onClick={handlePromoteWinner}
                className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <StarIcon className="w-5 h-5" />
                تعزيز الفائز
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">نوع الاختبار</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{test.testType}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">عدد المتغيرات</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{variants.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">توزيع حركة المرور</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {test.trafficSplit}% / {100 - test.trafficSplit}%
          </div>
        </div>
      </div>

      {/* Statistics */}
      {test.totalImpressions > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">الإحصائيات الإجمالية</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-500">المشاهدات</div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {test.totalImpressions.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">النقرات</div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {test.totalClicks.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">التحويلات</div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {test.totalConversions.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">الإنفاق</div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {test.totalSpend.toFixed(2)} EGP
              </div>
            </div>
            {test.confidenceLevel && (
              <div>
                <div className="text-sm text-gray-500">مستوى الثقة</div>
                <div className="mt-1 text-xl font-semibold text-indigo-600">
                  {test.confidenceLevel.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">نتائج التحليل الإحصائي</h2>
          <div className="space-y-4">
            {analysis.pValue !== null && (
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">P-value</div>
                    <div className="text-sm text-gray-600">القيمة الإحصائية</div>
                  </div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {analysis.pValue.toFixed(4)}
                  </div>
                </div>
                {analysis.isSignificant && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    ✓ النتيجة إحصائياً معنوية (95% ثقة)
                  </div>
                )}
              </div>
            )}
            {analysis.winner && (
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <StarIcon className="w-6 h-6 text-green-600" />
                  <div className="font-semibold text-green-900">الفائز</div>
                </div>
                <div className="text-lg font-medium text-green-800">
                  {analysis.winner.winner === 'VARIANT_A' ? 'Variant A' : 'Variant B'}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  تحسن بنسبة {analysis.winner.improvement}%
                </div>
              </div>
            )}
            {analysis.recommendation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900">التوصية:</div>
                <div className="text-sm text-blue-800 mt-1">{analysis.recommendation}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Variants */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">المتغيرات (Variants)</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`p-6 ${
                variant.isWinner ? 'bg-green-50 border-l-4 border-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{variant.name}</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {variant.variantType}
                    </span>
                    {variant.isWinner && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <StarIcon className="w-4 h-4" />
                        الفائز
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">المشاهدات</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {variant.impressions.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">النقرات</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {variant.clicks.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">CTR</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {(variant.ctr || 0).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">CPC</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {(variant.cpc || 0).toFixed(2)} EGP
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">الإنفاق</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {(variant.spend || 0).toFixed(2)} EGP
                      </div>
                    </div>
                  </div>
                  {variant.pValue !== null && variant.pValue !== undefined && (
                    <div className="mt-4 text-sm text-gray-600">
                      P-value: {variant.pValue.toFixed(4)} | Confidence: {variant.confidenceLevel?.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ABTestDetails;

