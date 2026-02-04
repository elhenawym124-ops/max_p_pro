import { useState, useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager';
import { 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Search,
  Edit,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface Subscription {
  id: string;
  plan: string;
  monthlyFee: number;
  status: string;
  billingDay: number;
  nextBillingDate: string;
  lastBillingDate?: string;
  failedAttempts: number;
  createdAt: string;
  company: {
    id: string;
    name: string;
    email: string;
    plan: string;
    isActive: boolean;
    createdAt: string;
  };
}

export default function PlatformSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, filterStatus, filterPlan]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      if (!token) return;

      const params: any = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterPlan) params.plan = filterPlan;

      const response = await axios.get(`${API_URL}/api/v1/super-admin/platform/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data.success) {
        setSubscriptions(response.data.data);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('خطأ في جلب الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'نشط' },
      SUSPENDED: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'معلق' },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'ملغي' },
      PAST_DUE: { color: 'bg-orange-100 text-orange-800', icon: Clock, text: 'متأخر' }
    };

    const badge = badges[status] || badges['ACTIVE'];
    const Icon = badge.icon;

    return (
      <span className={`${badge.color} px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit`}>
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      BASIC: 'bg-blue-100 text-blue-800',
      PRO: 'bg-purple-100 text-purple-800',
      ENTERPRISE: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`${colors[plan] || colors['BASIC']} px-3 py-1 rounded-full text-sm font-semibold`}>
        {plan}
      </span>
    );
  };

  const calculateTotalMRR = () => {
    return subscriptions
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + parseFloat(s.monthlyFee.toString()), 0);
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة اشتراكات المنصة</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            مراقبة وإدارة جميع اشتراكات الشركات
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي الاشتراكات</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {subscriptions.length}
                </p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الاشتراكات النشطة</p>
                <p className="text-3xl font-bold text-green-600">
                  {subscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">MRR (الإيرادات الشهرية)</p>
                <p className="text-3xl font-bold text-purple-600">
                  {calculateTotalMRR().toLocaleString('ar-EG')} ج
                </p>
              </div>
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">معلقة/متأخرة</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {subscriptions.filter(s => s.status === 'SUSPENDED' || s.status === 'PAST_DUE').length}
                </p>
              </div>
              <AlertCircle className="text-yellow-600" size={32} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter size={16} className="inline mr-2" />
                الحالة
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">الكل</option>
                <option value="ACTIVE">نشط</option>
                <option value="SUSPENDED">معلق</option>
                <option value="CANCELLED">ملغي</option>
                <option value="PAST_DUE">متأخر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter size={16} className="inline mr-2" />
                الخطة
              </label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">الكل</option>
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search size={16} className="inline mr-2" />
                بحث
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن شركة..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={fetchSubscriptions}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الشركة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الخطة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الرسوم الشهرية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الفاتورة القادمة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    محاولات فاشلة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {sub.company.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.company.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPlanBadge(sub.plan)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white font-semibold">
                        <DollarSign size={16} />
                        {parseFloat(sub.monthlyFee.toString()).toLocaleString('ar-EG')} ج
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {new Date(sub.nextBillingDate).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      {sub.failedAttempts > 0 ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {sub.failedAttempts}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="تعديل"
                      >
                        <Edit size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
