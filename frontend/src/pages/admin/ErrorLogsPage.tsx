import React, { useState, useEffect } from 'react';
import errorLogger, { ErrorLog } from '../../utils/errorLogger';
import {
    ArrowDownTrayIcon,
    TrashIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

const ErrorLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [stats, setStats] = useState<any>(null);
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

    const loadLogs = () => {
        const allLogs = errorLogger.getLogs();
        setLogs(allLogs);
        setStats(errorLogger.getStats());
    };

    useEffect(() => {
        loadLogs();
        // تحديث تلقائي كل 30 ثانية
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleClearLogs = () => {
        if (window.confirm('هل أنت متأكد من مسح جميع سجلات الأخطاء؟')) {
            errorLogger.clearLogs();
            loadLogs();
            setSelectedLog(null);
        }
    };

    const handleExportCSV = () => {
        const csv = errorLogger.exportLogsAsCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `error_logs_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportJSON = () => {
        const json = errorLogger.exportLogs();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `error_logs_${new Date().toISOString()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.errorState.errorType === filter;
    });

    const getStatusColor = (status?: number) => {
        if (!status) return 'bg-gray-100 text-gray-800';
        if (status >= 500) return 'bg-red-100 text-red-800';
        if (status >= 400) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                        سجل الأخطاء والنظام
                    </h1>
                    <p className="text-gray-500 mt-1">عرض وتحليل أخطاء التطبيق للمساعدة في الصيانة</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={loadLogs}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تحديث"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>

                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            تصدير
                        </button>
                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover:block z-10">
                            <button onClick={handleExportCSV} className="block w-full text-right px-4 py-2 hover:bg-gray-50 text-sm">
                                تصدير كـ CSV
                            </button>
                            <button onClick={handleExportJSON} className="block w-full text-right px-4 py-2 hover:bg-gray-50 text-sm">
                                تصدير كـ JSON
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleClearLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                        <TrashIcon className="w-5 h-5" />
                        مسح السجل
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-gray-500 text-sm mb-1">إجمالي الأخطاء</div>
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-gray-500 text-sm mb-1">أخطاء آخر 24 ساعة</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.last24Hours}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-gray-500 text-sm mb-1">أكثر مسار فيه أخطاء</div>
                        <div className="text-lg font-medium text-red-600 truncate" title={stats.mostCommonEndpoint || 'لا يوجد'}>
                            {stats.mostCommonEndpoint || '-'}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-gray-500 text-sm mb-1">نوع الخطأ الأكثر شيوعاً</div>
                        <div className="text-lg font-medium text-orange-600">
                            {Object.entries(stats.byType).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Logs List */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900">سجل العمليات</h2>
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="w-4 h-4 text-gray-500" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="text-sm border-none bg-transparent focus:ring-0 text-gray-600 font-medium cursor-pointer"
                            >
                                <option value="all">الكل</option>
                                <option value="server">Server</option>
                                <option value="network">Network</option>
                                <option value="auth">Auth</option>
                                <option value="validation">Validation</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                لا توجد سجلات
                            </div>
                        ) : (
                            filteredLogs.map((log, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedLog(log)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedLog === log
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.errorState.errorType === 'server' ? 'bg-red-100 text-red-700' :
                                                log.errorState.errorType === 'network' ? 'bg-gray-100 text-gray-700' :
                                                    log.errorState.errorType === 'auth' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-orange-100 text-orange-700'
                                            }`}>
                                            {log.errorState.errorType}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-900 font-medium truncate mb-1">
                                        {log.errorState.errorMessage}
                                    </div>
                                    {log.errorState.details?.endpoint && (
                                        <div className="text-xs text-gray-500 truncate font-mono">
                                            {log.errorState.details.method} {log.errorState.details.endpoint}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Log Details */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {selectedLog ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedLog.errorState.errorType === 'server' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                        }`}>
                                        {selectedLog.errorState.errorType.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {new Date(selectedLog.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                                    {selectedLog.errorState.errorMessage}
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Session ID</div>
                                        <div className="text-sm font-mono text-gray-700">{selectedLog.sessionId || '-'}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">User Agent</div>
                                        <div className="text-sm text-gray-700 truncate" title={selectedLog.userAgent}>{selectedLog.userAgent}</div>
                                    </div>
                                </div>

                                {/* Technical Details */}
                                {selectedLog.errorState.details && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b">
                                            تفاصيل الطلب (Request Details)
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-3 rounded-lg bg-gray-900 text-gray-300 font-mono text-sm">
                                                <div className="text-xs text-gray-500 mb-1">Method</div>
                                                <span className="text-yellow-400">{selectedLog.errorState.details.method}</span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-gray-900 text-gray-300 font-mono text-sm">
                                                <div className="text-xs text-gray-500 mb-1">Status Code</div>
                                                <span className={selectedLog.errorState.details.statusCode && selectedLog.errorState.details.statusCode >= 400 ? 'text-red-400' : 'text-green-400'}>
                                                    {selectedLog.errorState.details.statusCode || '-'}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-gray-900 text-gray-300 font-mono text-sm">
                                                <div className="text-xs text-gray-500 mb-1">Endpoint</div>
                                                <span className="text-blue-300 break-all">{selectedLog.errorState.details.endpoint}</span>
                                            </div>
                                        </div>

                                        {selectedLog.errorState.details.requestData && (
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-2">Request Body</div>
                                                <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-40">
                                                    {JSON.stringify(selectedLog.errorState.details.requestData, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {selectedLog.errorState.details.responseData && (
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-2">Response Body</div>
                                                <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-60 border-l-4 border-red-500">
                                                    {typeof selectedLog.errorState.details.responseData === 'object'
                                                        ? JSON.stringify(selectedLog.errorState.details.responseData, null, 2)
                                                        : selectedLog.errorState.details.responseData
                                                    }
                                                </pre>
                                            </div>
                                        )}

                                        {selectedLog.errorState.details.stackTrace && process.env.NODE_ENV === 'development' && (
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-2">Stack Trace</div>
                                                <pre className="bg-gray-50 text-red-800 p-4 rounded-lg text-[10px] font-mono overflow-auto whitespace-pre max-h-60 border border-gray-200">
                                                    {selectedLog.errorState.details.stackTrace}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-gray-400 p-8 text-center">
                            <ExclamationTriangleIcon className="w-16 h-16 mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-gray-900">لم يتم تحديد خطأ</h3>
                            <p className="mt-1">اختر سجلاً من القائمة لعرض التفاصيل الكاملة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrorLogsPage;
