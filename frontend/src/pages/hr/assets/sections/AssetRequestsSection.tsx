import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    CheckBadgeIcon,
    TagIcon,
    ChatBubbleLeftEllipsisIcon,
    UserIcon,
    ComputerDesktopIcon,
    ArrowRightCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { companyAwareApi } from '../../../../services/companyAwareApi';
import { toast } from 'react-hot-toast';

interface AssetRequest {
    id: string;
    requestedBy: string;
    assetType: string;
    category?: string;
    reason: string;
    priority: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';
    createdAt: string;
    requester?: {
        firstName: string;
        lastName: string;
        employeeNumber: string;
    };
    rejectionReason?: string;
    assetId?: string;
}

const AssetRequestsSection: React.FC = () => {
    const [view, setView] = useState<'employee' | 'hr'>('employee');
    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [newRequest, setNewRequest] = useState({
        assetType: 'حاسوب محمول (Laptop)',
        reason: '',
        priority: 'NORMAL'
    });

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const endpoint = view === 'hr' ? '/assets/requests/all' : '/assets/requests/my';
            const response = await companyAwareApi.get(endpoint);
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            // Fallback to mock if API fails during testing
            if (requests.length === 0) {
                setRequests([
                    {
                        id: 'REQ-MOCK',
                        requestedBy: 'me',
                        assetType: 'Laptop (Mock)',
                        reason: 'API Connection Error - Showing Mock',
                        priority: 'NORMAL',
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                    }
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [view]);

    const handleCreateRequest = async () => {
        if (!newRequest.reason) {
            toast.error('يرجى ذكر سبب الطلب');
            return;
        }
        try {
            console.log('🚀 Calling POST /assets/requests');
            const response = await companyAwareApi.post('/assets/requests', newRequest);
            if (response.data.success) {
                toast.success('تم إرسال الطلب بنجاح');
                setShowRequestModal(false);
                fetchRequests();
            }
        } catch (error) {
            toast.error('فشل في إرسال الطلب');
        }
    };

    const handleUpdateStatus = async (requestId: string, status: string, rejectionReason?: string) => {
        try {
            const response = await companyAwareApi.put(`/assets/requests/${requestId}/status`, {
                status,
                rejectionReason
            });
            if (response.data.success) {
                toast.success(status === 'APPROVED' ? 'تمت الموافقة' : 'تم الرفض');
                fetchRequests();
            }
        } catch (error) {
            toast.error('فشل في تحديث حالة الطلب');
        }
    };

    const getStatusColor = (status: AssetRequest['status']) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            case 'FULFILLED': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status: AssetRequest['status']) => {
        switch (status) {
            case 'PENDING': return 'قيد الانتظار';
            case 'APPROVED': return 'تمت الموافقة';
            case 'REJECTED': return 'مرفوض';
            case 'FULFILLED': return 'تم التسليم';
            case 'CANCELLED': return 'ملغى';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ArrowRightCircleIcon className="h-7 w-7 text-indigo-600" />
                        نظام طلبات العهدة والأصول
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        تقديم طلبات عهدة جديدة ومتابعة حالات الموافقة والتخصيص (يدعم إشعارات WhatsApp)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRequests}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button
                            onClick={() => setView('employee')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'employee'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            طلباتي
                        </button>
                        <button
                            onClick={() => setView('hr')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'hr'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            إدارة HR
                        </button>
                    </div>
                </div>
            </div>

            {view === 'employee' ? (
                <div className="space-y-6">
                    {/* Employee Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-3 text-amber-600 mb-2">
                                <ClockIcon className="h-5 w-5" />
                                <span className="text-sm font-bold">طلبات معلقة</span>
                            </div>
                            <p className="text-2xl font-black dark:text-white">{requests.filter(r => r.status === 'PENDING').length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-3 text-blue-600 mb-2">
                                <CheckBadgeIcon className="h-5 w-5" />
                                <span className="text-sm font-bold">تمت الموافقة</span>
                            </div>
                            <p className="text-2xl font-black dark:text-white">{requests.filter(r => r.status === 'APPROVED').length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="w-full h-full flex flex-col items-center justify-center gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all border-2 border-dashed border-indigo-200 dark:border-indigo-800 py-2"
                            >
                                <PlusIcon className="h-6 w-6" />
                                <span className="font-bold">طلب جديد</span>
                            </button>
                        </div>
                    </div>

                    {/* My Requests Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-x-auto">
                        <table className="w-full text-right min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-xs font-bold uppercase tracking-wider text-right">
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4">السبب</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">لا توجد طلبات حالياً</td>
                                    </tr>
                                ) : requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium dark:text-gray-300">
                                                {format(new Date(req.createdAt), 'yyyy/MM/dd')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <ComputerDesktopIcon className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white">{req.assetType}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(req.status)}`}>
                                                {getStatusText(req.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{req.reason}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">إدارة طلبات الموظفين</h3>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            {requests.filter(r => r.status === 'PENDING').length} طلب بانتظار القرار
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {requests.filter(r => r.status === 'PENDING').map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-800">
                                            <UserIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{req.requester?.firstName} {req.requester?.lastName}</h4>
                                            <p className="text-xs text-gray-400 font-mono">{req.requester?.employeeNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-xs font-bold dark:text-gray-300">{format(new Date(req.createdAt), 'PPP', { locale: ar })}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <TagIcon className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-bold dark:text-white">المطلوب: {req.assetType}</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">" {req.reason} "</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="h-5 w-5" />
                                        موافقة وارسال WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            const res = prompt('سبب الرفض:');
                                            if (res) handleUpdateStatus(req.id, 'REJECTED', res);
                                        }}
                                        className="flex-1 bg-white dark:bg-gray-700 border border-red-200 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircleIcon className="h-5 w-5" />
                                        رفض
                                    </button>
                                </div>
                            </div>
                        ))}

                        {requests.filter(r => r.status === 'APPROVED').map(req => (
                            <div key={req.id} className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">معتمد - بانتظار التسليم</span>
                                    <span className="text-[10px] text-gray-400">{req.id}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{req.requester?.firstName} {req.requester?.lastName}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">تمت الموافقة على {req.assetType}. يرجى تخصيص أصل فعلي لإتمام العملية.</p>
                                <button className="w-full bg-white dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 py-3 rounded-xl text-sm font-black hover:bg-indigo-600 hover:text-white transition-all">
                                    تخصيص وتسليم الأصل
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">تقديم طلب عهدة</h3>
                            <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">نوع الأصل المطلوب</label>
                                <select
                                    value={newRequest.assetType}
                                    onChange={(e) => setNewRequest({ ...newRequest, assetType: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white"
                                >
                                    <option>حاسوب محمول (Laptop)</option>
                                    <option>هاتف ذكي (Mobile)</option>
                                    <option>شاشة (Monitor)</option>
                                    <option>كرسي مكتبي</option>
                                    <option>أدوات قرطاسية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">الأولوية</label>
                                <div className="flex gap-2">
                                    {['NORMAL', 'HIGH', 'URGENT'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setNewRequest({ ...newRequest, priority: p })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${newRequest.priority === p
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400'
                                                }`}
                                        >
                                            {p === 'NORMAL' ? 'عادية' : p === 'HIGH' ? 'عالية' : 'عاجل'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">سبب الطلب</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white h-32"
                                    placeholder="لماذا تحتاج هذه العهدة؟"
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleCreateRequest}
                                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
                            >
                                إرسال الطلب
                            </button>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetRequestsSection;
