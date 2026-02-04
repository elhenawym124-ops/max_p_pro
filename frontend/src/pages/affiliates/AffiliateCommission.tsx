import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import {
    BanknotesIcon,
    CreditCardIcon,
    ClockIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const AffiliateCommission: React.FC = () => {
    const { formatPrice } = useCurrency();
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [affiliate, setAffiliate] = useState<any>(null);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [expectedCommission, setExpectedCommission] = useState(0);

    // Payout Modal State
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [submittingPayout, setSubmittingPayout] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [affiliateRes, payoutsRes, commissionsRes] = await Promise.all([
                apiClient.get('/affiliates/me'),
                apiClient.get('/affiliates/payouts'),
                apiClient.get('/affiliates/commissions?limit=20') // Get recent commissions
            ]);

            if (affiliateRes.data.success) {
                setAffiliate(affiliateRes.data.data);
            }

            if (payoutsRes.data.success) {
                setPayouts(payoutsRes.data.data);
            }

            if (commissionsRes.data.success) {
                const commissionsData = commissionsRes.data.data?.commissions || [];
                setCommissions(commissionsData);
                
                // حساب العمولة المتوقعة من الطلبات غير المستلمة
                const expectedAmount = commissionsData
                    .filter((comm: any) => {
                        const status = comm.order?.status || comm.status;
                        // الطلبات التي لم تُستلم بعد: PENDING, CONFIRMED, PROCESSING, SHIPPED
                        return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(status);
                    })
                    .reduce((sum: number, comm: any) => sum + (parseFloat(comm.amount) || 0), 0);
                
                setExpectedCommission(expectedAmount);
            }
        } catch (error) {
            console.error('Error loading commission data:', error);
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payoutAmount || Number(payoutAmount) <= 0) {
            toast.error('الرجاء إدخال مبلغ صالح');
            return;
        }

        if (Number(payoutAmount) > Number(affiliate?.pendingEarnings || 0)) {
            toast.error('المبلغ المطلوب أكبر من الرصيد المتاح');
            return;
        }

        try {
            setSubmittingPayout(true);
            const response = await apiClient.post('/affiliates/payout/request', {
                amount: Number(payoutAmount),
                paymentMethod,
                paymentDetails: { note: paymentDetails }
            });

            if (response.data.success) {
                toast.success('تم إرسال طلب السحب بنجاح');
                setShowPayoutModal(false);
                setPayoutAmount('');
                setPaymentDetails('');
                loadData(); // Reload data to update balance
            }
        } catch (error: any) {
            console.error('Error requesting payout:', error);
            toast.error(error.response?.data?.message || 'فشل طلب السحب');
        } finally {
            setSubmittingPayout(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'PENDING': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'PAID': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            case 'CANCELLED': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'مؤكدة';
            case 'PENDING': return 'قيد الانتظار'; // For payouts
            case 'PAID': return 'تم الدفع';
            case 'PAID_EXTERNAL': return 'تم الدفع';
            case 'PROCESSING': return 'قيد المعالجة';
            case 'CANCELLED': return 'ملغية';
            case 'FAILED': return 'فشل';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 w-full space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">العمولات والأرباح</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">متابعة الأرباح وطلبات السحب</p>
                </div>
                <button
                    onClick={() => setShowPayoutModal(true)}
                    disabled={affiliate?.pendingEarnings <= 0}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${affiliate?.pendingEarnings > 0
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 cursor-not-allowed text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                >
                    <BanknotesIcon className="w-5 h-5" />
                    طلب سحب الرصيد
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Withdrawable Balance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">الرصيد القابل للسحب</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-2">
                                {formatPrice(affiliate?.pendingEarnings || 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <BanknotesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        الحد الأدنى للسحب: {formatPrice(affiliate?.minPayout || 100)}
                    </p>
                </div>

                {/* Expected Commission */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">العمولة المتوقعة</p>
                            <h3 className="text-3xl font-bold text-orange-600 mt-2">
                                {formatPrice(expectedCommission)}
                            </h3>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        من الطلبات التي لم تُستلم بعد
                    </p>
                </div>

                {/* Total Earnings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي الأرباح</p>
                            <h3 className="text-3xl font-bold text-blue-600 mt-2">
                                {formatPrice(affiliate?.totalEarnings || 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        منذ بداية العمل
                    </p>
                </div>

                {/* Paid Earnings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">تم صرفه</p>
                            <h3 className="text-3xl font-bold text-purple-600 mt-2">
                                {formatPrice(affiliate?.paidEarnings || 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <CreditCardIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        إجمالي المبالغ المحولة
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent Payouts */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-gray-500" />
                            سجل طلبات السحب
                        </h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        {payouts.length > 0 ? (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">المبلغ</th>
                                        <th className="p-3">طريقة الدفع</th>
                                        <th className="p-3">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {payouts.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-600 dark:text-gray-300">
                                                {new Date(payout.createdAt).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="p-3 font-bold text-gray-900 dark:text-white">
                                                {formatPrice(payout.amount)}
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-300">
                                                {payout.paymentMethod}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(payout.status)}`}>
                                                    {getStatusText(payout.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                لا توجد عمليات سحب سابقة
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Commissions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-gray-500" />
                            أحدث العمولات
                        </h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        {commissions.length > 0 ? (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-3">رقم الطلب</th>
                                        <th className="p-3">قيمة الطلب</th>
                                        <th className="p-3">العمولة</th>
                                        <th className="p-3">التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {commissions.map((comm) => (
                                        <tr key={comm.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 text-blue-600 dark:text-blue-400 font-mono">
                                                {comm.order?.orderNumber || 'غير متوفر'}
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-300">
                                                {formatPrice(comm.orderTotal)}
                                            </td>
                                            <td className="p-3 font-bold text-green-600 dark:text-green-400">
                                                +{formatPrice(comm.amount)}
                                            </td>
                                            <td className="p-3 text-gray-500 text-xs">
                                                {new Date(comm.createdAt).toLocaleDateString('ar-EG')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                لا توجد عمولات مسجلة
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Payout Request Modal */}
            {showPayoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">طلب سحب جديد</h3>
                        </div>

                        <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    المبلغ المطلوب (الحد الأقصى: {formatPrice(affiliate?.pendingEarnings)})
                                </label>
                                <input
                                    type="number"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    max={affiliate?.pendingEarnings}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    طريقة الدفع
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">اختر طريقة الدفع</option>
                                    <option value="VODAFONE_CASH">فودافون كاش</option>
                                    <option value="INSTAPAY">إنستاباي</option>
                                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                                    <option value="OTHER">أخرى</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    بيانات التحويل (رقم المحفظة / الحساب)
                                </label>
                                <textarea
                                    value={paymentDetails}
                                    onChange={(e) => setPaymentDetails(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    required
                                    placeholder="مثال: 010xxxxxx"
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowPayoutModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPayout}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {submittingPayout ? (
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'تأكيد الطلب'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AffiliateCommission;

