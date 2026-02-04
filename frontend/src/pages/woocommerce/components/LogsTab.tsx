import React from 'react';
import { SyncLog } from '../types';

interface LogsTabProps {
    logs: SyncLog[];
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                سجل عمليات المزامنة
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">النوع</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">مكتمل</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">فشل</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">تفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white" dir="ltr">
                                    {new Date(log.startedAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                    {log.syncType === 'auto_sync' ? 'مزامنة تلقائية' : 'مزامنة يدوية'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${log.status === 'success'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : log.status === 'partial'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}>
                                        {log.status === 'success' ? 'ناجح' : log.status === 'partial' ? 'جزئي' : 'فشل'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-medium">
                                    {log.successCount}
                                </td>
                                <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-medium">
                                    {log.failedCount}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    {log.errorMessage ? (
                                        <span title={JSON.stringify(log.errorDetails)}>{log.errorMessage}</span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    لا توجد سجلات مزامنة حتى الآن
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
