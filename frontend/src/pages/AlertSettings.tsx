import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, Save, RotateCcw, Settings, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '../config/environment'; // Import environment config

interface AlertThresholds {
  errorRate: number;
  emptyRate: number;
  slowRate: number;
  responseTime: number;
  minResponses: number;
}

const AlertSettings: React.FC = () => {
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    errorRate: 10,
    emptyRate: 5,
    slowRate: 30,
    responseTime: 15000,
    minResponses: 5
  });

  const [originalThresholds, setOriginalThresholds] = useState<AlertThresholds>({
    errorRate: 10,
    emptyRate: 5,
    slowRate: 30,
    responseTime: 15000,
    minResponses: 5
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchThresholds = async () => {
    try {
      setError(null);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/alerts`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data.stats.thresholds) {
        const fetchedThresholds = data.data.stats.thresholds;
        setThresholds(fetchedThresholds);
        setOriginalThresholds(fetchedThresholds);
      }
    } catch (err) {
      console.error('Error fetching thresholds:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveThresholds = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/alerts/thresholds`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(thresholds)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setOriginalThresholds(thresholds);
        setSuccess('تم حفظ الإعدادات بنجاح');

        // إخفاء رسالة النجاح بعد 3 ثواني
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save thresholds');
      }
    } catch (err) {
      console.error('Error saving thresholds:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults: AlertThresholds = {
      errorRate: 10,
      emptyRate: 5,
      slowRate: 30,
      responseTime: 15000,
      minResponses: 5
    };
    setThresholds(defaults);
  };

  const resetToOriginal = () => {
    setThresholds(originalThresholds);
  };

  const hasChanges = () => {
    return JSON.stringify(thresholds) !== JSON.stringify(originalThresholds);
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleInputChange = (field: keyof AlertThresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setThresholds(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-12">
        <RefreshCw className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">جاري تحميل إعدادات الأمان...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12 transition-all duration-300" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">إعدادات التنبيهات</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            قم بتخصيص عتبات التنبيهات والمشغلات لمراقبة جودة وأداء النظام بشكل دقيق.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchThresholds}
            variant="outline"
            className="dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* Messages */}
      {(success || error) && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="text-green-700 dark:text-green-400 text-sm font-bold">{success}</div>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div className="text-red-700 dark:text-red-400 text-sm font-bold">{error}</div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Error Rate */}
        <Card className="border-none shadow-md dark:shadow-indigo-900/5 overflow-hidden group hover:shadow-lg transition-all">
          <div className="h-1.5 bg-red-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">🚨</span>
              <span>عتبة معدل الأخطاء</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              تحديد النسبة المئوية القصوى للأخطاء المسموح بها قبل إرسال تنبيه عاجل للمشرفين.
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={thresholds.errorRate}
                onChange={(e) => handleInputChange('errorRate', e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
            </div>
          </CardContent>
        </Card>

        {/* Empty Rate */}
        <Card className="border-none shadow-md dark:shadow-indigo-900/5 overflow-hidden group hover:shadow-lg transition-all">
          <div className="h-1.5 bg-yellow-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">⚠️</span>
              <span>عتبة الردود الفارغة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              مراقبة نسبة الردود التي لا تحتوي على بيانات مفيدة، مما قد يشير إلى خلل في معالجة التغطية.
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={thresholds.emptyRate}
                onChange={(e) => handleInputChange('emptyRate', e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
            </div>
          </CardContent>
        </Card>

        {/* Slow Rate */}
        <Card className="border-none shadow-md dark:shadow-indigo-900/5 overflow-hidden group hover:shadow-lg transition-all">
          <div className="h-1.5 bg-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">🐌</span>
              <span>عتبة الردود البطيئة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              تحديد نسبة الردود التي استغرقت أكثر من 10 ثوانٍ والمسموح بها ضمن نافذة التحليل.
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={thresholds.slowRate}
                onChange={(e) => handleInputChange('slowRate', e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card className="border-none shadow-md dark:shadow-indigo-900/5 overflow-hidden group hover:shadow-lg transition-all">
          <div className="h-1.5 bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">⏰</span>
              <span>عتبة وقت الاستجابة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              الحد الأقصى لمتوسط وقت الاستجابة بالملي ثانية. القيم العالية جداً تطلق تنبيهاً فورياً.
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                value={thresholds.responseTime}
                onChange={(e) => handleInputChange('responseTime', e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Min Responses */}
        <Card className="md:col-span-2 border-none shadow-md dark:shadow-indigo-900/5 overflow-hidden group hover:shadow-lg transition-all">
          <div className="h-1.5 bg-purple-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">📊</span>
              <span>الحد الأدنى للردود اللازمة للتحليل</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              لضمان استقرار الإحصائيات، لن يتم إرسال تنبيهات بناءً على النسب المئوية حتى يتم جمع هذا العدد الأدنى من الردود في الفترة الزمنية المحددة.
            </p>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={thresholds.minResponses}
                onChange={(e) => handleInputChange('minResponses', e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">رداً</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={resetToDefaults}
            variant="ghost"
            disabled={saving}
            className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 font-bold"
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            استعادة الافتراضي
          </Button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <Button
            onClick={resetToOriginal}
            variant="ghost"
            disabled={saving || !hasChanges()}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-bold"
          >
            إلغاء التغييرات
          </Button>
        </div>

        <Button
          onClick={saveThresholds}
          disabled={saving || !hasChanges()}
          className={`h-12 px-8 rounded-xl font-bold transition-all shadow-lg ${hasChanges()
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none translate-y-[-2px]'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
            }`}
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 ml-2" />
          )}
          {saving ? 'جاري الحفظ...' : 'حفظ كافة الإعدادات'}
        </Button>
      </div>

      {/* Quick Summary View */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">ملخص الإعدادات النشطة حالياً</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {[
            { label: 'خطأ حرج', value: `${thresholds.errorRate}%`, color: 'text-red-500' },
            { label: 'فراغ البيانات', value: `${thresholds.emptyRate}%`, color: 'text-yellow-500' },
            { label: 'تأخر الرد', value: `${thresholds.slowRate}%`, color: 'text-orange-500' },
            { label: 'وقت الاستجابة', value: `${thresholds.responseTime}ms`, color: 'text-blue-500' },
            { label: 'الحد الأدنى', value: thresholds.minResponses, color: 'text-purple-500' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`text-2xl font-black ${item.color} mb-1`}>{item.value}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertSettings;

