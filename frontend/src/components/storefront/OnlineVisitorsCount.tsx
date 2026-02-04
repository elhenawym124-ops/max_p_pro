import React, { useState, useEffect } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

interface OnlineVisitorsCountProps {
  enabled: boolean;
  type: 'real' | 'fake';
  min?: number;
  max?: number;
  updateInterval?: number;
  text?: string;
  productId: string;
}

const OnlineVisitorsCount: React.FC<OnlineVisitorsCountProps> = ({
  enabled,
  type,
  min = 5,
  max = 50,
  updateInterval = 30,
  text = '{count} شخص يشاهدون هذا المنتج الآن',
  productId
}) => {
  const [visitorCount, setVisitorCount] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const updateCount = () => {
      if (type === 'fake') {
        // Generate random number between min and max
        const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
        setVisitorCount(randomCount);
      } else {
        // TODO: Implement real-time tracking
        // For now, use fake count
        const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
        setVisitorCount(randomCount);
      }
    };

    // Initial update
    updateCount();

    // Set up interval
    const interval = setInterval(updateCount, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [enabled, type, min, max, updateInterval, productId]);

  if (!enabled) return null;

  const displayText = text.replace('{count}', visitorCount.toString());

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 my-4 animate-pulse">
      <UserGroupIcon className="h-5 w-5 text-blue-600" />
      <span className="font-medium text-blue-900">{displayText}</span>
    </div>
  );
};

export default OnlineVisitorsCount;


