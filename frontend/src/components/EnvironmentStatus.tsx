import React, { useEffect, useState } from 'react';
import { testApiConnection, environmentInfo } from '../utils/environmentTest';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface EnvironmentStatus {
  apiConnection: 'loading' | 'success' | 'error';
  configValid: boolean;
  environment: string;
  apiUrl: string;
}

const EnvironmentStatus: React.FC = () => {
  const [status, setStatus] = useState<EnvironmentStatus>({
    apiConnection: 'loading',
    configValid: environmentInfo.configTest.allUrlsValid,
    environment: environmentInfo.environment,
    apiUrl: environmentInfo.apiUrl
  });

  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const result = await testApiConnection();
        setStatus(prev => ({
          ...prev,
          apiConnection: result ? 'success' : 'error'
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          apiConnection: 'error'
        }));
      }
    };

    checkApiConnection();
  }, []);

  const getStatusIcon = (status: 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading':
        return 'جاري الاختبار...';
      case 'success':
        return 'متصل بنجاح';
      case 'error':
        return 'فشل في الاتصال';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">حالة إعدادات البيئة</h3>
      
      <div className="space-y-4">
        {/* Environment Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">البيئة الحالية:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status.environment === 'development' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {status.environment === 'development' ? 'تطوير' : 'إنتاج'}
          </span>
        </div>

        {/* API URL */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">رابط API:</span>
          <span className="text-sm text-gray-600 font-mono">{status.apiUrl}</span>
        </div>

        {/* Config Validation */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">صحة الإعدادات:</span>
          <div className="flex items-center">
            {status.configValid ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="ml-2 text-sm text-gray-600">
              {status.configValid ? 'صحيحة' : 'خاطئة'}
            </span>
          </div>
        </div>

        {/* API Connection */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">اتصال API:</span>
          <div className="flex items-center">
            {getStatusIcon(status.apiConnection)}
            <span className="ml-2 text-sm text-gray-600">
              {getStatusText(status.apiConnection)}
            </span>
          </div>
        </div>
      </div>

      {/* Environment Details */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">تفاصيل البيئة:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Hostname: {window.location.hostname}</div>
          <div>Port: {window.location.port || '80/443'}</div>
          <div>Protocol: {window.location.protocol}</div>
          <div>Config API Match: {environmentInfo.configTest.apiUrlMatch ? '✅' : '❌'}</div>
        </div>
      </div>

      {/* Recommendations */}
      {status.apiConnection === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-1">مشكلة في الاتصال</h4>
          <p className="text-sm text-red-700">
            تأكد من أن الخادم الخلفي يعمل على {status.apiUrl}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnvironmentStatus;