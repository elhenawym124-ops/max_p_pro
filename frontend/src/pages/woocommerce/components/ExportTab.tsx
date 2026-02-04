import React, { useEffect } from 'react';
import {
    ArrowPathIcon,
    CloudArrowUpIcon,
    ShoppingCartIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StatusBadge } from './shared/StatusBadge';
import { useWooCommerceExport } from '../hooks/useWooCommerceExport';
import { Settings } from '../types';

export const ExportTab: React.FC = () => {
    const {
        localOrders,
        selectedLocalOrders,
        setSelectedLocalOrders,
        exporting,
        loading,
        fetchLocalOrders,
        exportSelectedOrders
    } = useWooCommerceExport();

    // Initial fetch
    useEffect(() => {
        fetchLocalOrders();
    }, []);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        تصدير الطلبات إلى WooCommerce
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        إرسال الطلبات المحلية إلى متجر WooCommerce
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                        onClick={fetchLocalOrders}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ArrowPathIcon className="h-5 w-5" />}
                        تحديث القائمة
                    </button>
                </div>
            </div>

            {(localOrders?.length || 0) > 0 && (
                <>
                    <div className="flex items-center justify-between mb-4">
                        {selectedLocalOrders.size} من {(localOrders?.length || 0)} طلب محدد
                        <button
                            onClick={exportSelectedOrders}
                            disabled={exporting || selectedLocalOrders.size === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? (
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                                <CloudArrowUpIcon className="h-5 w-5" />
                            )}
                            تصدير المحدد ({selectedLocalOrders.size})
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right">
                                        <input
                                            type="checkbox"
                                            checked={selectedLocalOrders.size === (localOrders?.length || 0)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedLocalOrders(new Set(localOrders.map(o => o.id)));
                                                } else {
                                                    setSelectedLocalOrders(new Set());
                                                }
                                            }}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">رقم الطلب</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">العميل</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">حالة المزامنة</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {localOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedLocalOrders.has(order.id)}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedLocalOrders);
                                                    if (e.target.checked) {
                                                        newSet.add(order.id);
                                                    } else {
                                                        newSet.delete(order.id);
                                                    }
                                                    setSelectedLocalOrders(newSet);
                                                }}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                            #{order.orderNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {order.customerName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {order.syncedToWoo ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    متزامن
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">غير متزامن</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {order.total}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {(localOrders?.length || 0) === 0 && !loading && (
                <div className="text-center py-12">
                    <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                        اضغط على "تحديث القائمة" لعرض الطلبات المحلية
                    </p>
                </div>
            )}
        </div>
    );
};
