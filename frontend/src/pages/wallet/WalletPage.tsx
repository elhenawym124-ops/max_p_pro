import React, { useState, useEffect } from 'react';
import {
  WalletIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { storefrontApi } from '../../utils/storefrontApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuthSimple';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  metadata?: string;
}

interface WalletData {
  balance: number;
  currency: string;
}

const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      if (user.role !== 'CUSTOMER') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [walletRes, txRes] = await Promise.all([
          storefrontApi.getWalletBalance(),
          storefrontApi.getWalletTransactions({ limit: 20 })
        ]);

        if (walletRes?.success) {
          setWallet(walletRes.data);
        }

        if (txRes?.success) {
          setTransactions(txRes.data?.transactions || []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
      case 'CASHBACK':
      case 'REFERRAL_BONUS':
      case 'REWARD':
        return <ArrowDownTrayIcon className="h-5 w-5 text-green-500" />;
      case 'DEBIT':
      case 'REFUND':
        return <ArrowUpTrayIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'CREDIT':
      case 'CASHBACK':
      case 'REFERRAL_BONUS':
      case 'REWARD':
        return 'text-green-600';
      case 'DEBIT':
        return 'text-red-600';
      case 'REFUND':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionSign = (type: string) => {
    if (type === 'DEBIT') return '-';
    if (type === 'CREDIT' || type === 'CASHBACK' || type === 'REFERRAL_BONUS' || type === 'REWARD' || type === 'REFUND') return '+';
    return '';
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2)} ${wallet?.currency || 'EGP'}`;
  };

  const safeParseMetadata = (metadata?: string) => {
    if (!metadata) return null;
    if (typeof metadata !== 'string') return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            محفظتي
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            يجب تسجيل الدخول لعرض المحفظة.
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== 'CUSTOMER') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            محفظتي
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            هذه الصفحة مخصصة للعملاء فقط.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          محفظتي
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          إدارة رصيدك ومعاملاتك المالية
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              الرصيد الحالي
            </p>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {wallet ? formatAmount(wallet.balance) : '0.00 EGP'}
            </p>
          </div>
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <WalletIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">سجل المعاملات</h2>
          <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {transactions.length}
          </span>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد معاملات حتى الآن
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </p>
                      {(() => {
                        const meta = safeParseMetadata(transaction.metadata);
                        const orderId = meta?.orderId || meta?.guestOrderId || meta?.orderNumber;
                        if (!orderId) return null;
                        return (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            طلب #{String(orderId)}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                      {getTransactionSign(transaction.type)}
                      {formatAmount(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      الرصيد: {formatAmount(transaction.balanceAfter)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💰 كيف تكسب Cashback؟
        </h3>
        <ul className="text-blue-800 dark:text-blue-200 space-y-1">
          <li>• 5% cashback على كل طلب عند تأكيد الطلب</li>
          <li>• 50 جنيه مكافأة لكل عميل جديد تحيله</li>
          <li>• 20 جنيه هدية للعملاء الجدد</li>
          <li>• نقاط إضافية عند التقييم والمشاركة</li>
        </ul>
      </div>
    </div>
  );
};

export default WalletPage;
