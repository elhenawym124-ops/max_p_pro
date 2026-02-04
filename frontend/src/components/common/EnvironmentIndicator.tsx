/**
 * Environment Indicator Component
 * مؤشر البيئة الحالية (تطوير أم إنتاج)
 */

import React from 'react';
import { envConfig } from '../../config/environment';

interface EnvironmentIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showInProduction?: boolean;
}

const EnvironmentIndicator: React.FC<EnvironmentIndicatorProps> = ({
  position = 'bottom-left',
  showInProduction = false
}) => {
  // إخفاء في الإنتاج إذا لم يتم تحديد إظهار
  if (envConfig.isProduction && !showInProduction) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const environmentColors = {
    development: 'bg-green-500 text-white',
    production: 'bg-red-500 text-white'
  };

  return (
    <div
      className={`
        fixed z-50 px-3 py-1 rounded-md text-xs font-bold shadow-lg
        ${positionClasses[position]}
        ${environmentColors[envConfig.environment]}
        border-2 border-white/20
      `}
      title={`البيئة: ${envConfig.environment}\nAPI: ${envConfig.apiUrl}\nWS: ${envConfig.wsUrl}`}
    >
      🌍 {envConfig.environment === 'development' ? 'تطوير' : 'إنتاج'}
      {envConfig.isDevelopment && (
        <div className="text-[10px] opacity-75 mt-1">
          localhost:{window.location.port || '3000'}
        </div>
      )}
    </div>
  );
};

export default EnvironmentIndicator;