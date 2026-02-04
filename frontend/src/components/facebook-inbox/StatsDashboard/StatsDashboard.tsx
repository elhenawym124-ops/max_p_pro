import React, { useMemo, useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { InboxConversation } from '../../types/inbox.types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../../services/apiClient';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface StatsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: InboxConversation[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ isOpen, onClose, conversations }) => {
    const [stats, setStats] = useState<{
        newConversationsCount: number;
        employeeRepliesToday: Array<{ employeeId: string; employeeName: string; conversationsRepliedTo: number }>;
    } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Fetch statistics when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStats = async () => {
        try {
            setLoadingStats(true);
            const response = await apiClient.get('/conversations/stats/daily');
            if (response.data?.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">📊 إحصائيات المحادثات</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1">
                    {/* New Conversations Count */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">المحادثات الجديدة</h3>
                                <p className="text-4xl font-bold text-blue-600">
                                    {loadingStats ? (
                                        <span className="text-lg">جاري التحميل...</span>
                                    ) : (
                                        stats?.newConversationsCount ?? conversations.filter(c => 
                                            c.lastMessageIsFromCustomer === true && 
                                            c.status !== 'done'
                                        ).length
                                    )}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">المحادثات التي لم يتم الرد عليها</p>
                            </div>
                            <div className="text-6xl opacity-20">💬</div>
                        </div>
                    </div>

                    {/* Employee Replies Today */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📈</span>
                            <span>ردود الموظفين اليوم</span>
                        </h3>
                        {loadingStats ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : stats?.employeeRepliesToday && stats.employeeRepliesToday.length > 0 ? (
                            <div className="space-y-3">
                                {stats.employeeRepliesToday.map((employee, index) => (
                                    <div key={employee.employeeId || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {employee.employeeName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{employee.employeeName}</p>
                                                <p className="text-xs text-gray-500">موظف</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-purple-600">{employee.conversationsRepliedTo}</p>
                                            <p className="text-xs text-gray-500">محادثة</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>لا توجد ردود اليوم</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsDashboard;
