import React from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// زر التمرير للأسفل
interface ScrollToBottomButtonProps {
  onClick: () => void;
  show: boolean;
  unreadCount?: number;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  onClick,
  show,
  unreadCount = 0
}) => {
  if (!show) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <button
        onClick={onClick}
        className="relative bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-3 shadow-lg transition-all duration-200 hover:shadow-xl"
        title="التمرير للأسفل"
      >
        <ChevronDownIcon className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

// زر التمرير للأعلى
interface ScrollToTopButtonProps {
  onClick: () => void;
  show: boolean;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  onClick,
  show
}) => {
  if (!show) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <button
        onClick={onClick}
        className="bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-2 shadow-lg transition-all duration-200 hover:shadow-xl"
        title="التمرير للأعلى"
      >
        <ChevronUpIcon className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
};

// تنبيه الرسائل الجديدة
interface NewMessageAlertProps {
  show: boolean;
  count: number;
  onClick: () => void;
}

export const NewMessageAlert: React.FC<NewMessageAlertProps> = ({
  show,
  count,
  onClick
}) => {
  if (!show || count === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
      <button
        onClick={onClick}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl flex items-center space-x-2 space-x-reverse animate-pulse"
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {count === 1 ? 'رسالة جديدة' : `${count} رسائل جديدة`}
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

// حاوي الرسائل مع التمرير المحسن
interface MessagesContainerProps {
  children: React.ReactNode;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const MessagesContainer: React.FC<MessagesContainerProps> = ({
  children,
  onScroll,
  containerRef,
  className = ""
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth messages-scroll ${className}`}
      style={{
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
      }}
    >
      {children}
    </div>
  );
};

// مؤشر الكتابة
interface TypingIndicatorProps {
  show: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  show,
  userName = "المستخدم"
}) => {
  if (!show) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-gray-200 rounded-lg rounded-bl-none px-4 py-2">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">{userName} يكتب</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// مؤشر حالة الاتصال
interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isReconnecting = false
}) => {
  if (isConnected && !isReconnecting) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div className={`text-center py-2 text-sm font-medium ${
        isReconnecting 
          ? 'bg-yellow-100 text-yellow-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isReconnecting ? (
          <div className="flex items-center justify-center space-x-2 space-x-reverse">
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <span>جاري إعادة الاتصال...</span>
          </div>
        ) : (
          'انقطع الاتصال - يرجى التحقق من الإنترنت'
        )}
      </div>
    </div>
  );
};
