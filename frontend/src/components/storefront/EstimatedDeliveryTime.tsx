import React, { useState, useEffect } from 'react';
import { TruckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getCompanyId } from '../../utils/storefrontApi';

interface EstimatedDeliveryTimeProps {
  enabled: boolean;
  showOnProduct: boolean;
  defaultText?: string;
  productId?: string;
  city?: string;
}

const EstimatedDeliveryTime: React.FC<EstimatedDeliveryTimeProps> = ({
  enabled,
  showOnProduct,
  defaultText = 'التوصيل خلال {time}',
  productId,
  city
}) => {
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !showOnProduct) return;

    const fetchDeliveryTime = async () => {
      try {
        setLoading(true);
        const companyId = getCompanyId();
        if (!companyId) {
          setLoading(false);
          return;
        }

        // محاولة جلب وقت التوصيل من Shipping Zones
        // Use storefrontFetch to avoid authentication issues
        const { storefrontFetch } = await import('../../utils/storefrontApi');
        const response = await storefrontFetch(`/cart/shipping/calculate?city=${encodeURIComponent(city || 'القاهرة')}`);
        
        // Handle response
        if (response && response.success && response.data?.deliveryTime) {
          setDeliveryTime(response.data.deliveryTime);
        } else {
          // استخدام القيمة الافتراضية
          setDeliveryTime('2-3 أيام');
        }

      } catch (error: any) {
        // Silently handle errors - use default value
        // storefrontFetch throws Error with status property
        const status = error?.status || (error?.message?.includes('401') ? 401 : error?.message?.includes('404') ? 404 : 0);
        if (status !== 401 && status !== 404) {
          // Only log non-401/404 errors
          console.error('Error fetching delivery time:', error);
        }
        // استخدام القيمة الافتراضية في حالة الخطأ
        setDeliveryTime('2-3 أيام');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryTime();
  }, [enabled, showOnProduct, city]);

  if (!enabled || !showOnProduct || loading) {
    return null;
  }

  if (!deliveryTime) {
    return null;
  }

  const displayText = defaultText.replace('{time}', deliveryTime);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <TruckIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {displayText}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            * وقت التوصيل قد يختلف حسب المنطقة
          </p>
        </div>
      </div>
    </div>
  );
};

export default EstimatedDeliveryTime;

