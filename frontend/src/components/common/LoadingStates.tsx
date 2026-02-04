import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Skeleton Loader للمحادثات
export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center p-4 border-b border-gray-200">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
            <div className="mt-2 h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
          <div className="ml-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton Loader للرسائل
export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[...Array(8)].map((_, index) => (
        <div
          key={index}
          className={`flex ${index % 3 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div className="animate-pulse">
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                index % 3 === 0
                  ? 'bg-gray-300 rounded-br-none'
                  : 'bg-gray-200 rounded-bl-none'
              }`}
            >
              <div className="h-4 bg-gray-400 rounded mb-2"></div>
              <div className={`h-4 bg-gray-400 rounded ${index % 2 === 0 ? 'w-3/4' : 'w-full'}`}></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// مؤشر التحميل العام
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <div className="flex items-center justify-center space-x-2 space-x-reverse">
      <ArrowPathIcon className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
      {text && (
        <span className={`text-sm ${colorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// مؤشر إعادة المحاولة
interface RetryIndicatorProps {
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export const RetryIndicator: React.FC<RetryIndicatorProps> = ({
  retryCount,
  maxRetries,
  isRetrying
}) => {
  if (!isRetrying && retryCount === 0) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center space-x-3 space-x-reverse">
        <LoadingSpinner size="sm" color="gray" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">
            جاري إعادة المحاولة... ({retryCount}/{maxRetries})
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            يرجى الانتظار قليلاً
          </p>
        </div>
      </div>
    </div>
  );
};

// مؤشر حالة الإرسال
interface SendingIndicatorProps {
  isSending: boolean;
}

export const SendingIndicator: React.FC<SendingIndicatorProps> = ({ isSending }) => {
  if (!isSending) return null;

  return (
    <div className="flex items-center justify-center p-2">
      <div className="flex items-center space-x-2 space-x-reverse text-blue-600">
        <LoadingSpinner size="sm" color="blue" />
        <span className="text-sm">جاري الإرسال...</span>
      </div>
    </div>
  );
};

// مؤشر التحميل الأولي
interface InitialLoadingProps {
  message?: string;
}

export const InitialLoading: React.FC<InitialLoadingProps> = ({
  message = "جاري تحميل المحادثات..."
}) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="mb-4">
          <LoadingSpinner size="lg" color="blue" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {message}
        </h3>
        <p className="text-sm text-gray-600">
          يرجى الانتظار قليلاً...
        </p>
      </div>
    </div>
  );
};

// مؤشر عدم وجود بيانات
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {icon && (
          <div className="mb-4 flex justify-center">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};
