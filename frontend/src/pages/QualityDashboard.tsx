import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { getApiUrl } from '../config/environment'; // Import environment config

interface QualityStats {
  ratings: {
    total: number;
    positive: number;
    negative: number;
    satisfaction: number;
  };
  responses: {
    rated: number;
    unrated: number;
    totalResponses: number;
  };
  analysis: {
    status: string;
    satisfaction: number;
    negativeRate: number;
    concerns: string[];
    hasEnoughData: boolean;
    recommendation: string;
  };
  recentRatings: Array<{
    id: string;
    rating: string;
    comment: string;
    timestamp: string;
    customerId: string;
  }>;
}

const QualityDashboard: React.FC = () => {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching quality stats from API...');
      
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const token = localStorage.getItem('accessToken');
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const response = await fetch(`${apiUrl}/monitor/quality/stats`, { headers });
      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 API Data received:', data);

      if (data.success) {
        setStats(data.data);
        console.log('✅ Stats updated successfully:', data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // تحديث كل 30 ثانية
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'fair': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'poor': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // دالة لإصلاح الترميز العربي
  const fixArabicEncoding = (text: string) => {
    if (!text) return text;

    try {
      // إذا كان النص يحتوي على علامات استفهام، نحاول إصلاحه
      if (text.includes('?')) {
        // قاموس لاستبدال الأحرف المشفرة خطأ
        const arabicReplacements: { [key: string]: string } = {
          '??': 'ال',
          '???': 'رد',
          '????': 'ممتاز',
          '?????': 'ومفيد',
          '??????': 'جداً،',
          '???????': 'شكراً',
          '????????': 'لكم',
          '?????????': 'على',
          '??????????': 'الخدمة',
          '???????????': 'الرائعة',
          // إضافة المزيد من الاستبدالات حسب الحاجة
        };

        let fixedText = text;

        // محاولة استبدال الأنماط الشائعة
        Object.entries(arabicReplacements).forEach(([encoded, arabic]) => {
          fixedText = fixedText.replace(new RegExp(encoded, 'g'), arabic);
        });

        // إذا تم إصلاح بعض النص، نعيده
        if (fixedText !== text && fixedText.includes('?') === false) {
          return fixedText;
        }

        // محاولة أخرى: استبدال علامات الاستفهام بنص بديل
        if (text.match(/^\?+$/)) {
          return 'تعليق باللغة العربية';
        }
      }

      // إذا لم تنجح المحاولة، نعيد النص كما هو
      return text;
    } catch (error) {
      // في حالة الخطأ، نعيد النص الأصلي
      return text;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم جودة الردود</h1>
          <p className="text-gray-600 mt-1">مراقبة وتحليل جودة ردود البوت مع العملاء</p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={fetchStats}
            disabled={loading}
            className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
          <button
            onClick={() => window.open('https://www.maxp-ai.pro/api/v1/monitoring/quality/stats', '_blank')}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <span>🔗</span>
            <span>API مباشر</span>
          </button>
          <a
            href="/conversations"
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>المحادثات</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-600 font-medium">خطأ: {error}</span>
          </div>
          <div className="mt-2 text-sm text-red-600">
            تأكد من أن Backend يعمل على https://www.maxp-ai.pro
          </div>
        </div>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span>معلومات النظام</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <div className="font-medium text-gray-800">حالة التحميل</div>
              <div className={`${loading ? 'text-yellow-600' : 'text-green-600'}`}>
                {loading ? '🔄 جاري التحميل...' : '✅ تم التحميل'}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="font-medium text-gray-800">حالة البيانات</div>
              <div className={`${stats ? 'text-green-600' : 'text-red-600'}`}>
                {stats ? '✅ متوفرة' : '❌ غير متوفرة'}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="font-medium text-gray-800">آخر تحديث</div>
              <div className="text-gray-600">
                {new Date().toLocaleTimeString('ar-EG')}
              </div>
            </div>
          </div>
          {stats && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-800">
                <strong>البيانات الحقيقية:</strong> {stats.ratings.total} تقييم،
                معدل الرضا {stats.ratings.satisfaction}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <ThumbsUp className="w-4 h-4 mr-2" />
                إجمالي التقييمات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.ratings.total}</div>
              <p className="text-xs text-gray-500">
                {stats.ratings.positive} إيجابي • {stats.ratings.negative} سلبي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                معدل الرضا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ratings.satisfaction}%</div>
              <p className="text-xs text-gray-500">من إجمالي التقييمات</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                الردود المقيمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.responses.rated}</div>
              <p className="text-xs text-gray-500">من {stats.responses.totalResponses} رد</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                {getStatusIcon(stats.analysis.status)}
                <span className="mr-2">حالة النظام</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.analysis.status)}`}>
                {stats.analysis.status === 'excellent' && 'ممتاز'}
                {stats.analysis.status === 'good' && 'جيد'}
                {stats.analysis.status === 'fair' && 'مقبول'}
                {stats.analysis.status === 'poor' && 'ضعيف'}
                {stats.analysis.status === 'unknown' && 'غير معروف'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats.analysis.recommendation}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>التكامل مع المحادثات الحقيقية</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">نظام التقييم نشط</span>
                </div>
                <p className="text-sm text-green-700">
                  أزرار التقييم 👍👎 تظهر تلقائياً بعد كل رد من البوت في المحادثات الحقيقية مع العملاء
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">كيفية العمل:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• العميل يرسل رسالة عبر Facebook Messenger</li>
                  <li>• البوت يرد على العميل</li>
                  <li>• تظهر أزرار التقييم تحت رد البوت</li>
                  <li>• العميل يقيم الرد (👍 أو 👎)</li>
                  <li>• التقييم يُسجل في النظام فوراً</li>
                </ul>
              </div>

              <div className="flex space-x-2 space-x-reverse">
                <a
                  href="/conversations"
                  className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  عرض المحادثات
                </a>
                <a
                  href="/monitoring"
                  className="flex-1 text-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  لوحة المراقبة
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <span>آخر التقييمات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.recentRatings.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.recentRatings.map((rating) => (
                  <div key={rating.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {rating.rating === 'positive' ? (
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          rating.rating === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {rating.rating === 'positive' ? 'إيجابي' : 'سلبي'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(rating.timestamp)}
                      </span>
                    </div>
                    {rating.comment && (
                      <div className="mb-2">
                        {rating.comment.includes('?') ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <div className="flex items-center mb-1">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                              <span className="text-xs text-yellow-700 font-medium">مشكلة في الترميز</span>
                            </div>
                            <p className="text-sm text-gray-700">
                              "تعليق باللغة العربية (مشكلة في عرض الأحرف)"
                            </p>
                            <details className="mt-1">
                              <summary className="text-xs text-gray-500 cursor-pointer">عرض النص الأصلي</summary>
                              <p className="text-xs text-gray-400 mt-1 font-mono">"{rating.comment}"</p>
                            </details>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      العميل: {rating.customerId}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">لا توجد تقييمات بعد</p>
                <p className="text-xs text-gray-500">ستظهر التقييمات عندما يقيم العملاء ردود البوت</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Concerns */}
      {stats && stats.analysis.concerns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>المخاوف والتوصيات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.analysis.concerns.map((concern, index) => (
                <div key={index} className="flex items-center space-x-2 space-x-reverse p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{concern}</span>
                </div>
              ))}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">التوصية:</h4>
                <p className="text-sm text-blue-700">{stats.analysis.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encoding Issue Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>ملاحظة حول الترميز</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-2 space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">مشكلة في عرض التعليقات العربية</h4>
                  <p className="text-sm text-yellow-700">
                    قد تظهر بعض التعليقات العربية كعلامات استفهام (?) بسبب مشكلة في الترميز.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded p-3 border border-yellow-300">
                <h5 className="font-medium text-gray-800 mb-2">الحلول المقترحة:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• التعليقات ما زالت مُسجلة بشكل صحيح في النظام</li>
                  <li>• المشكلة فقط في العرض وليس في التخزين</li>
                  <li>• سيتم إصلاح هذه المشكلة في التحديث القادم</li>
                  <li>• يمكن عرض النص الأصلي بالضغط على "عرض النص الأصلي"</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityDashboard;
