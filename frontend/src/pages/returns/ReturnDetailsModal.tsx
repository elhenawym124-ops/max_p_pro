import React, { useState, useEffect } from 'react';
import { ReturnRequest, returnService, ContactAttempt, ActivityLog } from '../../services/returnService';
import { X, Phone, MessageCircle, Clock, CheckCircle, XCircle, Shield, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReturnDetailsModalProps {
    request: ReturnRequest;
    onClose: () => void;
    onUpdate: () => void;
}

const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({ request, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'contact' | 'activity'>('details');
    const [contactHistory, setContactHistory] = useState<ContactAttempt[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Contact Form
    const [contactMethod, setContactMethod] = useState('PHONE');
    const [contactResult, setContactResult] = useState('NO_ANSWER');
    const [contactNotes, setContactNotes] = useState('');

    // Review Form
    const [status, setStatus] = useState(request.status);
    const [responsibleParty, setResponsibleParty] = useState(request.responsibleParty);
    const [adminNotes, setAdminNotes] = useState(request.adminNotes || '');
    const [rejectionReason, setRejectionReason] = useState(request.rejectionReason || '');
    const [isReviewed, setIsReviewed] = useState(request.isReviewed);
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        if (activeTab !== 'details') {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            if (activeTab === 'contact') {
                const res = await returnService.getContactHistory(request.id);
                setContactHistory(res.data);
            } else if (activeTab === 'activity') {
                const res = await returnService.getActivityLog(request.id);
                setActivityLog(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleSaveReview = async () => {
        setSubmittingReview(true);
        try {
            await returnService.updateRequest(request.id, {
                status,
                responsibleParty,
                adminNotes,
                rejectionReason,
                isReviewed
            });
            toast.success('تم حفظ المراجعة وتحديث تقييم العميل إذا لزم الأمر');
            onUpdate();
        } catch (error) {
            toast.error('فشل في حفظ المراجعة');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await returnService.addContactAttempt(request.id, {
                method: contactMethod,
                result: contactResult,
                notes: contactNotes
            });
            toast.success('تم تسجيل المحاوله بنجاح');
            setContactNotes('');
            fetchLogs();
        } catch (error) {
            toast.error('فشل في تسجيل المحاوله');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> تم الموافقة</span>;
            case 'REJECTED': return <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-full text-xs flex items-center gap-1"><XCircle size={12} /> مرفوض</span>;
            case 'COMPLETED': return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> مكتمل</span>;
            default: return <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12} /> قيد الانتظار</span>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            طلب إرجاع #{request.order?.orderNumber}
                            {getStatusBadge(request.status)}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(request.createdAt).toLocaleString('ar-EG')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'details' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        تفاصيل الطلب
                    </button>
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'contact' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        سجل التواصل
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'activity' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        سجل النشاط
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">بيانات العميل</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">الاسم:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{request.customer?.firstName} {request.customer?.lastName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">الهاتف:</span>
                                            <span className="font-medium text-gray-900 dark:text-white" dir="ltr">{request.customer?.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">التقييم:</span>
                                            <span className="font-medium text-blue-600 dark:text-blue-400">{request.customer?.customerRating} ({request.customer?.successScore?.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">تفاصيل الإرجاع</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">السبب:</span>
                                            <span className="font-medium text-red-600 dark:text-red-400 font-bold">{request.reason?.reason}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">المبلغ المسترد:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{request.refundAmount || '-'}</span>
                                        </div>
                                        {request.isReviewed && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">تمت المراجعة في:</span>
                                                <span className="font-medium text-xs text-gray-900 dark:text-white">{request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-2">ملاحظات العميل</h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{request.customerNotes || 'لا توجد ملاحظات'}</p>
                            </div>

                            {/* Enhanced Review Form */}
                            <div className="bg-white dark:bg-gray-900/50 border-2 border-blue-100 dark:border-blue-900/30 p-4 rounded-lg space-y-4">
                                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                    <Shield size={16} /> مراجعة الطلب وتحديد المسؤولية
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الجهة المسؤولة</label>
                                        <select
                                            value={responsibleParty}
                                            onChange={(e) => setResponsibleParty(e.target.value as any)}
                                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                        >
                                            <option value="CUSTOMER">العميل (خطأ في القياس/تغيير رأي)</option>
                                            <option value="STORE">المتجر (خطأ في التجهيز/عيب فني)</option>
                                            <option value="SHIPPING">شركة الشحن (تلف/تأخير)</option>
                                            <option value="OTHER">أخرى</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">قرار الحالة</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as any)}
                                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                        >
                                            <option value="PENDING">قيد الانتظار</option>
                                            <option value="APPROVED">موافقة</option>
                                            <option value="REJECTED">رفض</option>
                                            <option value="COMPLETED">مكتمل</option>
                                        </select>
                                    </div>
                                </div>
                                {status === 'REJECTED' && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">سبب الرفض</label>
                                        <input
                                            type="text"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="اكتب سبب الرفض للعميل..."
                                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات إدارية (داخلية)</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows={2}
                                        className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isReviewed"
                                        checked={isReviewed}
                                        onChange={(e) => setIsReviewed(e.target.checked)}
                                        className="rounded text-blue-600 dark:text-blue-400"
                                    />
                                    <label htmlFor="isReviewed" className="text-xs font-bold text-gray-700 dark:text-gray-300">تأكيد إتمام المراجعة (سيتم تحديث تقييم العميل بناءً على المسؤولية)</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="space-y-6">
                            {/* Add Attempt Form */}
                            <form onSubmit={handleAddContact} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Phone size={16} /> تسجيل محاولة تواصل
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">طريقة التواصل</label>
                                        <select
                                            value={contactMethod}
                                            onChange={(e) => setContactMethod(e.target.value)}
                                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                                        >
                                            <option value="PHONE">📞 مكالمة هاتفية</option>
                                            <option value="WHATSAPP">💬 واتساب</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">النتيجة</label>
                                        <select
                                            value={contactResult}
                                            onChange={(e) => setContactResult(e.target.value)}
                                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                                        >
                                            <option value="NO_ANSWER">لم يرد</option>
                                            <option value="ANSWERED">تم الرد</option>
                                            <option value="BUSY">مشغول</option>
                                            <option value="WRONG_NUMBER">رقم خاطئ</option>
                                            <option value="CALL_BACK_LATER">طلب معاودة الاتصال</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات</label>
                                    <textarea
                                        value={contactNotes}
                                        onChange={(e) => setContactNotes(e.target.value)}
                                        className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                                        rows={2}
                                        placeholder="تفاصيل المكالمة..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                                >
                                    تسجيل المحاولة
                                </button>
                            </form>

                            {/* History List */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">السجل السابق</h3>
                                {loadingLogs ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm">جاري التحميل...</p>
                                ) : contactHistory.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-gray-400 dark:text-gray-500 text-sm">
                                        لا توجد محاولات تواصل مسجلة
                                    </div>
                                ) : (
                                    contactHistory.map((attempt) => (
                                        <div key={attempt.id} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex items-start gap-3">
                                            <div className={`p-2 rounded-full ${attempt.method === 'WHATSAPP' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                                {attempt.method === 'WHATSAPP' ? <MessageCircle size={16} /> : <Phone size={16} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-sm text-gray-900 dark:text-white block mb-1">
                                                            {attempt.user?.firstName} {attempt.user?.lastName}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                            {attempt.result}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {new Date(attempt.createdAt).toLocaleString('ar-EG')}
                                                    </span>
                                                </div>
                                                {attempt.notes && (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                                        "{attempt.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            {loadingLogs ? (
                                <p className="text-center text-gray-500 dark:text-gray-400">جاري التحميل...</p>
                            ) : activityLog.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">لا يوجد نشاط مسجل</p>
                            ) : (
                                <div className="relative border-r-2 border-gray-200 dark:border-gray-700 mr-4 space-y-8">
                                    {activityLog.map((log) => (
                                        <div key={log.id} className="relative flex items-start gap-4 mr-[-9px]">
                                            <div className="bg-white dark:bg-gray-800 p-1 rounded-full border-2 border-blue-500 dark:border-blue-400">
                                                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                                            </div>
                                            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                        {log.action}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {new Date(log.createdAt).toLocaleString('ar-EG')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                    قام <strong>{log.user?.firstName || 'سيستم'}</strong> بهذا الإجراء.
                                                </p>
                                                {log.details && (
                                                    <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono text-gray-500 dark:text-gray-400 overflow-x-auto">
                                                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        إغلاق
                    </button>
                    {activeTab === 'details' && (
                        <button
                            onClick={handleSaveReview}
                            disabled={submittingReview}
                            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {submittingReview ? 'جاري الحفظ...' : 'حفظ قرار المراجعة'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReturnDetailsModal;
