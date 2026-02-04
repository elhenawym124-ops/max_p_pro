import React, { useState, useEffect } from 'react';
import {
    ClipboardDocumentListIcon,
    CheckCircleIcon,
    XCircleIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../../services/apiClient';

interface AssetRequest {
    id: string;
    assetType: string;
    category?: string;
    reason: string;
    priority: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';
    requestedBy: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    fulfilledBy?: string;
    fulfilledAt?: string;
    notes?: string;
    createdAt: string;
    asset?: {
        id: string;
        name: string;
        code: string;
        status: string;
    };
}

const AssetRequests: React.FC = () => {
    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showFulfillModal, setShowFulfillModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState('');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/hr/assets/requests/all');
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        try {
            const response = await apiClient.post(`/hr/assets/requests/${selectedRequest.id}/approve`, {
                notes: approvalNotes
            });

            if (response.data.success) {
                loadRequests();
                setShowApproveModal(false);
                setApprovalNotes('');
                setSelectedRequest(null);
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('فشل في الموافقة على الطلب');
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !rejectionReason.trim()) {
            alert('يرجى إدخال سبب الرفض');
            return;
        }

        try {
            const response = await apiClient.post(`/hr/assets/requests/${selectedRequest.id}/reject`, {
                rejectionReason
            });

            if (response.data.success) {
                loadRequests();
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('فشل في رفض الطلب');
        }
    };

    const handleFulfill = async () => {
        if (!selectedRequest || !selectedAssetId) {
            alert('يرجى اختيار الأصل');
            return;
        }

        try {
            const response = await apiClient.post(`/hr/assets/requests/${selectedRequest.id}/fulfill`, {
                assetId: selectedAssetId
            });

            if (response.data.success) {
                loadRequests();
                setShowFulfillModal(false);
                setSelectedAssetId('');
                setSelectedRequest(null);
                alert('تم تخصيص الأصل بنجاح');
            }
        } catch (error) {
            console.error('Error fulfilling request:', error);
            alert('فشل في تخصيص الأصل');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-blue-100 text-blue-800',
            REJECTED: 'bg-red-100 text-red-800',
            FULFILLED: 'bg-green-100 text-green-800',
            CANCELLED: 'bg-gray-100 text-gray-800'
        };
        return badges[status as keyof typeof badges] || badges.PENDING;
    };

    const getStatusText = (status: string) => {
        const texts = {
            PENDING: 'قيد الانتظار',
            APPROVED: 'موافق عليه',
            REJECTED: 'مرفوض',
            FULFILLED: 'تم التنفيذ',
            CANCELLED: 'ملغي'
        };
        return texts[status as keyof typeof texts] || status;
    };

    const getPriorityBadge = (priority: string) => {
        const badges = {
            LOW: 'bg-gray-100 text-gray-800',
            NORMAL: 'bg-blue-100 text-blue-800',
            HIGH: 'bg-orange-100 text-orange-800',
            URGENT: 'bg-red-100 text-red-800'
        };
        return badges[priority as keyof typeof badges] || badges.NORMAL;
    };

    const filteredRequests = requests.filter(req => {
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesSearch = req.assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (req.category?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    طلبات العهدة
                </h2>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="PENDING">قيد الانتظار</option>
                        <option value="APPROVED">موافق عليه</option>
                        <option value="REJECTED">مرفوض</option>
                        <option value="FULFILLED">تم التنفيذ</option>
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                نوع الأصل
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                السبب
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                الأولوية
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                الحالة
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                التاريخ
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                الإجراءات
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {request.assetType}
                                    </div>
                                    {request.category && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {request.category}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                        {request.reason}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(request.priority)}`}>
                                        {request.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                                        {getStatusText(request.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex gap-2">
                                        {request.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowApproveModal(true);
                                                    }}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="موافقة"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowRejectModal(true);
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="رفض"
                                                >
                                                    <XCircleIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                        {request.status === 'APPROVED' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowFulfillModal(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="تخصيص أصل"
                                            >
                                                تخصيص
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredRequests.length === 0 && (
                    <div className="text-center py-12">
                        <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            لا توجد طلبات
                        </p>
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            {showApproveModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            الموافقة على الطلب
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ملاحظات (اختياري)
                                </label>
                                <textarea
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="أضف ملاحظات..."
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setApprovalNotes('');
                                        setSelectedRequest(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleApprove}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                                >
                                    موافقة
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            رفض الطلب
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    سبب الرفض *
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="اكتب سبب الرفض..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason('');
                                        setSelectedRequest(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                    رفض
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fulfill Modal */}
            {showFulfillModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            تخصيص أصل
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اختر الأصل *
                                </label>
                                <input
                                    type="text"
                                    value={selectedAssetId}
                                    onChange={(e) => setSelectedAssetId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="معرف الأصل"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    سيتم تحسين هذا لاحقاً بقائمة منسدلة للأصول المتاحة
                                </p>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowFulfillModal(false);
                                        setSelectedAssetId('');
                                        setSelectedRequest(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleFulfill}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                >
                                    تخصيص
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetRequests;
