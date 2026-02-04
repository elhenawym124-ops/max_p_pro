import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
    ArrowUturnLeftIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EscalationLog {
    id: string;
    taskId: string;
    task: {
        id: string;
        title: string;
    };
    memberId: string;
    member: {
        user: {
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    };
    description: string;
    createdAt: string;
    fromUser: string;
    toUser: string;
}

const EscalationHistory = () => {
    const [logs, setLogs] = useState<EscalationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchHistory();
    }, [page]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(buildApiUrl(`super-admin/dev/escalations?page=${page}&limit=20`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLogs(data.data);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <ClockIcon className="h-8 w-8 text-indigo-500" />
                        سجل تصعيد المهام
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">تتبع المهام التي تم نقلها تلقائياً بسبب التأخير.</p>
                </div>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                    عودة
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">المهمة</th>
                                <th className="px-6 py-4 font-medium">نقل من</th>
                                <th className="px-6 py-4 font-medium">نقل إلى</th>
                                <th className="px-6 py-4 font-medium">السبب / الوصف</th>
                                <th className="px-6 py-4 font-medium">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        لا توجد سجلات تصعيد حتى الآن.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <a
                                                href={`/super-admin/dev-tasks/${log.task.id}`}
                                                className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 block truncate max-w-xs"
                                                title={log.task.title}
                                            >
                                                {log.task.title}
                                            </a>
                                            <span className="text-xs text-gray-400 font-mono">{log.task.id.slice(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                    {log.fromUser.charAt(0)}
                                                </div>
                                                <span>{log.fromUser}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                    {log.toUser.charAt(0)}
                                                </div>
                                                <span>{log.toUser}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {format(new Date(log.createdAt), 'PPP p', { locale: ar })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            السابق
                        </button>
                        <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
                            صفحة {page} من {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            التالي
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EscalationHistory;
