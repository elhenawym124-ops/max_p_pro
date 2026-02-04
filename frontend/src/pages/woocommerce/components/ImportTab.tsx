import React, { useEffect } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    PauseIcon,
    PlayIcon,
    StopIcon,
    XCircleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StatusBadge } from './shared/StatusBadge';
import { useCurrency } from '../../../hooks/useCurrency';
import { useWooCommerceImport } from '../hooks/useWooCommerceImport';
import { Settings } from '../types';

interface ImportTabProps {
    settings: Settings | null;
}

export const ImportTab: React.FC<ImportTabProps> = ({ settings }) => {
    const { formatPrice } = useCurrency();
    const {
        loading,
        importing,
        wooOrders,
        activeJob,
        totalOrdersCount,
        countingOrders,
        selectedWooOrders,
        setSelectedWooOrders,
        loadActiveJobs,
        fetchOrdersCount,
        fetchWooOrders,
        startBackendImport,
        pauseBackendImport,
        resumeBackendImport,
        cancelBackendImport,
        importSelectedOrders,
        showImportOptions,
        setShowImportOptions,
        importOptions,
        setImportOptions
    } = useWooCommerceImport(settings);

    // Load active jobs on mount
    useEffect(() => {
        loadActiveJobs();
    }, []);

    return (
        <div>
            {/* Active Import Status Banner */}
            {activeJob && (
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {activeJob.status === 'running' && <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />}
                            {activeJob.status === 'paused' && <PauseIcon className="h-5 w-5 text-yellow-600" />}
                            {activeJob.status === 'failed' && <XCircleIcon className="h-5 w-5 text-red-600" />}
                            {activeJob.status === 'completed' && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                            <span className="font-bold text-gray-900 dark:text-white">
                                {activeJob.status === 'running' && '🚀 جاري الاستيراد في الخلفية...'}
                                {activeJob.status === 'paused' && '⏸️ الاستيراد متوقف مؤقتاً'}
                                {activeJob.status === 'failed' && '❌ فشل الاستيراد'}
                                {activeJob.status === 'completed' && '✅ تم اكتمال الاستيراد'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeJob.status === 'running' && (
                                <button
                                    onClick={pauseBackendImport}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-yellow-600"
                                    title="إيقاف مؤقت"
                                >
                                    <PauseIcon className="h-5 w-5" />
                                </button>
                            )}
                            {activeJob.status === 'paused' && (
                                <button
                                    onClick={resumeBackendImport}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-green-600"
                                    title="استئناف"
                                >
                                    <PlayIcon className="h-5 w-5" />
                                </button>
                            )}
                            {(activeJob.status === 'running' || activeJob.status === 'paused') && (
                                <button
                                    onClick={cancelBackendImport}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-600"
                                    title="إلغاء الأمر"
                                >
                                    <StopIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
                        <div
                            className={`h-4 rounded-full transition-all duration-500 ${activeJob.status === 'failed' ? 'bg-red-500' :
                                activeJob.status === 'completed' ? 'bg-green-500' :
                                    activeJob.status === 'paused' ? 'bg-yellow-500' :
                                        'bg-blue-600'
                                }`}
                            style={{ width: `${Math.max(5, activeJob.progress.percentage)}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <span>
                            تم معالجة {activeJob.progress.processedOrders} من {activeJob.progress.grandTotal} طلب
                            ({Math.round(activeJob.progress.percentage)}%)
                        </span>
                        <div className="flex gap-4">
                            {activeJob.progress.imported > 0 && <span className="text-green-600">تم استيراد: {activeJob.progress.imported}</span>}
                            {activeJob.progress.updated > 0 && <span className="text-blue-600">تم تحديث: {activeJob.progress.updated}</span>}
                            {activeJob.progress.failed > 0 && <span className="text-red-600">فشل: {activeJob.progress.failed}</span>}
                            {activeJob.progress.skipped > 0 && <span className="text-gray-500">تم تخطي: {activeJob.progress.skipped}</span>}
                        </div>
                    </div>

                    {activeJob.progress.error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                            <strong>خطأ:</strong> {activeJob.progress.error}
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6 mb-8">
                <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">استيراد الطلبات</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        جلب الطلبات من WooCommerce إلى النظام المحلي
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-end">
                    <button
                        onClick={() => setShowImportOptions(!showImportOptions)}
                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                    >
                        ⚙️ خيارات متقدمة
                    </button>
                    <button
                        onClick={fetchOrdersCount}
                        disabled={countingOrders}
                        className="px-4 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        {countingOrders ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : '📊'}
                        {totalOrdersCount !== null ? `الإجمالي: ${totalOrdersCount}` : 'فحص العدد'}
                    </button>
                </div>
            </div>

            {/* Import Options Panel */}
            {showImportOptions && (
                <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">العدد</label>
                        <select
                            value={importOptions.limit}
                            onChange={(e) => setImportOptions(prev => ({ ...prev, limit: e.target.value as any }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        >
                            <option value="10">آخر 10 طلبات</option>
                            <option value="50">آخر 50 طلب</option>
                            <option value="100">آخر 100 طلب</option>
                            <option value="all">كل الطلبات (استيراد كامل)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">الحالة</label>
                        <select
                            value={importOptions.status}
                            onChange={(e) => setImportOptions(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        >
                            <option value="any">أي حالة</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="on-hold">On Hold</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">عند التكرار</label>
                        <select
                            value={importOptions.duplicateAction}
                            onChange={(e) => setImportOptions(prev => ({ ...prev, duplicateAction: e.target.value as any }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                        >
                            <option value="skip">تجاهل (Skip)</option>
                            <option value="update">تحديث (Update)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">الإجراء</label>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchWooOrders}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 rounded-lg text-sm text-gray-700 dark:text-gray-200"
                                title="معاينة الطلبات قبل الاستيراد"
                            >
                                👁️ معاينة
                            </button>
                            <button
                                onClick={startBackendImport}
                                disabled={importing || !!activeJob}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm"
                                title="بدء عملية الاستيراد في الخلفية مباشرة"
                            >
                                {importing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
                                بدء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Table */}
            {wooOrders.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span>نتائج المعاينة</span>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{wooOrders.length}</span>
                        </div>
                        {selectedWooOrders.size > 0 && (
                            <button
                                onClick={importSelectedOrders}
                                disabled={importing}
                                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                استيراد المحدد ({selectedWooOrders.size})
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedWooOrders.size === wooOrders.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedWooOrders(new Set(wooOrders.map(o => o.wooCommerceId)));
                                                else setSelectedWooOrders(new Set());
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-offset-0 focus:ring-1"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">الطلب</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">العميل</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">الإجمالي</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">التاريخ</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">في النظام؟</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {wooOrders.map(order => (
                                    <tr key={order.wooCommerceId} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedWooOrders.has(order.wooCommerceId)}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedWooOrders);
                                                    if (e.target.checked) newSet.add(order.wooCommerceId);
                                                    else newSet.delete(order.wooCommerceId);
                                                    setSelectedWooOrders(newSet);
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-offset-0 focus:ring-1"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{order.orderNumber}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            <div>{order.customerName}</div>
                                            <div className="text-xs text-gray-400">{order.customerEmail}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={order.wooCommerceStatus} />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">{formatPrice(order.total, order.currency)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500" dir="ltr">
                                            {new Date(order.wooCommerceDateCreated).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            {order.localStatus ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    موجود ({order.localStatus})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    جديد
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
