import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface StockProgressBarProps {
  enabled: boolean;
  type: 'percentage' | 'count' | 'text';
  stock: number;
  maxStock?: number;
  lowColor?: string;
  mediumColor?: string;
  highColor?: string;
  threshold?: number;
}

const StockProgressBar: React.FC<StockProgressBarProps> = ({
  enabled,
  type,
  stock,
  maxStock,
  lowColor = '#ef4444',
  mediumColor = '#f59e0b',
  highColor = '#10b981',
  threshold = 10
}) => {
  if (!enabled) return null;

  const getStockStatus = () => {
    if (stock === 0) return { status: 'out', color: lowColor, text: 'نفد المخزون' };
    if (stock <= threshold) return { status: 'low', color: lowColor, text: 'قليل جداً' };
    if (maxStock && stock < maxStock * 0.5) return { status: 'medium', color: mediumColor, text: 'متوفر' };
    return { status: 'high', color: highColor, text: 'متوفر بكثرة' };
  };

  const stockStatus = getStockStatus();
  const percentage = maxStock ? (stock / maxStock) * 100 : 100;

  const renderContent = () => {
    switch (type) {
      case 'percentage':
        return (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">المخزون</span>
              <span className="text-sm font-bold" style={{ color: stockStatus.color }}>
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: stockStatus.color
                }}
              />
            </div>
          </div>
        );

      case 'count':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">المخزون:</span>
            <span className="text-sm font-bold" style={{ color: stockStatus.color }}>
              {stock} قطعة متبقية
            </span>
          </div>
        );

      case 'text':
        return (
          <div className="flex items-center gap-2">
            {stockStatus.status === 'out' && <XCircleIcon className="h-5 w-5" style={{ color: stockStatus.color }} />}
            {stockStatus.status === 'low' && <ExclamationTriangleIcon className="h-5 w-5" style={{ color: stockStatus.color }} />}
            {stockStatus.status === 'high' && <CheckCircleIcon className="h-5 w-5" style={{ color: stockStatus.color }} />}
            <span className="text-sm font-medium" style={{ color: stockStatus.color }}>
              {stockStatus.text}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {renderContent()}
    </div>
  );
};

export default StockProgressBar;


