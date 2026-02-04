import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  LinkIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface AffiliateStats {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  totalOrders: number;
  totalCommissions: number;
}

interface Affiliate {
  id: string;
  affiliateCode: string;
  commissionType: 'PERCENTAGE' | 'MARKUP';
  commissionRate: number;
  status: string;
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
}

const AffiliateDashboard: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCommissions, setRecentCommissions] = useState<any[]>([]);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      const [affiliateRes, statsRes, commissionsRes] = await Promise.all([
        apiClient.get('/affiliates/me'),
        apiClient.get('/affiliates/stats'),
        apiClient.get('/affiliates/commissions?limit=5')
      ]);

      if (affiliateRes.data.success) {
        setAffiliate(affiliateRes.data.data);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (commissionsRes.data.success) {
        setRecentCommissions(commissionsRes.data.data);
      }
    } catch (error: any) {
      console.error('Error loading affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAffiliateLink = (productId?: string) => {
    if (!affiliate) return '';
    const baseUrl = window.location.origin;
    const ref = affiliate.affiliateCode;
    if (productId) {
      return `${baseUrl}/shop/products/${productId}?ref=${ref}`;
    }
    return `${baseUrl}/shop?ref=${ref}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرابط!');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className={`w-full ${isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-6 text-center`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-800'} mb-2`}>
            لم يتم تسجيلك كمسوق بعد
          </h2>
          <p className={isDark ? 'text-yellow-200 mb-4' : 'text-yellow-700 mb-4'}>
            سجل الآن للبدء في كسب العمولات
          </p>
          <Link
            to="/affiliates/register"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            تسجيل كمسوق
          </Link>
        </div>
      </div>
    );
  }

  if (affiliate.status !== 'ACTIVE') {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className={`w-full ${isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-6 text-center`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-800'} mb-2`}>
            حسابك قيد المراجعة
          </h2>
          <p className={isDark ? 'text-yellow-200' : 'text-yellow-700'}>
            سيتم تفعيل حسابك قريباً بعد مراجعة طلبك
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="w-full">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>لوحة تحكم المسوق</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>كود الإحالة الخاص بك: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{affiliate.affiliateCode}</strong></p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>إجمالي الأرباح</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(affiliate.totalEarnings)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>الأرباح المعلقة</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(affiliate.pendingEarnings)}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>إجمالي المبيعات</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {affiliate.totalSales}
              </p>
            </div>
            <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>معدل التحويل</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {affiliate.conversionRate.toFixed(2)}%
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Affiliate Link Generator */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 mb-8`}>
        <h2 className={`text-xl font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <LinkIcon className="h-6 w-6 mr-2" />
          رابط الإحالة الخاص بك
        </h2>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              رابط عام (للمتجر)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generateAffiliateLink()}
                className={`flex-1 px-4 py-2 border rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={() => copyToClipboard(generateAffiliateLink())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                نسخ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/affiliates/orders"
          className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-lg transition`}
        >
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلباتي</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>عرض جميع الطلبات</p>
            </div>
          </div>
        </Link>

        <Link
          to="/affiliates/products"
          className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-lg transition`}
        >
          <div className="flex items-center">
            <ShoppingBagIcon className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>منتجاتي</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>إدارة منتجاتي</p>
            </div>
          </div>
        </Link>

        <Link
          to="/affiliates/customers"
          className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-lg transition`}
        >
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>عملائي</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>عرض العملاء المرتبطين</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Commissions */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>آخر العمولات</h2>
        {recentCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    رقم الطلب
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    المبلغ
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    الحالة
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                {recentCommissions.map((commission) => (
                  <tr key={commission.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      {commission.order?.orderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatPrice(commission.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        commission.status === 'PAID' 
                          ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800' :
                        commission.status === 'CONFIRMED' 
                          ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800' :
                          isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {commission.status === 'PAID' ? 'مدفوع' :
                         commission.status === 'CONFIRMED' ? 'مؤكد' : 'معلق'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(commission.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد عمولات بعد</p>
        )}
      </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;

