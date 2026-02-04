import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import errorTracking, { ErrorLog } from '../services/errorTracking';

/**
 * Error Dashboard Component
 * لوحة تحكم لعرض وإدارة الأخطاء المسجلة
 */
const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    loadErrors();
    
    // Auto refresh every 5 seconds
    const interval = setInterval(loadErrors, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [errors, filterCategory, filterSeverity, searchTerm]);

  const loadErrors = () => {
    const storedErrors = errorTracking.getStoredErrors();
    setErrors(storedErrors);
  };

  const applyFilters = () => {
    let filtered = [...errors];

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter((err) => err.category === filterCategory);
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter((err) => err.severity === filterSeverity);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter((err) =>
        err.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredErrors(filtered);
  };

  const handleClearErrors = () => {
    if (confirm('هل أنت متأكد من حذف جميع الأخطاء المسجلة؟')) {
      errorTracking.clearStoredErrors();
      setErrors([]);
    }
  };

  const handleExportJSON = () => {
    const json = errorTracking.exportErrors();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const csv = errorTracking.exportErrorsAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getSeverityColor = (severity: ErrorLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: ErrorLog['category']) => {
    switch (category) {
      case 'api':
        return 'bg-purple-100 text-purple-800';
      case 'network':
        return 'bg-blue-100 text-blue-800';
      case 'auth':
        return 'bg-red-100 text-red-800';
      case 'validation':
        return 'bg-yellow-100 text-yellow-800';
      case 'ui':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Only show in development or when explicitly enabled
  if (!import.meta.env.DEV && !showDashboard) {
    return (
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
        title="عرض لوحة الأخطاء"
      >
        <ExclamationTriangleIcon className="w-6 h-6" />
        {errors.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {errors.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 ml-3" />
            <div>
              <h2 className="text-2xl font-bold">لوحة تتبع الأخطاء</h2>
              <p className="text-red-100 text-sm">
                {errors.length} خطأ مسجل | {filteredErrors.length} ظاهر
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDashboard(false)}
            className="text-white hover:bg-red-800 p-2 rounded transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث في الأخطاء..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">كل الأنواع</option>
              <option value="api">API</option>
              <option value="network">شبكة</option>
              <option value="auth">مصادقة</option>
              <option value="validation">تحقق</option>
              <option value="ui">واجهة</option>
              <option value="unknown">غير معروف</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">كل الخطورات</option>
              <option value="critical">حرجة</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="تصدير JSON"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                title="تصدير CSV"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleClearErrors}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                title="مسح الكل"
              >
                <TrashIcon className="w-4 h-4" />
                مسح
              </button>
            </div>
          </div>
        </div>

        {/* Errors List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">لا توجد أخطاء مسجلة</p>
              <p className="text-sm">هذا رائع! النظام يعمل بشكل صحيح</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(
                    error.severity
                  )}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                            error.category
                          )}`}
                        >
                          {error.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p className="font-medium mb-1">{error.message}</p>
                      {error.context && (
                        <details className="text-sm opacity-80">
                          <summary className="cursor-pointer hover:underline">
                            عرض التفاصيل
                          </summary>
                          <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </details>
                      )}
                      {error.stack && (
                        <details className="text-sm opacity-80 mt-2">
                          <summary className="cursor-pointer hover:underline">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto max-h-40 text-left" dir="ltr">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;
