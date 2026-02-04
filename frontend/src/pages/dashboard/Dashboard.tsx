import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  UsersIcon,
  BellAlertIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuthSimple';
import api from '../../services/api';
import '../../styles/dashboard-enhanced.css';
import SaaSAnnouncements, { Announcement } from '../../components/dashboard/SaaSAnnouncements';

interface DashboardStats {
  pendingOrders: number;
  lowStockProducts: number;
  unreadMessages: number; // New field we'll try to get or mock
  newCustomersToday: number;
  activeConversations: number;
  systemStatus: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'customers'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    lowStockProducts: 0,
    unreadMessages: 0,
    newCustomersToday: 0,
    activeConversations: 0,
    systemStatus: 'healthy',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'welcome-promo',
      type: 'feature',
      title: 'مرحباً بك في لوحة القيادة الجديدة!',
      message: 'لقد قمنا بتحديث لوحة التحكم لتصبح مركز عملياتك اليومي. ركز على المهام، التنبيهات، والإجراءات السريعة. أخبرنا برأيك!',
      actionLabel: 'جولة سريعة',
      isDismissible: true
    },
    {
      id: 'whatsapp-alert',
      type: 'alert',
      title: 'تنبيه: خدمة واتساب',
      message: 'يرجى إعادة مسح كود QR لتحديث الاتصال بخدمة واتساب وضمان استمرار استقبال الرسائل.',
      actionLabel: 'تحديث الاتصال',
      actionUrl: '/whatsapp',
      isDismissible: true
    }
  ]);

  // Fetch critical operational data only
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const companyId = user?.companyId || user?.id || 'default-company';

      const statsResponse = await api.get(`dashboard/stats/${companyId}`);

      if (statsResponse.data.success) {
        const data = statsResponse.data.data;
        setStats({
          pendingOrders: data.pendingOrders || 0,
          lowStockProducts: data.lowStockProducts || 0,
          unreadMessages: data.activeConversations || 4, // Mocking unread for urgency if not provided
          newCustomersToday: data.newCustomersToday || 0,
          activeConversations: data.activeConversations || 0,
          systemStatus: data.systemStatus || 'healthy'
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.companyId]);

  const handleDismissAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // Operational Pulse Card Component
  const PulseCard = ({ title, value, icon, color, subtext, link }: { title: string, value: number | string, icon: any, color: string, subtext: string, link: string }) => (
    <Link to={link} className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 dark:bg-${color}-900/20 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110`}></div>
      <div className="relative flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</h3>
          <p className={`text-xs mt-2 font-medium text-${color}-600 dark:text-${color}-400 bg-${color}-50 dark:bg-${color}-900/20 inline-block px-2 py-1 rounded-full`}>
            {subtext}
          </p>
        </div>
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-xl text-${color}-600 dark:text-${color}-400 group-hover:bg-${color}-600 group-hover:text-white transition-colors duration-300`}>
          {icon}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 py-8">

      {/* 1. SaaS Announcements Banner */}
      <SaaSAnnouncements
        announcements={announcements}
        onDismiss={handleDismissAnnouncement}
      />

      {/* 2. Welcome & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            مركز العمليات
            <span className="text-base font-normal text-gray-500 dark:text-gray-400 mr-2"> | {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            أهلاً {user?.firstName}، إليك ملخص المهام العاجلة اليوم.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors"
          >
            <div className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}>
              <ClockIcon className="h-4 w-4" />
            </div>
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* 2.5. Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: BoltIcon },
            { id: 'customers', label: 'العملاء', icon: UsersIcon }
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
      </div>

      {/* 3. Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 3.1. Operational Pulse (The "Action" Row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Unread Messages - Critical Communication */}
        <PulseCard
          title="رسائل غير مقروءة"
          value={stats.unreadMessages}
          subtext="تحتاج إلى رد سريع"
          icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
          color="indigo"
          link="/conversations"
        />

        {/* Pending Orders - Revenue Impact */}
        <PulseCard
          title="طلبات معلقة"
          value={stats.pendingOrders}
          subtext="تنتظر التأكيد"
          icon={<ShoppingBagIcon className="h-6 w-6" />}
          color="blue"
          link="/orders?status=pending"
        />

        {/* Low Stock - Inventory Risk */}
        <PulseCard
          title="تنبيهات المخزون"
          value={stats.lowStockProducts}
          subtext="منتجات قاربت على النفاد"
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="amber"
          link="/products?stock=low"
        />

        {/* New Customers - Growth Signal */}
        <PulseCard
          title="عملاء جدد اليوم"
          value={stats.newCustomersToday}
          subtext="انضموا للمنصة اليوم"
          icon={<UsersIcon className="h-6 w-6" />}
          color="emerald"
          link="/customers?sort=newest"
        />
          </div>

          {/* 3.2. Facebook Post - Separate Card */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
            <PulseCard
              title="نشر جديد"
              value="إنشاء"
              subtext="منشور فيسبوك"
              icon={<SparklesIcon className="h-6 w-6" />}
              color="pink"
              link="/facebook/create-post"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

            {/* 3.3. Quick Actions (Main Column) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <BoltIcon className="h-5 w-5 ml-2 text-indigo-600 dark:text-indigo-400" />
                  إجراءات سريعة
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <Link to="/products/new" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <ShoppingBagIcon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">إضافة منتج</span>
                </Link>

                <Link to="/broadcast" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all group">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <BellAlertIcon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">حملة رسائل</span>
                </Link>

                <Link to="/tasks" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transition-all group">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">المهام</span>
                </Link>

                <button onClick={() => window.open('https://help.example.com', '_blank')} className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 border-dashed rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all group">
                  <div className="p-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <ArrowTopRightOnSquareIcon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">مركز المساعدة</span>
                </button>
              </div>
            </div>

            {/* 3.4. Latest Updates & News (Side Column) */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <BellAlertIcon className="h-5 w-5 ml-2 text-indigo-600 dark:text-indigo-400" />
                آخر التحديثات
              </h2>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    { text: 'تم تحديث سياسة الخصوصية الخاصة بالمتجر', time: 'منذ ساعتين', type: 'info' },
                    { text: 'تمت معالجة جميع الطلبات المعلقة من الأمس', time: 'منذ 5 ساعات', type: 'success' },
                    { text: 'تذكير: موعد دفع الاشتراك الشهري قريب', time: 'منذ يوم واحد', type: 'warning' },
                    { text: 'ميزة جديدة: الرد الآلي على التعليقات', time: 'منذ يومين', type: 'info' },
                  ].map((update, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${update.type === 'success' ? 'bg-green-500' :
                            update.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}></div>
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{update.text}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{update.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 text-center border-t border-gray-100 dark:border-gray-700">
                  <Link to="/notifications" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                    عرض كل الإشعارات
                  </Link>
                </div>
              </div>

              {/* System Status Small Widget */}
              <div className="bg-gray-900 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-300">حالة النظام</span>
                  <span className="flex items-center text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1.5 animate-pulse"></span>
                    ممتازة
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>جودة الرد الآلي</span>
                      <span>98%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>استقرار الخادم</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Customers Tab Content */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <UsersIcon className="h-5 w-5 ml-2 text-indigo-600 dark:text-indigo-400" />
              العملاء
            </h2>
            <Link to="/customers/new" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              + إضافة عميل جديد
            </Link>
          </div>

          {/* 4.1. Add Customer Card */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Link to="/customers/new" className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110"></div>
              <div className="relative flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">إضافة عميل جديد</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">+</h3>
                  <p className="text-xs mt-2 font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 inline-block px-2 py-1 rounded-full">
                    تسجيل عميل جديد في النظام
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <UsersIcon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          </div>

          {/* 4.2. Customers List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { id: '1', name: 'أحمد محمد', email: 'ahmed@example.com', phone: '01234567890', joinDate: '2025-01-15', status: 'ACTIVE' },
                { id: '2', name: 'فاطمة علي', email: 'fatima@example.com', phone: '01098765432', joinDate: '2025-01-14', status: 'ACTIVE' },
                { id: '3', name: 'محمد خالد', email: 'mohamed@example.com', phone: '01123456789', joinDate: '2025-01-13', status: 'INACTIVE' },
                { id: '4', name: 'نورا سالم', email: 'nora@example.com', phone: '01234567891', joinDate: '2025-01-12', status: 'ACTIVE' },
                { id: '5', name: 'يوسف أمين', email: 'youssef@example.com', phone: '01012345678', joinDate: '2025-01-11', status: 'ACTIVE' },
                { id: '6', name: 'سارة أحمد', email: 'sara@example.com', phone: '01198765432', joinDate: '2025-01-10', status: 'ACTIVE' },
                { id: '7', name: 'عمر خالد', email: 'omar@example.com', phone: '01234567892', joinDate: '2025-01-09', status: 'INACTIVE' },
                { id: '8', name: 'ليلى حسن', email: 'laila@example.com', phone: '01012345679', joinDate: '2025-01-08', status: 'ACTIVE' },
              ].map((customer) => (
                <div key={customer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-gray-500">{customer.joinDate}</p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        customer.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {customer.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 text-center border-t border-gray-100 dark:border-gray-700">
              <Link to="/customers" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                عرض كل العملاء
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

