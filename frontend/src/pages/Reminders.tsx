import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../hooks/useDateFormat';
import api from '../services/api';
import { 
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'triggered' | 'completed' | 'dismissed';
  companyId: string;
  userId: string;
  customerId?: string;
  scheduledTime: string;
  createdAt: string;
  snoozeCount: number;
  maxSnooze: number;
  canSnooze: boolean;
  metadata: any;
}

const Reminders: React.FC = () => {
    const { formatDate } = useDateFormat();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'stats'>('active');

  // Create reminder form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    type: 'FOLLOW_UP',
    priority: 'medium',
    customerId: '',
    scheduledTime: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load reminders
      const remindersResponse = await api.get('/reminders?companyId=1');
      if (remindersResponse.data.success) {
        setReminders(remindersResponse.data.data.reminders);
      }

      // Load stats
      const statsResponse = await api.get('/reminders/stats?companyId=1');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!createForm.title.trim() || !createForm.scheduledTime) return;

    try {
      const response = await api.post('/reminders', {
        ...createForm,
        companyId: '1',
        userId: '1',
        relatedEntity: createForm.customerId ? {
          type: 'customer',
          id: createForm.customerId,
        } : null,
      });

      if (response.data.success) {
        await loadData();
        setShowCreateForm(false);
        setCreateForm({
          title: '',
          description: '',
          type: 'FOLLOW_UP',
          priority: 'medium',
          customerId: '',
          scheduledTime: '',
        });
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const handleUpdateStatus = async (reminderId: string, status: string, notes = '') => {
    try {
      await api.put(`/reminders/${reminderId}/status`, { status, notes });
      await loadData();
    } catch (error) {
      console.error('Error updating reminder status:', error);
    }
  };

  const handleSnoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      await api.post(`/reminders/${reminderId}/snooze`, { snoozeMinutes: minutes });
      await loadData();
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'triggered':
        return <BellIcon className="h-5 w-5 text-blue-500" />;
      case 'dismissed':
        return <XMarkIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const isOverdue = (scheduledTime: string) => {
    return new Date(scheduledTime) < new Date();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      if (overdueMins < 60) return `متأخر ${overdueMins} دقيقة`;
      if (overdueMins < 1440) return `متأخر ${Math.floor(overdueMins / 60)} ساعة`;
      return `متأخر ${Math.floor(overdueMins / 1440)} يوم`;
    }

    if (diffMins < 60) return `خلال ${diffMins} دقيقة`;
    if (diffHours < 24) return `خلال ${diffHours} ساعة`;
    return `خلال ${diffDays} يوم`;
  };

  const activeReminders = reminders.filter(r => r.status === 'pending' || r.status === 'triggered');
  const completedReminders = reminders.filter(r => r.status === 'completed' || r.status === 'dismissed');

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BellIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 ml-3" />
            التذكيرات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة التذكيرات والمتابعة مع العملاء
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            تذكير جديد
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center"
          >
            <ArrowPathIcon className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    التذكيرات النشطة
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.active.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    متأخرة
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.active.overdue}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    مكتملة هذا الأسبوع
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.completed.thisWeek}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BellIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    معدل الإنجاز
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {Math.round(stats.performance.completionRate * 100)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="h-5 w-5 inline ml-2" />
            التذكيرات النشطة ({activeReminders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircleIcon className="h-5 w-5 inline ml-2" />
            المكتملة ({completedReminders.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarIcon className="h-5 w-5 inline ml-2" />
            الإحصائيات
          </button>
        </nav>
      </div>

      {/* Create Reminder Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إنشاء تذكير جديد</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="عنوان التذكير"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="وصف التذكير"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      النوع
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FOLLOW_UP">متابعة عميل</option>
                      <option value="QUOTE_FOLLOW_UP">متابعة عرض سعر</option>
                      <option value="PAYMENT_REMINDER">تذكير دفع</option>
                      <option value="TASK_REMINDER">تذكير مهمة</option>
                      <option value="APPOINTMENT_REMINDER">تذكير موعد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الأولوية
                    </label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    وقت التذكير
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.scheduledTime}
                    onChange={(e) => setCreateForm({ ...createForm, scheduledTime: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!createForm.title.trim() || !createForm.scheduledTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeReminders.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد تذكيرات نشطة</h3>
              <p className="mt-1 text-sm text-gray-500">
                جميع التذكيرات مكتملة أو لا توجد تذكيرات
              </p>
            </div>
          ) : (
            activeReminders.map((reminder) => (
              <div key={reminder.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 hover:shadow-md transition-shadow ${
                isOverdue(reminder.scheduledTime) ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20' : ''
              }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(reminder.status)}
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">{reminder.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority === 'high' ? 'عالية' : reminder.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                        </span>
                        {isOverdue(reminder.scheduledTime) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                            متأخر
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{reminder.description}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 ml-1" />
                          {formatTime(reminder.scheduledTime)}
                        </span>
                        {reminder.customerId && (
                          <span className="flex items-center">
                            <UserIcon className="h-4 w-4 ml-1" />
                            عميل #{reminder.customerId}
                          </span>
                        )}
                        {reminder.snoozeCount > 0 && (
                          <span className="text-yellow-600">
                            تم التأجيل {reminder.snoozeCount} مرة
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mr-4 flex flex-col space-y-2">
                      <button
                        onClick={() => handleUpdateStatus(reminder.id, 'completed')}
                        className="text-green-600 hover:text-green-800 p-1 text-sm"
                        title="تم الإنجاز"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                      
                      {reminder.canSnooze && reminder.snoozeCount < reminder.maxSnooze && (
                        <div className="relative group">
                          <button className="text-yellow-600 hover:text-yellow-800 p-1 text-sm">
                            <ClockIcon className="h-5 w-5" />
                          </button>
                          <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => handleSnoozeReminder(reminder.id, 15)}
                              className="block w-full text-right px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              15 دقيقة
                            </button>
                            <button
                              onClick={() => handleSnoozeReminder(reminder.id, 60)}
                              className="block w-full text-right px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              ساعة واحدة
                            </button>
                            <button
                              onClick={() => handleSnoozeReminder(reminder.id, 240)}
                              className="block w-full text-right px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              4 ساعات
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleUpdateStatus(reminder.id, 'dismissed')}
                        className="text-gray-600 hover:text-gray-800 p-1 text-sm"
                        title="تجاهل"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedReminders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد تذكيرات مكتملة</h3>
            </div>
          ) : (
            completedReminders.map((reminder) => (
              <div key={reminder.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(reminder.status)}
                        <h4 className="text-lg font-medium text-gray-900">{reminder.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reminder.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reminder.status === 'completed' ? 'مكتمل' : 'تم التجاهل'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{reminder.description}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>تم الإنشاء: {formatDate(reminder.createdAt)}</span>
                        <span>كان مجدولاً: {formatDate(reminder.scheduledTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">مقاييس الأداء</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(stats.performance.completionRate * 100)}%
                </div>
                <div className="text-sm text-gray-600">معدل الإنجاز</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.performance.averageSnoozeCount.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">متوسط التأجيل</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(stats.performance.onTimeCompletion * 100)}%
                </div>
                <div className="text-sm text-gray-600">الإنجاز في الوقت</div>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">الاتجاهات</h3>
            <div className="space-y-3">
              {stats.trends.map((trend: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{trend.period}</span>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>تم الإنشاء: {trend.created}</span>
                    <span>مكتمل: {trend.completed}</span>
                    <span>متأخر: {trend.overdue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
