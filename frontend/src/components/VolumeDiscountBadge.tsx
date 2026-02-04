import React, { useEffect, useState } from 'react';
import { TagIcon } from '@heroicons/react/24/outline';

interface VolumeDiscount {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

interface Props {
  productId: string;
  quantity: number;
}

const VolumeDiscountBadge: React.FC<Props> = ({ productId, quantity }) => {
  const [discounts, setDiscounts] = useState<VolumeDiscount[]>([]);
  const [applicableDiscount, setApplicableDiscount] = useState<VolumeDiscount | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, [productId]);

  useEffect(() => {
    findApplicableDiscount();
  }, [quantity, discounts]);

  const fetchDiscounts = async () => {
    try {
      // Use storefrontFetch for public routes
      const { storefrontFetch } = await import('../utils/storefrontApi');
      const response = await storefrontFetch(`/products/${productId}/volume-discounts`);
      
      if (response && response.success && response.data) {
        setDiscounts(Array.isArray(response.data) ? response.data : []);
      } else {
        setDiscounts([]);
      }
    } catch (error: any) {
      // Silently handle errors - endpoint might not exist or product has no discounts
      if (error?.response?.status !== 404) {
        // Only log non-404 errors
        console.error('Error fetching volume discounts:', error);
      }
      setDiscounts([]);
    }
  };

  const findApplicableDiscount = () => {
    if (!discounts.length) {
      setApplicableDiscount(null);
      return;
    }

    const applicable = discounts.find(discount => {
      const maxQty = discount.maxQuantity || 999999;
      return quantity >= discount.minQuantity && quantity <= maxQty;
    });

    setApplicableDiscount(applicable || null);
  };

  if (!discounts.length) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Current Discount Badge */}
      {applicableDiscount && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <TagIcon className="h-5 w-5 text-green-600" />
          <div>
            <div className="text-sm font-bold text-green-800">
              خصم {applicableDiscount.discountType === 'percentage' 
                ? `${applicableDiscount.discountValue}%` 
                : `${applicableDiscount.discountValue} جنيه`} مطبق!
            </div>
            <div className="text-xs text-green-600">
              على الكمية {quantity}
            </div>
          </div>
        </div>
      )}

      {/* All Available Discounts */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <TagIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-blue-900">خصومات الكميات المتاحة:</h3>
        </div>
        
        <div className="space-y-2">
          {discounts.map((discount) => {
            const isActive = applicableDiscount?.id === discount.id;
            const maxQty = discount.maxQuantity || '∞';
            
            return (
              <div 
                key={discount.id}
                className={`flex items-center justify-between p-2 rounded ${
                  isActive 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-white border border-blue-200'
                }`}
              >
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {discount.minQuantity} - {maxQty} قطعة
                  </span>
                </div>
                <div className={`text-sm font-bold ${
                  isActive ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {discount.discountType === 'percentage' 
                    ? `خصم ${discount.discountValue}%` 
                    : `خصم ${discount.discountValue} جنيه`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-blue-600">
          💡 اشتري كميات أكبر واحصل على خصم أفضل!
        </div>
      </div>
    </div>
  );
};

export default VolumeDiscountBadge;
