import React, { useState, useEffect } from 'react';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

interface SoldNumberDisplayProps {
  enabled: boolean;
  type: 'real' | 'fake';
  min?: number;
  max?: number;
  text?: string;
  productId: string;
}

const SoldNumberDisplay: React.FC<SoldNumberDisplayProps> = ({
  enabled,
  type,
  min = 10,
  max = 500,
  text = 'تم بيع {count} قطعة',
  productId
}) => {
  const [soldCount, setSoldCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    if (type === 'real') {
      fetchRealSoldCount();
    } else {
      // Generate random number between min and max
      const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
      setSoldCount(randomCount);
      setLoading(false);
    }
  }, [enabled, type, min, max, productId]);

  const fetchRealSoldCount = async () => {
    try {
      setLoading(true);
      // Use storefrontFetch for public routes
      const { storefrontFetch } = await import('../../utils/storefrontApi');
      const response = await storefrontFetch(`/products/${productId}/sold-count`);
      
      if (response && response.success && response.data?.count) {
        setSoldCount(response.data.count);
      } else {
        // Fallback to random if API fails or returns no data
        const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
        setSoldCount(randomCount);
      }
    } catch (error: any) {
      // Silently handle errors - fallback to random
      // storefrontFetch throws Error with status property
      const status = error?.status || (error?.message?.includes('401') ? 401 : error?.message?.includes('404') ? 404 : 0);
      if (status !== 401 && status !== 404) {
        // Only log non-401/404 errors
        console.error('Error fetching sold count:', error);
      }
      // Fallback to random
      const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
      setSoldCount(randomCount);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || loading) return null;

  const displayText = text.replace('{count}', soldCount.toString());

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 my-4">
      <ShoppingBagIcon className="h-5 w-5 text-orange-600" />
      <span className="font-medium text-orange-900">{displayText}</span>
    </div>
  );
};

export default SoldNumberDisplay;


