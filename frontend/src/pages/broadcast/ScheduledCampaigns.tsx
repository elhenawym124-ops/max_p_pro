import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { broadcastService } from '../../services/broadcastService';

interface ScheduledCampaign {
  id: string;
  name: string;
  message: string;
  targetAudience: string;
  scheduledAt: string;
  status: 'scheduled' | 'paused' | 'cancelled';
  recipientCount: number;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: string;
  estimatedDeliveryTime: string;
  canEdit: boolean;
  canCancel: boolean;
}

const ScheduledCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<ScheduledCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'paused'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<ScheduledCampaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);


  const loadScheduledCampaigns = async () => {
    try {
      setLoading(true);

      // Load scheduled campaigns from API
      const campaignsData = await broadcastService.getCampaigns();
      
      const allCampaigns = Array.isArray(campaignsData)
        ? campaignsData
        : Array.isArray(campaignsData?.campaigns)
          ? campaignsData.campaigns
          : [];
      const scheduledCampaigns = allCampaigns.filter((campaign: any) =>
        campaign.scheduledAt !== null
      );

      setCampaigns(scheduledCampaigns);
    } catch (error) {
      console.error('Error loading scheduled campaigns:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadScheduledCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, priorityFilter]);



  const filterCampaigns = () => {
    let filtered = campaigns;

    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.targetAudience.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.priority === priorityFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleEdit = (campaign: ScheduledCampaign) => {
    setSelectedCampaign(campaign);
    // TODO: Implement edit functionality
    console.log('Edit campaign:', campaign);
  };

  const handleCancel = (campaign: ScheduledCampaign) => {
    setSelectedCampaign(campaign);
    setShowCancelModal(true);
  };

  const handlePreview = (campaign: ScheduledCampaign) => {
    setSelectedCampaign(campaign);
    setShowPreview(true);
  };

  const confirmCancel = async () => {
    if (!selectedCampaign) return;

    try {
      // Mock API call - replace with actual implementation
      setCampaigns(prev => prev.map(c =>
        c.id === selectedCampaign.id
          ? { ...c, status: 'cancelled' as const }
          : c
      ));

      setShowCancelModal(false);
      setSelectedCampaign(null);
    } catch (error) {
      console.error('Error cancelling campaign:', error);
    }
  };

  const togglePause = async (campaign: ScheduledCampaign) => {
    try {
      const newStatus = campaign.status === 'scheduled' ? 'paused' : 'scheduled';

      setCampaigns(prev => prev.map(c =>
        c.id === campaign.id
          ? { ...c, status: newStatus as 'scheduled' | 'paused' }
          : c
      ));
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'مجدولة';
      case 'paused': return 'متوقفة';
      case 'cancelled': return 'ملغية';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          الحملات المجدولة ({filteredCampaigns.length})
        </h3>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في الحملات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="scheduled">مجدولة</option>
            <option value="paused">متوقفة</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">جميع الأولويات</option>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadScheduledCampaigns}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
          >
            <FunnelIcon className="h-4 w-4 ml-2" />
            تحديث
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">لا توجد حملات مجدولة</h3>
          <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء حملة جديدة</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCampaigns.map((campaign) => (
              <li key={campaign.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {campaign.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(campaign.priority)}`}>
                        {getPriorityText(campaign.priority)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {campaign.message}
                    </p>

                    <div className="mt-3 flex items-center space-x-6 space-x-reverse text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 ml-1" />
                        {new Date(campaign.scheduledAt).toLocaleString('ar-EG', {
                          calendar: 'gregory',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 ml-1" />
                        {campaign.estimatedDeliveryTime}
                      </div>
                      <div>
                        {campaign.recipientCount.toLocaleString()} مستلم
                      </div>
                      <div>
                        {campaign.targetAudience}
                      </div>
                    </div>

                    {campaign.tags && Array.isArray(campaign.tags) && campaign.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {campaign.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => handlePreview(campaign)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="معاينة"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>

                    {campaign.canEdit && (
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="p-2 text-indigo-400 hover:text-indigo-600"
                        title="تعديل"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}

                    <button
                      onClick={() => togglePause(campaign)}
                      className="p-2 text-yellow-400 hover:text-yellow-600"
                      title={campaign.status === 'scheduled' ? 'إيقاف مؤقت' : 'استئناف'}
                    >
                      {campaign.status === 'scheduled' ? (
                        <PauseIcon className="h-5 w-5" />
                      ) : (
                        <PlayIcon className="h-5 w-5" />
                      )}
                    </button>

                    {campaign.canCancel && (
                      <button
                        onClick={() => handleCancel(campaign)}
                        className="p-2 text-red-400 hover:text-red-600"
                        title="إلغاء"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedCampaign && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                معاينة الحملة: {selectedCampaign.name}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرسالة:</label>
                <div className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedCampaign.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الجمهور المستهدف:</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.targetAudience}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عدد المستلمين:</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.recipientCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedCampaign && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                تأكيد إلغاء الحملة
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                هل أنت متأكد من إلغاء حملة "{selectedCampaign.name}"؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex justify-center space-x-4 space-x-reverse mt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  تأكيد الإلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledCampaigns;
