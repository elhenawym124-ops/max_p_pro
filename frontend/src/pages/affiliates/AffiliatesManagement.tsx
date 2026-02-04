import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import {
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    PencilIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Affiliate {
    id: string;
    userId: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    isActive: boolean;
    commissionType: 'PERCENTAGE' | 'MARKUP';
    commissionRate: number;
    totalEarnings: number;
    paidEarnings: number;
    pendingEarnings: number;
    totalSales: number;
    totalClicks: number;
    createdAt: string;
}

const AffiliatesManagement: React.FC = () => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [editingCommission, setEditingCommission] = useState<string | null>(null);
    const [newCommission, setNewCommission] = useState<number>(0);

    useEffect(() => {
        fetchAffiliates();
    }, []);

    const fetchAffiliates = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/affiliates/list');
            if (response.data.success) {
                setAffiliates(response.data.data);
            }
        } catch (error: any) {
            toast.error('فشل تحميل قائمة المسوقين');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (affiliateId: string, newStatus: string) => {
        try {
            const isActive = newStatus === 'ACTIVE';
            const response = await apiClient.put(`/affiliates/${affiliateId}/status`, {
                isActive
            });
            if (response.data.success) {
                toast.success('تم تحديث حالة المسوق بنجاح');
                fetchAffiliates();
            }
        } catch (error: any) {
            toast.error('فشل تحديث حالة المسوق');
        }
    };

    const updateCommission = async (affiliateId: string) => {
        try {
            const response = await apiClient.put(`/affiliates/${affiliateId}/commission`, {
                commissionRate: newCommission
            });
            if (response.data.success) {
                toast.success('تم تحديث العمولة بنجاح');
                setEditingCommission(null);
                fetchAffiliates();
            }
        } catch (error: any) {
            toast.error('فشل تحديث العمولة');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'PENDING': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'SUSPENDED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'نشط';
            case 'PENDING': return 'قيد المراجعة';
            case 'SUSPENDED': return 'موقوف';
            default: return status;
        }
    };

    const filteredAffiliates = affiliates.filter(affiliate => {
        const matchesSearch = affiliate.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            affiliate.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            affiliate.user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'ALL' || affiliate.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className={`p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
            <div className="w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
                            <UserGroupIcon className="h-9 w-9 ml-3 text-indigo-500" />
                            إدارة شبكة المسوقين (Premium)
                        </h1>
                        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            تحكم كامل في المسوقين والعمولات والبيانات المالية.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="text-sm text-gray-400 mb-1">الجمهور المستهدف</div>
                        <div className="text-3xl font-bold text-indigo-500">{affiliates.length}</div>
                        <div className="text-xs text-gray-500 mt-2">إجمالي المسوقين المسجلين</div>
                    </div>
                    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="text-sm text-gray-400 mb-1">ينتظرون التفعيل</div>
                        <div className="text-3xl font-bold text-orange-500">
                            {affiliates.filter(a => a.status === 'PENDING').length}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">طلبات تسجيل جديدة لم تراجع</div>
                    </div>
                    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="text-sm text-gray-400 mb-1">إجمالي المبيعات</div>
                        <div className="text-3xl font-bold text-green-500">
                            {affiliates.reduce((acc, curr) => acc + (curr.totalSales || 0), 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">إجمالي الطلبات المحققة</div>
                    </div>
                    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="text-sm text-gray-400 mb-1">إجمالي العمولات</div>
                        <div className="text-3xl font-bold text-blue-500">
                            {affiliates.reduce((acc, curr) => acc + (Number(curr.totalEarnings) || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">جنيه مصري مستحقة للمسوقين</div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم، البريد، أو الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pr-10 pl-4 py-3 rounded-xl border ${isDark
                                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                                : 'bg-white border-gray-200 text-gray-900 shadow-sm'
                                } outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === status
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : `${isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-white text-gray-600 border-gray-200'} border`
                                    }`}
                            >
                                {status === 'ALL' ? 'الكل' : getStatusLabel(status)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div className={`rounded-2xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} overflow-hidden shadow-sm`}>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                            <tr>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">المسوق</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">البيانات المالية</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">الأداء</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">العمولة اليدوية</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">الحالة</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredAffiliates.map((affiliate) => (
                                <tr key={affiliate.id} className={`${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                                    {/* المسوق */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {affiliate.user.firstName} {affiliate.user.lastName}
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1">{affiliate.user.email}</span>
                                            <span className="text-[10px] text-indigo-500 mt-0.5">{affiliate.user.phone || 'بدون هاتف'}</span>
                                        </div>
                                    </td>

                                    {/* البيانات المالية */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-xs max-w-[120px]">
                                                <span className="text-gray-500">الإجمالي:</span>
                                                <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{Number(affiliate.totalEarnings).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs max-w-[120px]">
                                                <span className="text-gray-500">المدفوع:</span>
                                                <span className="text-green-500 font-bold">{Number(affiliate.paidEarnings).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs max-w-[120px]">
                                                <span className="text-gray-500">المعلق:</span>
                                                <span className="text-orange-500 font-bold">{Number(affiliate.pendingEarnings).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* الأداء */}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col text-center">
                                                <span className="text-[10px] text-gray-400">مبيعات</span>
                                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{affiliate.totalSales}</span>
                                            </div>
                                            <div className="w-[1px] h-6 bg-gray-700/20"></div>
                                            <div className="flex flex-col text-center">
                                                <span className="text-[10px] text-gray-400">نقرات</span>
                                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{affiliate.totalClicks}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* العمولة */}
                                    <td className="px-6 py-5">
                                        {editingCommission === affiliate.id ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={newCommission}
                                                    onChange={(e) => setNewCommission(parseFloat(e.target.value))}
                                                    className={`w-16 px-2 py-1 rounded border text-xs ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}
                                                />
                                                <button onClick={() => updateCommission(affiliate.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded">✓</button>
                                                <button onClick={() => setEditingCommission(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">✗</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {affiliate.commissionRate}%
                                                </span>
                                                <button
                                                    onClick={() => { setEditingCommission(affiliate.id); setNewCommission(affiliate.commissionRate); }}
                                                    className="p-1 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-500/5 transition-all"
                                                >
                                                    <PencilIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>

                                    {/* الحالة */}
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${getStatusStyle(affiliate.status)}`}>
                                            {getStatusLabel(affiliate.status)}
                                        </span>
                                    </td>

                                    {/* الإجراءات */}
                                    <td className="px-6 py-5">
                                        <select
                                            value={affiliate.status}
                                            onChange={(e) => handleStatusUpdate(affiliate.id, e.target.value)}
                                            className={`text-xs px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-200'}`}
                                        >
                                            <option value="PENDING">مراجعة الطلب</option>
                                            <option value="ACTIVE">تفعيل المسوق</option>
                                            <option value="SUSPENDED">إيقاف (Suspend)</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredAffiliates.length === 0 && (
                        <div className={`p-20 text-center flex flex-col items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <UserGroupIcon className="h-12 w-12 mb-4 opacity-20" />
                            <p className="font-medium">لم يتم العثور على أي مسوقين يطابقون خيارات البحث.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AffiliatesManagement;

