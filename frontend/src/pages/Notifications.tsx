import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../hooks/useAuthSimple';
import useSocket from '../hooks/useSocket';
import {
  BellIcon,
  CheckIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

interface NotificationItem {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success' | 'test' | 'ai_error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  silent?: boolean;
  customerId?: string;
  errorType?: string;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: 'system' | 'ai'; // مصدر الإشعار
}

const Notifications: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'system' | 'ai'>('all');
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
    fetchAINotifications();
  }, [user, isAuthenticated]);

  // الاستماع لإشعارات AI الجديدة عبر Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleAINotification = (aiNotification: any) => {
      console.log('📢 [Notifications] Received AI notification:', aiNotification);

      // تحويل إشعار AI للصيغة الموحدة
      const notification: NotificationItem = {
        id: aiNotification.id,
        type: 'ai_error',
        title: aiNotification.title,
        message: aiNotification.message,
        timestamp: new Date(aiNotification.createdAt || Date.now()),
        isRead: false,
        metadata: aiNotification.metadata,
        severity: aiNotification.severity,
        source: 'ai'
      };

      setNotifications((prev: NotificationItem[]) => [notification, ...prev]);
    };

    // استخدام socket.on مباشرة بدون type checking
    (socket as any).on('ai_notification', handleAINotification);

    return () => {
      (socket as any).off('ai_notification', handleAINotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    if (!user || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/v1/notifications/recent', { params: { limit: 50 } });

      if (response.data.success || response.status === 200) {
        const systemNotifications = (response.data.notifications || []).map((n: any) => ({
          ...n,
          source: 'system' as const
        }));

        setNotifications((prev: NotificationItem[]) => {
          // دمج الإشعارات الجديدة مع الموجودة (AI notifications)
          const aiNotifications = prev.filter((n: NotificationItem) => n.source === 'ai');
          return [...systemNotifications, ...aiNotifications];
        });
      }
    } catch (error) {
      console.error('❌ [NotificationsPage] Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAINotifications = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get('/ai-notifications', {
        params: { limit: 50 }
      });

      if (response.data.success) {
        const aiNotifications = response.data.data.notifications.map((n: any) => ({
          id: n.id,
          type: 'ai_error' as const,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.createdAt),
          isRead: n.isRead,
          metadata: n.metadata,
          severity: n.severity,
          source: 'ai' as const
        }));

        setNotifications((prev: NotificationItem[]) => {
          // دمج إشعارات AI مع إشعارات النظام
          const systemNotifications = prev.filter((n: NotificationItem) => n.source === 'system');
          return [...systemNotifications, ...aiNotifications];
        });
      }
    } catch (error) {
      console.error('❌ Error fetching AI notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string, source: 'system' | 'ai' = 'system') => {
    try {
      if (source === 'ai') {
        await apiClient.patch(`/ai-notifications/${notificationId}/read`, {});
      } else {
        await apiClient.post(`/notifications/${notificationId}/read`, {});
      }

      setNotifications((prev: NotificationItem[]) =>
        prev.map((n: NotificationItem) => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read', {});

      setNotifications((prev: NotificationItem[]) =>
        prev.map((n: NotificationItem) => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string, severity?: string) => {
    // إشعارات AI حسب الخطورة
    if (type === 'ai_error') {
      switch (severity) {
        case 'critical':
          return <XCircleIcon className="h-6 w-6 text-red-600" />;
        case 'high':
          return <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />;
        case 'medium':
          return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
        default:
          return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      }
    }

    // إشعارات النظام العادية
    switch (type) {
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'test':
        return <BellSolidIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string, severity?: string) => {
    // إشعارات AI حسب الخطورة
    if (type === 'ai_error') {
      switch (severity) {
        case 'critical':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'high':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    }

    // إشعارات النظام العادية
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'test':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const filteredNotifications = notifications.filter((notification: NotificationItem) => {
    const matchesReadFilter = filter === 'all' ||
      (filter === 'read' && notification.isRead) ||
      (filter === 'unread' && !notification.isRead);

    const matchesTypeFilter = typeFilter === 'all' || notification.type === typeFilter;

    const matchesSourceFilter = sourceFilter === 'all' || notification.source === sourceFilter;

    return matchesReadFilter && matchesTypeFilter && matchesSourceFilter;
  }).sort((a: NotificationItem, b: NotificationItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = notifications.filter((n: NotificationItem) => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <BellSolidIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الإشعارات</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  إجمالي الإشعارات: {notifications.length} | غير مقروءة: {unreadCount}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 space-x-reverse"
              >
                <CheckIcon className="h-5 w-5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Read Status Filter */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الحالة:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">الكل</option>
                <option value="unread">غير مقروءة</option>
                <option value="read">مقروءة</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">النوع:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">الكل</option>
                <option value="info">معلومات</option>
                <option value="success">نجاح</option>
                <option value="warning">تحذير</option>
                <option value="error">خطأ</option>
                <option value="ai_error">أخطاء AI</option>
                <option value="test">تجريبي</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">المصدر:</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">الكل</option>
                <option value="system">النظام</option>
                <option value="ai">الذكاء الاصطناعي</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد إشعارات</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات متاحة'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification: NotificationItem) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500' : ''
                    }`}
                >
                  <div className="flex items-start space-x-4 space-x-reverse">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type, notification.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 space-x-reverse mb-2">
                            <h3 className={`text-lg font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getTypeColor(notification.type, notification.severity)}`}>
                              {notification.type === 'ai_error' ?
                                (notification.severity === 'critical' ? '🚨 AI حرج' :
                                  notification.severity === 'high' ? '⚠️ AI عالي' :
                                    notification.severity === 'medium' ? '⚡ AI متوسط' : 'ℹ️ AI') :
                                notification.type === 'test' ? 'تجريبي' :
                                  notification.type === 'success' ? 'نجاح' :
                                    notification.type === 'error' ? 'خطأ' :
                                      notification.type === 'warning' ? 'تحذير' : 'معلومات'}
                            </span>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">
                            {notification.message}
                          </p>

                          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              {new Date(notification.timestamp).toLocaleString('ar-EG')}
                            </span>
                            {notification.isRead && (
                              <span className="flex items-center space-x-1 space-x-reverse">
                                <CheckIcon className="h-4 w-4" />
                                <span>مقروء</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse mr-4">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id, notification.source)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                              title="تحديد كمقروء"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}

                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="حذف الإشعار"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;

