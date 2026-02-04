import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface ReasonsToPurchaseProps {
  enabled: boolean;
  reasons: string[]; // Array of reasons
  maxItems?: number;
  style?: 'list' | 'icons';
}

const ReasonsToPurchase: React.FC<ReasonsToPurchaseProps> = ({
  enabled,
  reasons,
  maxItems = 4,
  style = 'list'
}) => {
  if (!enabled || !reasons || reasons.length === 0) {
    return null;
  }

  const displayReasons = reasons.slice(0, maxItems);

  if (style === 'icons') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-right">لماذا تشتري هذا المنتج؟</h3>
        <div className="grid grid-cols-2 gap-3">
          {displayReasons.map((reason, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-right">{reason}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 text-right">لماذا تشتري هذا المنتج؟</h3>
      <div className="space-y-2">
        {displayReasons.map((reason, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-right">{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReasonsToPurchase;


