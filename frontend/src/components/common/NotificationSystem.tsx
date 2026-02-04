import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation entrance
    setTimeout(() => setIsVisible(true), 100);

    // Auto dismiss
    if (!notification.persistent && notification.duration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.persistent]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <BellIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out mb-3
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBackgroundColor()}
        border rounded-lg shadow-lg p-4 max-w-sm w-full
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="mr-3 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {notification.title}
          </h4>
          <p className="text-sm text-gray-600">
            {notification.message}
          </p>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              {notification.action.label}
            </button>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {notification.timestamp.toLocaleTimeString('ar-SA')}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      duration: notification.duration || 5000
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });
  }, [maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Expose methods globally
  useEffect(() => {
    (window as any).showNotification = addNotification;
    (window as any).clearNotifications = clearAll;
    
    return () => {
      delete (window as any).showNotification;
      delete (window as any).clearNotifications;
    };
  }, [addNotification, clearAll]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50 pointer-events-none`}>
      <div className="pointer-events-auto">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
          />
        ))}
        {notifications.length > 1 && (
          <button
            onClick={clearAll}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors duration-200"
          >
            مسح جميع الإشعارات ({notifications.length})
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for using notifications
export const useNotifications = () => {
  const showSuccess = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({
      type: 'success',
      title,
      message,
      ...options
    });
  }, []);

  const showError = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    });
  }, []);

  const showWarning = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, []);

  const showInfo = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({
      type: 'info',
      title,
      message,
      ...options
    });
  }, []);

  const clearAll = useCallback(() => {
    (window as any).clearNotifications?.();
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  };
};

export default NotificationSystem;
