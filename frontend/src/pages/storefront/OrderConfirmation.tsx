import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { trackPurchase } from '../../utils/facebookPixel';
import { storefrontApi } from '../../utils/storefrontApi';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import analyticsService from '../../services/analyticsService';

const OrderConfirmation: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('trackingToken');
  const companyId = searchParams.get('companyId');
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    if (companyId) {
      fetchStorefrontSettings();
    }
  }, [companyId]);

  useEffect(() => {
    if (orderNumber && companyId) {
      fetchOrderData();
    }
  }, [orderNumber, companyId]);

  const fetchStorefrontSettings = async () => {
    try {
      const response = await storefrontSettingsService.getPublicSettings(companyId || '');
      if (response.success && response.data) {
        setStorefrontSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const fetchOrderData = async () => {
    try {
      const phone = searchParams.get('phone');
      if (phone && orderNumber) {
        const data = await storefrontApi.trackOrder(orderNumber, phone);
        if (data.success && data.data) {
          setOrderData(data.data);
          
          // Track Purchase event as backup (in case it wasn't tracked before)
          // Use a flag in sessionStorage to prevent duplicate tracking
          const trackingKey = `purchase_tracked_${orderNumber}`;
          const alreadyTracked = sessionStorage.getItem(trackingKey);
          
          if (!alreadyTracked) {
            // Track Facebook Pixel
            if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackPurchase !== false && data.data.items) {
              try {
                trackPurchase({
                  orderNumber: orderNumber,
                  items: data.data.items.map((item: any) => ({
                    id: item.productId,
                    quantity: item.quantity || 1,
                    price: item.price || 0
                  })),
                  total: data.data.finalTotal || data.data.total || 0
                });
                console.log('✅ [Facebook Pixel] Purchase tracked on OrderConfirmation page (backup)');
              } catch (error) {
                console.error('❌ [Facebook Pixel] Error tracking Purchase:', error);
              }
            }
            
            // Track analytics purchase
            if (data.data.items && data.data.id) {
              const productIds = data.data.items.map((item: any) => item.productId);
              const total = data.data.finalTotal || data.data.total || 0;
              analyticsService.trackPurchase(data.data.id, total, productIds);
            }
            
            sessionStorage.setItem(trackingKey, 'true');
          } else {
            console.log('ℹ️ [Analytics] Purchase already tracked, skipping duplicate');
          }
        }
      } else {
        console.warn('⚠️ [OrderConfirmation] Missing phone or orderNumber for tracking');
      }
    } catch (error) {
      console.error('Error fetching order data:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="h-20 w-20 text-green-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          تم إنشاء طلبك بنجاح! 🎉
        </h1>

        <p className="text-gray-600 mb-8">
          شكراً لك! تم استلام طلبك وسيتم معالجته قريباً
        </p>

        {/* Order Number */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-2">رقم الطلب</p>
          <p className="text-2xl font-bold text-gray-900">{orderNumber}</p>
        </div>

        {/* Info */}
        <div className="text-right bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">ماذا بعد؟</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>سنتواصل معك قريباً لتأكيد الطلب</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>يمكنك تتبع طلبك باستخدام رقم الطلب ورقم الهاتف</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>سيتم توصيل الطلب خلال 2-3 أيام عمل</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/shop/track-order?orderNumber=${orderNumber}&companyId=${companyId}`}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            تتبع الطلب
          </Link>
          <Link
            to={`/shop?companyId=${companyId}`}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            متابعة التسوق
          </Link>
        </div>

        {/* Tracking Token Info */}
        {trackingToken && (
          <div className="mt-6 text-xs text-gray-500">
            <p>رمز التتبع: {trackingToken}</p>
            <p className="mt-1">احتفظ بهذا الرمز للتتبع السريع</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
