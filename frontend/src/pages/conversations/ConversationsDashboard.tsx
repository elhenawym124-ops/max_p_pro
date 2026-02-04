import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Import all the enhanced components
import ConversationsImproved from './ConversationsImproved';
import ConversationAnalytics from '../../components/conversations/ConversationAnalytics';
import AdvancedSearch from '../../components/conversations/AdvancedSearch';
import NotificationSystem, { useNotifications } from '../../components/common/NotificationSystem';
import ErrorBoundary from '../../components/common/ErrorBoundary';

type DashboardView = 'conversations' | 'analytics' | 'search' | 'settings';

interface DashboardTab {
  id: DashboardView;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ConversationsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<DashboardView>('conversations');
  const [showSearch, setShowSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalConversations: 0,
    unreadMessages: 0,
    activeUsers: 0,
    responseTime: 0
  });

  const { showSuccess, showInfo, showWarning } = useNotifications();

  // تحميل إحصائيات سريعة للوحة التحكم
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        // محاكاة تحميل الإحصائيات
        const stats = {
          totalConversations: 127,
          unreadMessages: 23,
          activeUsers: 15,
          responseTime: 2.5
        };
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    loadDashboardStats();
  }, []);

  // معالجة البحث المتقدم
  const handleAdvancedSearch = (filters: any) => {
    setSearchFilters(filters);
    setShowSearch(false);
    setActiveView('conversations');
    showInfo('تم تطبيق البحث', `تم البحث عن: "${filters.query}"`);
  };

  // معالجة اختيار نتيجة البحث
  const handleSearchResultSelect = (result: any) => {
    setShowSearch(false);
    setActiveView('conversations');
    showSuccess('تم العثور على الرسالة', 'سيتم الانتقال إلى المحادثة المحددة');
  };

  // تبويبات لوحة التحكم
  const dashboardTabs: DashboardTab[] = [
    {
      id: 'conversations',
      label: 'المحادثات',
      icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
      component: <ConversationsImproved />
    },
    {
      id: 'analytics',
      label: 'الإحصائيات',
      icon: <ChartBarIcon className="w-5 h-5" />,
      component: <ConversationAnalytics />
    },
    {
      id: 'search',
      label: 'البحث المتقدم',
      icon: <MagnifyingGlassIcon className="w-5 h-5" />,
      component: null // يتم التعامل معه بشكل منفصل
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      component: <ConversationSettings />
    }
  ];

  const activeTab = dashboardTabs.find(tab => tab.id === activeView);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">لوحة المحادثات</h1>
                    <p className="text-sm text-gray-500">إدارة شاملة للمحادثات والرسائل</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 space-x-reverse">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{dashboardStats.totalConversations}</div>
                  <div className="text-xs text-gray-500">محادثة</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{dashboardStats.unreadMessages}</div>
                  <div className="text-xs text-gray-500">غير مقروء</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dashboardStats.activeUsers}</div>
                  <div className="text-xs text-gray-500">متصل</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{dashboardStats.responseTime}د</div>
                  <div className="text-xs text-gray-500">متوسط الرد</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  title="البحث المتقدم"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 relative"
                  title="الإشعارات"
                >
                  <BellIcon className="w-5 h-5" />
                  {dashboardStats.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {dashboardStats.unreadMessages > 9 ? '9+' : dashboardStats.unreadMessages}
                    </span>
                  )}
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  title="المستخدمون المتصلون"
                >
                  <UserGroupIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-8 space-x-reverse">
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'search') {
                      setShowSearch(true);
                    } else {
                      setActiveView(tab.id);
                    }
                  }}
                  className={`
                    flex items-center space-x-2 space-x-reverse py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                    ${activeView === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Message */}
          {activeView === 'conversations' && !searchFilters && (
            <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">مرحباً بك في نظام المحادثات المحسن</h2>
                  <p className="text-indigo-100">
                    استمتع بتجربة محادثات متطورة مع رسائل فورية، تمرير ذكي، ومعالجة أخطاء محسنة
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-4 flex space-x-4 space-x-reverse">
                <button
                  onClick={() => setShowSearch(true)}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors duration-200 flex items-center space-x-2 space-x-reverse"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <span>بحث متقدم</span>
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors duration-200 flex items-center space-x-2 space-x-reverse"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  <span>عرض الإحصائيات</span>
                </button>
              </div>
            </div>
          )}

          {/* Search Results Banner */}
          {searchFilters && activeView === 'conversations' && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <MagnifyingGlassIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      نتائج البحث عن: "{searchFilters.query}"
                    </p>
                    <p className="text-xs text-blue-700">
                      تم تطبيق {Object.keys(searchFilters).filter(key => 
                        searchFilters[key] && searchFilters[key] !== '' && 
                        (Array.isArray(searchFilters[key]) ? searchFilters[key].length > 0 : true)
                      ).length} فلتر
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSearchFilters(null)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  مسح البحث
                </button>
              </div>
            </div>
          )}

          {/* Active Tab Content */}
          <div className="min-h-[600px]">
            {activeTab?.component}
          </div>
        </div>

        {/* Advanced Search Modal */}
        <AdvancedSearch
          isVisible={showSearch}
          onClose={() => setShowSearch(false)}
          onSearch={handleAdvancedSearch}
          onResultSelect={handleSearchResultSelect}
        />

        {/* Notification System */}
        <NotificationSystem position="top-right" maxNotifications={5} />
      </div>
    </ErrorBoundary>
  );
};

// مكون إعدادات المحادثات
const ConversationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    soundNotifications: true,
    desktopNotifications: false,
    showTypingIndicators: true,
    autoScroll: true,
    compactView: false,
    darkMode: false
  });

  const { showSuccess } = useNotifications();

  const handleSaveSettings = () => {
    localStorage.setItem('conversationSettings', JSON.stringify(settings));
    showSuccess('تم الحفظ', 'تم حفظ الإعدادات بنجاح');
  };

  useEffect(() => {
    const saved = localStorage.getItem('conversationSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">إعدادات المحادثات</h3>
      
      <div className="space-y-6">
        {/* General Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">الإعدادات العامة</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">التحديث التلقائي</label>
                <p className="text-xs text-gray-500">تحديث المحادثات تلقائياً</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {settings.autoRefresh && (
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">فترة التحديث (ثانية)</label>
                  <p className="text-xs text-gray-500">كم ثانية بين كل تحديث</p>
                </div>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10 ثوانٍ</option>
                  <option value={30}>30 ثانية</option>
                  <option value={60}>دقيقة</option>
                  <option value={300}>5 دقائق</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">إعدادات الإشعارات</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">الإشعارات الصوتية</label>
                <p className="text-xs text-gray-500">تشغيل صوت عند وصول رسالة جديدة</p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, soundNotifications: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">إشعارات سطح المكتب</label>
                <p className="text-xs text-gray-500">إظهار إشعارات في نظام التشغيل</p>
              </div>
              <input
                type="checkbox"
                checked={settings.desktopNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, desktopNotifications: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* UI Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">إعدادات الواجهة</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">مؤشرات الكتابة</label>
                <p className="text-xs text-gray-500">إظهار عندما يكتب شخص ما</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showTypingIndicators}
                onChange={(e) => setSettings(prev => ({ ...prev, showTypingIndicators: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">التمرير التلقائي</label>
                <p className="text-xs text-gray-500">التمرير تلقائياً للرسائل الجديدة</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoScroll}
                onChange={(e) => setSettings(prev => ({ ...prev, autoScroll: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">العرض المضغوط</label>
                <p className="text-xs text-gray-500">عرض أكثر محادثات في مساحة أقل</p>
              </div>
              <input
                type="checkbox"
                checked={settings.compactView}
                onChange={(e) => setSettings(prev => ({ ...prev, compactView: e.target.checked }))}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationsDashboard;

