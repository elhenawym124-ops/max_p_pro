import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { broadcastService } from '../../services/broadcastService';

interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  sentAt: string;
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  unsubscribedCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  unsubscribeRate: number;
  revenue?: number;
  conversions?: number;
}

interface AnalyticsData {
  totalCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  totalRevenue: number;
  bestPerformingTime: string;
  campaignMetrics: CampaignMetrics[];
  timeSeriesData: {
    date: string;
    campaigns: number;
    opens: number;
    clicks: number;
    revenue: number;
  }[];
}

const CampaignAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const { formatDate } = useDateFormat();

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      console.log('📊 Loading analytics data for period:', selectedPeriod);
      const response = await broadcastService.getAnalytics(selectedPeriod);
      console.log('📊 Analytics response:', response);

      // Handle different response formats
      let analyticsData = null;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          analyticsData = (response as any).data;
        } else if ('success' in response && 'data' in response) {
          analyticsData = (response as any).data;
        } else {
          analyticsData = response;
        }
      }

      if (analyticsData) {
        setAnalyticsData(analyticsData);
      } else {
        // Fallback to mock data if no data available
        const mockData: AnalyticsData = {
          totalCampaigns: 0,
          totalRecipients: 0,
          averageOpenRate: 0,
          averageClickRate: 0,
          totalRevenue: 0,
          bestPerformingTime: '10:00 صباحاً',
          campaignMetrics: [],
          timeSeriesData: [],
        };
        setAnalyticsData(mockData);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Fallback to empty data on error
      const emptyData: AnalyticsData = {
        totalCampaigns: 0,
        totalRecipients: 0,
        averageOpenRate: 0,
        averageClickRate: 0,
        totalRevenue: 0,
        bestPerformingTime: '10:00 صباحاً',
        campaignMetrics: [],
        timeSeriesData: [],
      };
      setAnalyticsData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (rate: number, type: 'open' | 'click' | 'reply') => {
    const thresholds = {
      open: { good: 50, excellent: 70 },
      click: { good: 8, excellent: 15 },
      reply: { good: 1, excellent: 3 },
    };

    const threshold = thresholds[type];
    if (rate >= threshold.excellent) return 'text-green-600 bg-green-100';
    if (rate >= threshold.good) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات</h3>
        <p className="mt-1 text-sm text-gray-500">لم يتم العثور على بيانات إحصائية</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          إحصائيات الحملات
        </h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          <label className="text-sm text-gray-500">الفترة:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يوم</option>
            <option value="90d">آخر 90 يوم</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    إجمالي الحملات
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {analyticsData.totalCampaigns}
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
                <UserGroupIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    إجمالي المستلمين
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {analyticsData.totalRecipients.toLocaleString()}
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
                <EyeIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    متوسط معدل الفتح
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {analyticsData.averageOpenRate}%
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
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    إجمالي الإيرادات
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(analyticsData.totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            رؤى الأداء
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {analyticsData.bestPerformingTime}
              </div>
              <div className="text-sm text-gray-500">أفضل وقت للإرسال</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.averageClickRate}%
              </div>
              <div className="text-sm text-gray-500">متوسط معدل النقر</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.campaignMetrics.reduce((sum, c) => sum + (c.conversions || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">إجمالي التحويلات</div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            أداء الحملات
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            تفاصيل أداء كل حملة على حدة
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الحملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المستلمون
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  معدل التسليم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  معدل الفتح
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  معدل النقر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الإيرادات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  التحويلات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {analyticsData.campaignMetrics.map((campaign) => (
                <tr key={campaign.campaignId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {campaign.campaignName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(campaign.sentAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {campaign.recipientCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      campaign.deliveryRate >= 98 ? 'text-green-800 bg-green-100' : 
                      campaign.deliveryRate >= 95 ? 'text-yellow-800 bg-yellow-100' : 
                      'text-red-800 bg-red-100'
                    }`}>
                      {campaign.deliveryRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(campaign.openRate, 'open')}`}>
                      {campaign.openRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(campaign.clickRate, 'click')}`}>
                      {campaign.clickRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {campaign.revenue ? formatCurrency(campaign.revenue) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {campaign.conversions || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Series Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            اتجاهات الأداء
          </h3>
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              الرسوم البيانية قيد التطوير
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ستتوفر الرسوم البيانية التفاعلية قريباً
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
