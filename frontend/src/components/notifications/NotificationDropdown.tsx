import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

export interface NotificationItem {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success' | 'invitation';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  silent?: boolean;
  customerId?: string;
  errorType?: string;
  metadata?: any;
  data?: {
    invitationId?: string;
    token?: string;
    companyName?: string;
    inviterName?: string;
    role?: string;
    expiresAt?: string;
    invitationLink?: string;
  };
}

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ className = '' }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // الحصول على الـ token من localStorage مباشرة
  const getToken = () => localStorage.getItem('accessToken');

  // إغلاق الـ dropdown عند الضغط خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديث عدد الإشعارات غير المقروءة
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // جلب الإشعارات من الـ API - optimized with Page Visibility API
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh every 30 seconds (only when visible)
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchNotifications = async () => {
    // لا نجلب الإشعارات إذا لم يكن المستخدم مسجل دخول
    if (!user || !isAuthenticated) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    try {
      // ✅ إضافة timeout أقصر (5 ثواني بدل 30)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl('notifications/recent'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else if (response.status === 401) {
        setNotifications([]);
      } else {
        // ✅ Silent fail - don't spam console
        setNotifications([]);
      }
    } catch (error) {
      // ✅ Silent fail - don't spam console when backend is down
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl(`notifications/${notificationId}/read`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl('notifications/mark-all-read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl(`notifications/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleAcceptInvitation = (notification: NotificationItem) => {
    if (notification.data?.invitationLink) {
      window.location.href = notification.data.invitationLink;
    }
  };

  const handleDeclineInvitation = async (notification: NotificationItem) => {
    // Just mark as read and delete
    await markAsRead(notification.id);
    await deleteNotification(notification.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckIcon className="w-5 h-5 text-green-500" />;
      case 'invitation':
        return <span className="text-2xl">🎉</span>;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-r-red-400 bg-red-50';
      case 'warning':
        return 'border-r-yellow-400 bg-yellow-50';
      case 'info':
        return 'border-r-blue-400 bg-blue-50';
      case 'success':
        return 'border-r-green-400 bg-green-50';
      case 'invitation':
        return 'border-r-purple-400 bg-gradient-to-r from-purple-50 to-pink-50';
      default:
        return 'border-r-gray-400 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  // إخفاء الجرس إذا لم يكن المستخدم مسجل دخول
  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors duration-200"
        title="الإشعارات"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-orange-500" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}

        {/* Badge للعدد */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
              <div className="flex items-center space-x-2 space-x-reverse">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${!notification.isRead ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                            {notification.silent && (
                              <span className="mr-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                صامت
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Invitation Action Buttons */}
                          {notification.type === 'invitation' && notification.data && (
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => handleAcceptInvitation(notification)}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-sm"
                              >
                                ✅ قبول الدعوة
                              </button>
                              <button
                                onClick={() => handleDeclineInvitation(notification)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
                              >
                                ❌ رفض
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {notification.customerId && (
                              <span className="text-xs text-gray-500">
                                العميل: {notification.customerId.slice(-8)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 space-x-reverse mr-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                              title="تحديد كمقروء"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="حذف"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page
                  window.location.href = '/notifications';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
