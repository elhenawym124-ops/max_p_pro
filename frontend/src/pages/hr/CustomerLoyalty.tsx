import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import {
  Users,
  Star,
  Gift,
  Trophy,
  Target,
  TrendingUp,
  Award,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Crown,
  Medal,
  Gem,
  Heart,
  Zap,
  DollarSign
} from 'lucide-react';

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  type: 'POINTS' | 'TIER' | 'CASHBACK' | 'REFERRAL';
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  pointsPerPurchase: number;
  pointsPerReferral: number;
  redemptionRate: number;
  minimumPoints: number;
  maxPointsPerTransaction: number;
  expiryMonths: number;
  createdAt: string;
  updatedAt: string;
  customersCount: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
}

interface CustomerLoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  minPoints: number;
  maxPoints?: number;
  benefits: string[];
  color: string;
  icon: string;
  customersCount: number;
}

interface CustomerLoyaltyRecord {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  program: CustomerLoyaltyProgram;
  currentPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  tier?: CustomerLoyaltyTier;
  joinDate: string;
  lastActivity: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface CashbackSettings {
  id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SUSPENDED';
  rules: {
    cashbackPercent: number;
    base: 'total' | 'subtotal';
    trigger: string;
  };
}

const CustomerLoyalty: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'programs' | 'customers' | 'tiers' | 'analytics' | 'cashback'>('programs');
  const [programs, setPrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [customers, setCustomers] = useState<CustomerLoyaltyRecord[]>([]);
  const [tiers, setTiers] = useState<CustomerLoyaltyTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cashbackSettings, setCashbackSettings] = useState<CashbackSettings | null>(null);
  const [cashbackDraft, setCashbackDraft] = useState<{ cashbackPercent: number; base: 'total' | 'subtotal'; status: CashbackSettings['status'] } | null>(null);
  const [isSavingCashback, setIsSavingCashback] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      setIsLoading(true);
      const [programsRes, customersRes, tiersRes, cashbackRes] = await Promise.all([
        apiClient.get('/hr/customer-loyalty/programs'),
        apiClient.get('/hr/customer-loyalty/customers'),
        apiClient.get('/hr/customer-loyalty/tiers'),
        apiClient.get('/hr/customer-loyalty/cashback/settings')
      ]);

      setPrograms(programsRes.data.data || []);
      setCustomers(customersRes.data.data || []);
      setTiers(tiersRes.data.data || []);

