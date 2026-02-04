import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    ChartBarIcon,
    ExclamationCircleIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';
import ThemeToggle from '../../components/ui/theme-toggle';

interface SearchStats {
    totalSearches: number;
    successRate: number;
    avgLatency: number;
    breakdown: any[];
}

interface FailedSearch {
    query: string;
    createdAt: string;
    customerId: string;
}

interface TopTerm {
    term: string;
    count: number;
}

const RAGAnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<SearchStats | null>(null);
    const [failedSearches, setFailedSearches] = useState<FailedSearch[]>([]);
    const [topTerms, setTopTerms] = useState<TopTerm[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('last_30_days');

    useEffect(() => {
        fetchAllData();
    }, [dateRange]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [statsRes, failedRes, termsRes] = await Promise.all([
                apiClient.get('/rag-analytics/stats'),
                apiClient.get('/rag-analytics/failed-searches?limit=50'),
                apiClient.get('/rag-analytics/top-terms')
            ]);

            if (statsRes.data.success) setStats(statsRes.data.data);
            if (failedRes.data.success) setFailedSearches(failedRes.data.data);
            if (termsRes.data.success) setTopTerms(termsRes.data.data);
        } catch (error) {
            console.error('Error fetching RAG analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                                <MagnifyingGlassIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
                                تحليلات البحث الذكي (RAG)
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">مراقبة أداء محرك البحث واحتياجات العملاء</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchAllData}
                                className="flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <ArrowPathIcon className="h-5 w-5 mr-2" />
                                تحديث البيانات
                            </button>
                            <ThemeToggle />
                        </div>
                    </div>

                    {/* KPI Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-r-4 border-blue-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي عمليات البحث</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalSearches}</p>
                                    </div>
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                        <MagnifyingGlassIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-r-4 border-green-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">نسبة النجاح (وجد نتائج)</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.successRate}%</p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stats.successRate > 80 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                                        {stats.successRate > 80 ? (
                                            <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-r-4 border-purple-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط سرعة الاستجابة</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.avgLatency}ms</p>
                                    </div>
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                        <ClockIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Search Terms */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                    <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-500 dark:text-indigo-400" />
                                    أكثر الكلمات بحثاً
                                </h3>
                            </div>
                            <div className="p-6">
                                {topTerms.length === 0 ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد بيانات كافية</p>
                                ) : (
                                    <div className="space-y-4">
                                        {topTerms.map((term, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <span className="text-gray-700 dark:text-gray-200 font-medium">{term.term}</span>
                                                <div className="flex items-center">
                                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                                                        <div
                                                            className="bg-indigo-500 dark:bg-indigo-400 h-2 rounded-full"
                                                            style={{ width: `${(term.count / topTerms[0].count) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[30px]">{term.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Failed Searches */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-red-800 dark:text-red-300 flex items-center">
                                    <XCircleIcon className="h-5 w-5 mr-2 text-red-500 dark:text-red-400" />
                                    أبحاث بلا نتائج (فرص ضائعة)
                                </h3>
                                <span className="bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full">آخر 50</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">عبارة البحث</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">التوقيت</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {failedSearches.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">ممتاز! لا توجد عمليات بحث فاشلة مؤخراً</td>
                                            </tr>
                                        ) : (
                                            failedSearches.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{item.query}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(item.createdAt).toLocaleString('ar-SA')}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
    );
};

export default RAGAnalyticsDashboard;

