/**
 * 📊 Async Reports Management
 * 
 * صفحة إدارة التقارير المتقدمة (Async Reports)
 * v22.0 Feature
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Plus,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  BarChart3,
  TrendingUp,
  Filter
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

// ============================================
// Types
// ============================================

interface AsyncReport {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  level: string;
  dateRange: { start: string; end: string };
  metrics: string[];
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
}

interface CreateReportForm {
  name: string;
  level: 'campaign' | 'adset' | 'ad';
  datePreset: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  breakdowns: string[];
}

// ============================================
// Constants
// ============================================

const REPORT_LEVELS = [
  { value: 'campaign', label: 'الحملات' },
  { value: 'adset', label: 'المجموعات الإعلانية' },
  { value: 'ad', label: 'الإعلانات' }
];

const DATE_PRESETS = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'last_7d', label: 'آخر 7 أيام' },
  { value: 'last_14d', label: 'آخر 14 يوم' },
  { value: 'last_30d', label: 'آخر 30 يوم' },
  { value: 'this_month', label: 'هذا الشهر' },
  { value: 'last_month', label: 'الشهر الماضي' },
  { value: 'custom', label: 'تاريخ مخصص' }
];

const AVAILABLE_METRICS = [
  { value: 'impressions', label: 'مرات الظهور', category: 'الأداء' },
  { value: 'reach', label: 'الوصول', category: 'الأداء' },
  { value: 'frequency', label: 'التكرار', category: 'الأداء' },
  { value: 'clicks', label: 'النقرات', category: 'الأداء' },
  { value: 'ctr', label: 'معدل النقر (CTR)', category: 'الأداء' },
  { value: 'spend', label: 'الإنفاق', category: 'التكلفة' },
  { value: 'cpc', label: 'تكلفة النقرة (CPC)', category: 'التكلفة' },
  { value: 'cpm', label: 'تكلفة الألف ظهور (CPM)', category: 'التكلفة' },
  { value: 'conversions', label: 'التحويلات', category: 'التحويلات' },
  { value: 'cost_per_conversion', label: 'تكلفة التحويل', category: 'التحويلات' },
  { value: 'conversion_rate', label: 'معدل التحويل', category: 'التحويلات' },
  { value: 'purchase_roas', label: 'العائد على الإنفاق (ROAS)', category: 'التحويلات' },
  { value: 'video_views', label: 'مشاهدات الفيديو', category: 'الفيديو' },
  { value: 'video_p25_watched', label: 'مشاهدة 25%', category: 'الفيديو' },
  { value: 'video_p50_watched', label: 'مشاهدة 50%', category: 'الفيديو' },
  { value: 'video_p75_watched', label: 'مشاهدة 75%', category: 'الفيديو' },
  { value: 'video_p100_watched', label: 'مشاهدة كاملة', category: 'الفيديو' }
];

const AVAILABLE_BREAKDOWNS = [
  { value: 'age', label: 'العمر' },
  { value: 'gender', label: 'الجنس' },
  { value: 'country', label: 'الدولة' },
  { value: 'region', label: 'المنطقة' },
  { value: 'device_platform', label: 'الجهاز' },
  { value: 'publisher_platform', label: 'المنصة' },
  { value: 'placement', label: 'الموضع' }
];

// ============================================
// Component
// ============================================

const AsyncReports: React.FC = () => {
  const [reports, setReports] = useState<AsyncReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshingReport, setRefreshingReport] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateReportForm>({
    name: '',
    level: 'campaign',
    datePreset: 'last_7d',
    startDate: '',
    endDate: '',
    metrics: ['impressions', 'clicks', 'spend', 'ctr', 'cpc'],
    breakdowns: []
  });

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      // Simulated data - replace with actual API call
      setReports([]);
    } catch (error) {
      toast.error('فشل في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    if (!formData.name.trim()) {
      toast.error('اسم التقرير مطلوب');
      return;
    }
    if (formData.metrics.length === 0) {
      toast.error('يجب اختيار مقياس واحد على الأقل');
      return;
    }

    try {
      setCreating(true);
      
      const reportData = {
        name: formData.name,
        level: formData.level,
        datePreset: formData.datePreset !== 'custom' ? formData.datePreset : undefined,
        timeRange: formData.datePreset === 'custom' ? {
          since: formData.startDate,
          until: formData.endDate
        } : undefined,
        fields: formData.metrics,
        breakdowns: formData.breakdowns.length > 0 ? formData.breakdowns : undefined
      };

      await facebookAdsService.createAsyncReport(reportData);
      
      toast.success('تم إنشاء التقرير بنجاح');
      setShowCreateModal(false);
      resetForm();
      await loadReports();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في إنشاء التقرير');
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshStatus = async (reportId: string) => {
    try {
      setRefreshingReport(reportId);
      const status = await facebookAdsService.getAsyncReportStatus(reportId);
      
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: status.status } : r
      ));
      
      if (status.status === 'COMPLETED') {
        toast.success('التقرير جاهز للتحميل');
      }
    } catch (error) {
      toast.error('فشل في تحديث حالة التقرير');
    } finally {
      setRefreshingReport(null);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const results = await facebookAdsService.getAsyncReportResults(reportId);
      
      // Convert to CSV and download
      const csv = convertToCSV(results);
      downloadCSV(csv, `report_${reportId}.csv`);
      
      toast.success('تم تحميل التقرير');
    } catch (error) {
      toast.error('فشل في تحميل التقرير');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h]).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      level: 'campaign',
      datePreset: 'last_7d',
      startDate: '',
      endDate: '',
      metrics: ['impressions', 'clicks', 'spend', 'ctr', 'cpc'],
      breakdowns: []
    });
  };

  const toggleMetric = (metric: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }));
  };

  const toggleBreakdown = (breakdown: string) => {
    setFormData(prev => ({
      ...prev,
      breakdowns: prev.breakdowns.includes(breakdown)
        ? prev.breakdowns.filter(b => b !== breakdown)
        : [...prev.breakdowns, breakdown]
    }));
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" />, label: 'قيد الانتظار' },
      RUNNING: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'جاري التنفيذ' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: 'مكتمل' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'فشل' }
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  // Group metrics by category
  const metricsByCategory = AVAILABLE_METRICS.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_METRICS>);

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            التقارير المتقدمة
          </h1>
          <p className="text-gray-600 mt-1">
            أنشئ تقارير مفصلة عن أداء حملاتك الإعلانية
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          تقرير جديد
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">لا توجد تقارير</h3>
          <p className="text-gray-500 mb-6">أنشئ تقريراً جديداً لتحليل أداء حملاتك</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إنشاء تقرير
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">اسم التقرير</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">المستوى</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الفترة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => {
                const statusBadge = getStatusBadge(report.status);
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{report.name}</div>
                      <div className="text-sm text-gray-500">{report.metrics.length} مقاييس</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {REPORT_LEVELS.find(l => l.value === report.level)?.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.dateRange.start} - {report.dateRange.end}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {report.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleRefreshStatus(report.id)}
                            disabled={refreshingReport === report.id}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshingReport === report.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {report.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleDownloadReport(report.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">إنشاء تقرير جديد</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Report Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم التقرير</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: تقرير أداء الحملات الأسبوعي"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Level & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المستوى</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {REPORT_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفترة الزمنية</label>
                  <select
                    value={formData.datePreset}
                    onChange={(e) => setFormData(prev => ({ ...prev, datePreset: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DATE_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Date Range */}
              {formData.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">المقاييس</label>
                <div className="space-y-4">
                  {Object.entries(metricsByCategory).map(([category, metrics]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {metrics.map(metric => (
                          <button
                            key={metric.value}
                            type="button"
                            onClick={() => toggleMetric(metric.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                              formData.metrics.includes(metric.value)
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {metric.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdowns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">التقسيمات (اختياري)</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_BREAKDOWNS.map(breakdown => (
                    <button
                      key={breakdown.value}
                      type="button"
                      onClick={() => toggleBreakdown(breakdown.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        formData.breakdowns.includes(breakdown.value)
                          ? 'bg-purple-50 border-purple-500 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {breakdown.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateReport}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    إنشاء التقرير
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsyncReports;
