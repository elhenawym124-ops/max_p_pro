import React from 'react';
import {
  ExclamationTriangleIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ErrorState } from '../../hooks/useErrorHandler';

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  compact = false
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getErrorIcon = (errorType: ErrorState['errorType']) => {
    const iconClass = "w-6 h-6";

    switch (errorType) {
      case 'network':
        return <WifiIcon className={`${iconClass} text-red-500`} />;
      case 'server':
        return <ServerIcon className={`${iconClass} text-red-500`} />;
      case 'auth':
        return <ShieldExclamationIcon className={`${iconClass} text-yellow-500`} />;
      case 'validation':
        return <ExclamationTriangleIcon className={`${iconClass} text-orange-500`} />;
      default:
        return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    }
  };

  const getErrorColor = (errorType: ErrorState['errorType']) => {
    switch (errorType) {
      case 'network':
        return 'red';
      case 'server':
        return 'red';
      case 'auth':
        return 'yellow';
      case 'validation':
        return 'orange';
      default:
        return 'red';
    }
  };

  const color = getErrorColor(error.errorType);

  if (compact) {
    return (
      <div className={`flex items-center p-3 bg-${color}-50 border border-${color}-200 rounded-lg`}>
        <div className="flex-shrink-0">
          {getErrorIcon(error.errorType)}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm text-${color}-800`}>
            {error.errorMessage}
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          {error.canRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`text-${color}-600 hover:text-${color}-800 transition-colors duration-200`}
              title="إعادة المحاولة"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`text-${color}-400 hover:text-${color}-600 transition-colors duration-200`}
              title="إغلاق"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-${color}-50 border border-${color}-200 p-6`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getErrorIcon(error.errorType)}
        </div>
        <div className="ml-4 flex-1">
          <h3 className={`text-lg font-medium text-${color}-800 mb-2`}>
            {error.errorType === 'network' && 'مشكلة في الاتصال'}
            {error.errorType === 'server' && 'خطأ في الخادم'}
            {error.errorType === 'auth' && 'مشكلة في المصادقة'}
            {error.errorType === 'validation' && 'خطأ في البيانات'}
            {error.errorType === 'unknown' && 'خطأ غير متوقع'}
          </h3>

          {/* عرض رسالة الخطأ مع دعم الأسطر المتعددة */}
          <div className={`text-sm text-${color}-700 mb-4 whitespace-pre-line`}>
            {error.errorMessage.split('\n').map((line, index) => (
              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                {line}
              </p>
            ))}
          </div>

          {/* عرض رسالة المستخدم المبسطة */}
          {error.details?.userMessage && (
            <div className={`text-sm text-${color}-800 mb-4 bg-${color}-100 px-4 py-3 rounded-lg border border-${color}-300`}>
              <span className="font-semibold">💡 نصيحة: </span>
              {error.details.userMessage}
            </div>
          )}

          {error.errorCode && (
            <div className={`text-xs text-${color}-600 mb-4 bg-${color}-100 px-3 py-2 rounded border border-${color}-200`}>
              <span className="font-semibold">رمز الخطأ:</span> {error.errorCode}
            </div>
          )}

          {/* عرض التفاصيل التقنية (للمطورين) */}
          {error.details && (error.details.endpoint || error.details.method || error.details.statusCode) && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-sm text-${color}-700 hover:text-${color}-900 font-medium flex items-center gap-2 mb-2`}
              >
                <span>{showDetails ? '▼' : '◀'}</span>
                <span>{showDetails ? 'إخفاء التفاصيل التقنية' : 'عرض التفاصيل التقنية (للمطورين)'}</span>
              </button>

              {showDetails && (
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono space-y-2 max-h-96 overflow-auto">
                  {error.details.endpoint && (
                    <div>
                      <span className="text-gray-400">🔗 Endpoint:</span>
                      <div className="text-yellow-300 mt-1">
                        {error.details.method} {error.details.endpoint}
                      </div>
                    </div>
                  )}

                  {error.details.statusCode && (
                    <div>
                      <span className="text-gray-400">📊 Status Code:</span>
                      <div className="text-red-400 mt-1">{error.details.statusCode}</div>
                    </div>
                  )}

                  {error.details.requestData && (
                    <div>
                      <span className="text-gray-400">📤 Request Data:</span>
                      <pre className="text-blue-300 mt-1 overflow-x-auto">
                        {JSON.stringify(error.details.requestData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {error.details.responseData && (
                    <div>
                      <span className="text-gray-400">📥 Response Data:</span>
                      <pre className="text-red-300 mt-1 overflow-x-auto">
                        {typeof error.details.responseData === 'object'
                          ? JSON.stringify(error.details.responseData, null, 2)
                          : error.details.responseData
                        }
                      </pre>
                    </div>
                  )}

                  {error.details.stackTrace && process.env['NODE_ENV'] === 'development' && (
                    <div>
                      <span className="text-gray-400">🔍 Stack Trace:</span>
                      <pre className="text-gray-300 mt-1 text-[10px] overflow-x-auto">
                        {error.details.stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-3 space-x-reverse mt-4">
            {error.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${color}-600 hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 transition-colors duration-200`}
              >
                <ArrowPathIcon className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`inline-flex items-center px-4 py-2 border border-${color}-300 text-sm font-medium rounded-md text-${color}-700 bg-white hover:bg-${color}-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 transition-colors duration-200`}
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// مكون خطأ مبسط للاستخدام في القوائم
export const InlineError: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="flex items-center justify-center p-4 text-center">
      <div className="flex items-center space-x-3 space-x-reverse text-red-600">
        <ExclamationTriangleIcon className="w-5 h-5" />
        <span className="text-sm">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
};

// مكون إشعار خطأ عائم
export const ErrorToast: React.FC<{
  error: ErrorState;
  onDismiss: () => void;
  onRetry?: () => void;
}> = ({ error, onDismiss, onRetry }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                حدث خطأ
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {error.errorMessage}
              </p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              {error.canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  إعادة
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