      const cs: CashbackSettings | null = cashbackRes?.data?.data || null;
      setCashbackSettings(cs);
      if (cs) {
        setCashbackDraft({
          cashbackPercent: cs.rules.cashbackPercent,
          base: cs.rules.base,
          status: cs.status
        });
      } else {
        setCashbackDraft(null);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCashbackSettings = async () => {
    if (!cashbackDraft) return;

    try {
      setIsSavingCashback(true);
      const res = await apiClient.put('/hr/customer-loyalty/cashback/settings', {
        cashbackPercent: cashbackDraft.cashbackPercent,
        base: cashbackDraft.base,
        status: cashbackDraft.status
      });

      const cs: CashbackSettings | null = res?.data?.data || null;
      setCashbackSettings(cs);
      if (cs) {
        setCashbackDraft({
          cashbackPercent: cs.rules.cashbackPercent,
          base: cs.rules.base,
          status: cs.status
        });
      }
    } catch (error) {
      console.error('Error saving cashback settings:', error);
    } finally {
      setIsSavingCashback(false);
    }
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case 'POINTS': return <Star className="w-5 h-5" />;
      case 'TIER': return <Crown className="w-5 h-5" />;
      case 'CASHBACK': return <DollarSign className="w-5 h-5" />;
      case 'REFERRAL': return <Users className="w-5 h-5" />;
      default: return <Gift className="w-5 h-5" />;
    }
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName) {
      case 'crown': return <Crown className="w-6 h-6" />;
      case 'medal': return <Medal className="w-6 h-6" />;
      case 'gem': return <Gem className="w-6 h-6" />;
      case 'trophy': return <Trophy className="w-6 h-6" />;
      default: return <Award className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'SUSPENDED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ولاء العملاء</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">إدارة برامج ولاء العملاء ومكافآتهم</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLoyaltyData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            برنامج جديد
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Gift className="w-4 h-4" />
            البرامج النشطة
          </div>
          <p className="text-2xl font-bold mt-1">{programs.filter(p => p.status === 'ACTIVE').length}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Users className="w-4 h-4" />
            العملاء المشتركين
          </div>
          <p className="text-2xl font-bold mt-1">{customers.filter(c => c.status === 'ACTIVE').length}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Star className="w-4 h-4" />
            إجمالي النقاط
          </div>
          <p className="text-2xl font-bold mt-1">{customers.reduce((sum, c) => sum + c.currentPoints, 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Trophy className="w-4 h-4" />
            المستويات
          </div>
          <p className="text-2xl font-bold mt-1">{tiers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'programs', label: 'البرامج', icon: Gift },
            { id: 'customers', label: 'العملاء', icon: Users },
            { id: 'tiers', label: 'المستويات', icon: Crown },
            { id: 'analytics', label: 'التحليلات', icon: TrendingUp },
            { id: 'cashback', label: 'الكاش باك', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Programs Tab */}
          {activeTab === 'programs' && (
            <div className="space-y-4">
              {programs.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد برامج ولاء</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">ابدأ بإنشاء برنامج ولاء للعملاء</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                  >
                    إنشاء برنامج جديد
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((program) => (
                    <div key={program.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 ${program.status === 'ACTIVE' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'} rounded-lg`}>
                          {getProgramIcon(program.type)}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(program.status)}`}>
                          {program.status === 'ACTIVE' ? 'نشط' : program.status === 'INACTIVE' ? 'غير نشط' : program.status === 'DRAFT' ? 'مسودة' : 'معلق'}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{program.nameAr || program.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{program.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">نقاط لكل عملية:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{program.pointsPerPurchase}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">العملاء:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{program.customersCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">معدل الاستبدال:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{program.redemptionRate}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                          تعديل
                        </button>
                        <button className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          عرض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="البحث عن عميل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Filter className="w-4 h-4" />
                  فلترة
                </button>
              </div>

              {customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا يوجد عملاء مشتركون</h3>
                  <p className="text-gray-500 dark:text-gray-400">سيظهر هنا العملاء المشتركون في برامج الولاء</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">العميل</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">البرنامج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">النقاط الحالية</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المستوى</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">آخر نشاط</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {customer.customer.firstName} {customer.customer.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {customer.customer.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getProgramIcon(customer.program.type)}
                              <span className="text-sm text-gray-900 dark:text-white">{customer.program.nameAr || customer.program.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium text-gray-900 dark:text-white">{customer.currentPoints.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {customer.tier && (
                              <div className="flex items-center gap-2">
                                {getTierIcon(customer.tier.icon)}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{customer.tier.nameAr || customer.tier.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(customer.status)}`}>
                              {customer.status === 'ACTIVE' ? 'نشط' : customer.status === 'INACTIVE' ? 'غير نشط' : 'معلق'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(customer.lastActivity).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tiers Tab */}
          {activeTab === 'tiers' && (
            <div className="space-y-4">
              {tiers.length === 0 ? (
                <div className="text-center py-12">
                  <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد مستويات</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">أنشئ مستويات لبرامج الولاء</p>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                    إنشاء مستوى جديد
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg`} style={{ backgroundColor: tier.color + '20', color: tier.color }}>
                          {getTierIcon(tier.icon)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{tier.nameAr || tier.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tier.customersCount} عميل</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">النقاط الدنيا:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{tier.minPoints.toLocaleString()}</span>
                        </div>
                        {tier.maxPoints && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">النقاط القصوى:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{tier.maxPoints.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المزايا:</p>
                        {tier.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">معدل النمو</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">+24%</p>
                  <p className="text-xs text-green-600 mt-1">من الشهر الماضي</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">متوسط النقاط</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,250</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">لكل عميل</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">معدل الاستبدال</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">68%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">من النقاط المكتسبة</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">قيمة المكافآت</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₪45,200</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">هذا الشهر</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">أداء البرامج</h3>
                <div className="space-y-4">
                  {programs.map((program) => (
                    <div key={program.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getProgramIcon(program.type)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{program.nameAr || program.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{program.customersCount} عميل</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{program.totalPointsIssued.toLocaleString()} نقطة</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{program.totalPointsRedeemed.toLocaleString()} مستبدلة</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cashback' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">إعدادات الكاش باك</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تحديد نسبة الكاش باك وطريقة الحساب</p>
                  </div>
                  <button
                    onClick={saveCashbackSettings}
                    disabled={!cashbackDraft || isSavingCashback}
                    className={`px-4 py-2 rounded-lg font-medium ${(!cashbackDraft || isSavingCashback)
                      ? 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                  >
                    {isSavingCashback ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>

                {!cashbackDraft ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">تعذر تحميل إعدادات الكاش باك.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نسبة الكاش باك (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={cashbackDraft.cashbackPercent}
                        onChange={(e) => setCashbackDraft({
                          ...cashbackDraft,
                          cashbackPercent: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أساس الحساب</label>
                      <select
                        value={cashbackDraft.base}
                        onChange={(e) => setCashbackDraft({
                          ...cashbackDraft,
                          base: (e.target.value === 'subtotal' ? 'subtotal' : 'total')
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="total">إجمالي الطلب (total)</option>
                        <option value="subtotal">قبل الشحن والضريبة (subtotal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                      <select
                        value={cashbackDraft.status}
                        onChange={(e) => setCashbackDraft({
                          ...cashbackDraft,
                          status: e.target.value as CashbackSettings['status']
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="ACTIVE">نشط</option>
                        <option value="INACTIVE">غير نشط</option>
                        <option value="DRAFT">مسودة</option>
                        <option value="SUSPENDED">معلق</option>
                      </select>
                    </div>
                  </div>
                )}

                {cashbackSettings && (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Program ID: {cashbackSettings.id}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLoyalty;
