import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Zap,
  Gift,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface WalletData {
  id: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  totalRefunded: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  paymentMethod?: string;
  metadata?: any;
}

interface BillingSummary {
  period: {
    start: string;
    end: string;
  };
  costs: {
    subscriptions: number;
    usage: number;
    total: number;
  };
  wallet: {
    balance: number;
    currency: string;
  };
  activeApps: number;
  usageBreakdown: any[];
}

const transactionIcons: Record<string, any> = {
  DEPOSIT: ArrowDownRight,
  DEDUCT: ArrowUpRight,
  REFUND: ArrowDownRight,
  BONUS: Gift,
  ADJUSTMENT: Zap
};

const transactionColors: Record<string, string> = {
  DEPOSIT: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  DEDUCT: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  REFUND: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  BONUS: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  ADJUSTMENT: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
};

// Helper function to safely convert Prisma Decimal to number
const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value.toString());
};

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      if (!token) {
        navigate('/auth/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [walletRes, transactionsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/wallet/balance`, { headers }),
        axios.get(`${API_URL}/api/v1/wallet/transactions?limit=20`, { headers }),
        axios.get(`${API_URL}/api/v1/wallet/billing/summary`, { headers })
      ]);

      setWallet(walletRes.data.data);
      setTransactions(transactionsRes.data.data);
      setBillingSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('خطأ في جلب بيانات المحفظة');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      const token = tokenManager.getAccessToken();
      const response = await axios.post(
        `${API_URL}/api/v1/wallet/recharge`,
        { 
          amount,
          paymentMethod: 'manual',
          reference: `RECHARGE-${Date.now()}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || 'تم شحن المحفظة بنجاح! 💰');
      setShowRechargeModal(false);
      setRechargeAmount('');
      fetchWalletData();
    } catch (error: any) {
      console.error('Error recharging wallet:', error);
      toast.error(error.response?.data?.message || 'خطأ في شحن المحفظة');
    }
  };

  const getBonusInfo = (amount: number) => {
    if (amount >= 5000) return { percentage: 30, bonus: amount * 0.30 };
    if (amount >= 1000) return { percentage: 20, bonus: amount * 0.20 };
    if (amount >= 500) return { percentage: 15, bonus: amount * 0.15 };
    if (amount >= 100) return { percentage: 10, bonus: amount * 0.10 };
    return { percentage: 0, bonus: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const currentAmount = parseFloat(rechargeAmount) || 0;
  const bonusInfo = getBonusInfo(currentAmount);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <WalletIcon size={40} />
              المحفظة والفواتير
            </h1>
            <p className="text-xl text-green-100">
              إدارة رصيدك ومتابعة مصروفاتك
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-blue-100 mb-2">رصيد المحفظة</p>
              <div className="text-5xl font-bold">
                {toNumber(wallet?.balance).toFixed(2)} {wallet?.currency}
              </div>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <CreditCard size={20} />
              شحن المحفظة
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <TrendingDown size={16} />
                <span className="text-sm">إجمالي الشحن</span>
              </div>
              <div className="text-2xl font-bold">
                {toNumber(wallet?.totalDeposited).toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <TrendingUp size={16} />
                <span className="text-sm">إجمالي المصروفات</span>
              </div>
              <div className="text-2xl font-bold">
                {toNumber(wallet?.totalSpent).toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <Gift size={16} />
                <span className="text-sm">المسترجع</span>
              </div>
              <div className="text-2xl font-bold">
                {toNumber(wallet?.totalRefunded).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Billing Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Month Summary */}
            {billingSummary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Calendar size={24} />
                  ملخص هذا الشهر
                </h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      الاشتراكات
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {billingSummary.costs.subscriptions} ج
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      الاستخدام
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {toNumber(billingSummary.costs.usage).toFixed(2)} ج
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      الإجمالي
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {toNumber(billingSummary.costs.total).toFixed(2)} ج
                    </div>
                  </div>
                </div>

                {/* Usage Breakdown */}
                {billingSummary.usageBreakdown.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      تفاصيل الاستخدام:
                    </h3>
                    <div className="space-y-2">
                      {billingSummary.usageBreakdown.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.feature}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {item._sum.quantity} عملية
                            </div>
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {toNumber(item._sum.totalCost).toFixed(2)} ج
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={24} />
                  آخر الحركات
                </h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  عرض الكل
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  لا توجد حركات بعد
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => {
                    const Icon = transactionIcons[transaction.type] || DollarSign;
                    const colorClass = transactionColors[transaction.type] || 'text-gray-600 bg-gray-100';
                    const isPositive = ['DEPOSIT', 'REFUND', 'BONUS'].includes(transaction.type);

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {transaction.description}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(transaction.createdAt).toLocaleString('ar-EG')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}{toNumber(transaction.amount).toFixed(2)} ج
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            الرصيد: {toNumber(transaction.balanceAfter).toFixed(2)} ج
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                إجراءات سريعة
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/my-apps')}
                  className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Package size={18} />
                  أدواتي المفعلة
                </button>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="w-full bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Zap size={18} />
                  تصفح Marketplace
                </button>
                <button className="w-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Download size={18} />
                  تحميل الفواتير
                </button>
              </div>
            </div>

            {/* Recharge Packages */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Gift size={20} className="text-yellow-600" />
                باقات الشحن
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">100-499 ج</span>
                  <span className="font-bold text-yellow-600">بونص 10%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">500-999 ج</span>
                  <span className="font-bold text-yellow-600">بونص 15%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">1000-4999 ج</span>
                  <span className="font-bold text-yellow-600">بونص 20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">5000+ ج</span>
                  <span className="font-bold text-yellow-600">بونص 30%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              💵 شحن المحفظة
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المبلغ (جنيه مصري)
              </label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {bonusInfo.bonus > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 mb-2">
                  <Gift size={20} />
                  <span className="font-bold">مكافأة الشحن!</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  ستحصل على <span className="font-bold text-yellow-600">{toNumber(bonusInfo.bonus).toFixed(2)} ج</span> بونص ({bonusInfo.percentage}%)
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  الإجمالي: {(currentAmount + toNumber(bonusInfo.bonus)).toFixed(2)} ج
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setRechargeAmount('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleRecharge}
                disabled={!currentAmount || currentAmount <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                شحن الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
