import React, { useState, useEffect } from 'react';
import CreateCampaign from './CreateCampaign';
import ScheduledCampaigns from './ScheduledCampaigns';
import CampaignAnalytics from './CampaignAnalytics';
import CustomerListsManager from './CustomerListsManager';
import BroadcastSettings from './BroadcastSettings';
import {
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  ClockIcon,

  ArrowTrendingUpIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { broadcastService, Campaign } from '../../services/broadcastService';
import { socketService } from '../../services/socketService';
import { useDateFormat } from '../../hooks/useDateFormat';

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  campaignsThisMonth: number;
}

const BroadcastDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'scheduled' | 'analytics' | 'lists' | 'settings'>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatDate } = useDateFormat();

  useEffect(() => {
    // 🚀 Initialize Socket.IO connection
    console.log('🔌 [BROADCAST] Initializing Socket.IO connection');
    if (!socketService.isConnected()) {
      socketService.connect();
      console.log('✅ [BROADCAST] Socket.IO connected');
    } else {
      console.log('✅ [BROADCAST] Socket.IO already connected');
    }
    
    loadData();
    
    // Cleanup on unmount
    return () => {
      console.log('🔌 [BROADCAST] Component unmounting');
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns and stats from API
      const [campaignsData, statsData] = await Promise.all([
        broadcastService.getCampaigns(),
        broadcastService.getAnalytics()
      ]);
      
      // Extract campaigns array from response
      const campaignsArray = Array.isArray(campaignsData) 
        ? campaignsData 
        : Array.isArray(campaignsData?.campaigns) 
        ? campaignsData.campaigns 
        : [];
      setCampaigns(campaignsArray);
      
      // Map analytics data to match CampaignStats interface
      const mappedStats: CampaignStats = {
        totalCampaigns: statsData.totalCampaigns || 0,
        activeCampaigns: statsData.activeCampaigns || 0,
        totalRecipients: statsData.totalRecipients || 0,
        averageOpenRate: statsData.averageOpenRate || 0,
        averageClickRate: statsData.averageClickRate || 0,
        campaignsThisMonth: statsData.campaignsThisMonth || 0
      };
      setStats(mappedStats);
    } catch (error) {
      console.error('Error loading broadcast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      case 'scheduled':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'sent':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusText = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return 'مسودة';
      case 'scheduled':
        return 'مجدولة';
      case 'sent':
        return 'تم الإرسال';
      case 'cancelled':
        return 'ملغية';
      default:
        return status;
    }
  };

  const tabs = [
    { id: 'overview', name: 'نظرة عامة', icon: ChartBarIcon },
    { id: 'create', name: 'إنشاء حملة جديدة', icon: PlusIcon },
    { id: 'scheduled', name: 'الحملات المجدولة', icon: CalendarIcon },
    { id: 'analytics', name: 'إحصائيات الحملات', icon: ChartBarIcon },
    { id: 'lists', name: 'إدارة قوائم العملاء', icon: UserGroupIcon },
    { id: 'settings', name: 'إعدادات البرودكاست', icon: Cog6ToothIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <MegaphoneIcon className="h-8 w-8 text-indigo-600 ml-3" />
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                لوحة البرودكاست
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
                <PlusIcon className="h-5 w-5 ml-2" />
                حملة جديدة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 space-x-reverse" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-800 font-black text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-800 hover:text-black font-semibold text-gray-900 dark:text-white hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 ml-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <MegaphoneIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            إجمالي الحملات
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.totalCampaigns}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-blue-400 dark:text-blue-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            الحملات النشطة
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.activeCampaigns}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-6 w-6 text-green-400 dark:text-green-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            إجمالي المستلمين
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.totalRecipients.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <EyeIcon className="h-6 w-6 text-indigo-400 dark:text-indigo-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            متوسط معدل الفتح
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.averageOpenRate}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-400 dark:text-purple-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            متوسط معدل النقر
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.averageClickRate}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-orange-400 dark:text-orange-500" />
                      </div>
                      <div className="mr-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate">
                            حملات هذا الشهر
                          </dt>
                          <dd className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.campaignsThisMonth}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Campaigns */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  الحملات الأخيرة
                </h3>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">
                  آخر الحملات التي تم إنشاؤها أو تنفيذها
                </p>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns.slice(0, 5).map((campaign) => (
                  <li key={campaign.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <MegaphoneIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="mr-4">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                              {campaign.name}
                            </p>
                            <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                              {campaign.recipientCount} مستلم • {formatDate(campaign.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {getStatusText(campaign.status)}
                          </span>
                          {campaign.openRate && (
                            <span className="text-base font-semibold text-gray-500 dark:text-gray-400">
                              {campaign.openRate}% فتح
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <CreateCampaign />
        )}

        {activeTab === 'scheduled' && (
          <ScheduledCampaigns />
        )}

        {activeTab === 'analytics' && (
          <CampaignAnalytics />
        )}

        {activeTab === 'lists' && (
          <CustomerListsManager />
        )}

        {activeTab === 'settings' && (
          <BroadcastSettings />
        )}
      </div>
    </div>
  );
};

export default BroadcastDashboard;

