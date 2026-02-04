import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, MinusIcon, PlusIcon, TruckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { apiClient } from '../../services/apiClient';
import StorefrontNav from '../../components/StorefrontNav';
import { trackAddToCart, trackInitiateCheckout } from '../../utils/facebookPixel';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import analyticsService from '../../services/analyticsService';

interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface FreeShippingSettings {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings | null>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);
  const companyId = getCompanyId(); // Get companyId from URL or localStorage

  useEffect(() => {
    // Verify companyId exists
    if (!companyId) {
      toast.error('⚠️ يجب زيارة المتجر من رابط صحيح');
      navigate('/');
      return;
    }
    // Track store visit
    analyticsService.trackStoreVisit(window.location.pathname);
    fetchCart();
    fetchFreeShippingSettings();
    fetchStorefrontSettings();
  }, []);

  const fetchStorefrontSettings = async () => {
    try {
      const response = await storefrontSettingsService.getPublicSettings(companyId);
      if (response.success && response.data) {
        setStorefrontSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);

      // Backend uses cookies for cart, no need for sessionId
      const data = await storefrontApi.getCart();

      if (data.success) {
        // Fix image URLs - parse JSON strings if needed
        const fixedItems = (data.data.items || []).map((item: any) => {
          let fixedImage = item.image;

          // If image is a JSON string, parse it
          if (typeof item.image === 'string' && item.image.startsWith('[')) {
            try {
              const parsed = JSON.parse(item.image);
              fixedImage = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
            } catch (e) {
              console.error('❌ [CART] Failed to parse image:', item.image);
            }
          }

          return {
            ...item,
            image: fixedImage
          };
        });

        setItems(fixedItems);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('حدث خطأ في جلب السلة');
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeShippingSettings = async () => {
    try {
      console.log('🔍 [CART] Fetching free shipping settings for company:', companyId);

      const response = await apiClient.get(`/public/promotion-settings/${companyId}`);

      console.log('✅ [CART] Free shipping response:', response.data);

      if (response.data.success) {
        setFreeShippingSettings(response.data.data);
        console.log('✅ [CART] Free shipping settings loaded:', response.data.data);
      }
    } catch (error: any) {
      console.error('❌ [CART] Error fetching free shipping settings:', error);
      console.error('❌ [CART] Error details:', error.response?.data);
      // لا نعرض خطأ للمستخدم، فقط نخفي الميزة
    }
  };

  const updateQuantity = async (productId: string, variantId: string | null | undefined, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const data = await storefrontApi.updateCartItem(productId, {
        quantity: newQuantity,
        variantId: variantId || null
      });

      if (data.success) {
        const updatedItems = data.data.items;
        setItems(updatedItems);
        window.dispatchEvent(new Event('cartUpdated'));

        // Track AddToCart event if quantity increased
        const oldItem = items.find(item => item.productId === productId && item.variantId === variantId);
        if (oldItem && newQuantity > oldItem.quantity && storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackAddToCart !== false) {
          try {
            const quantityDiff = newQuantity - oldItem.quantity;
            trackAddToCart({
              id: productId,
              name: oldItem.name,
              price: oldItem.price,
              quantity: quantityDiff
            });
            console.log('📊 [Facebook Pixel] AddToCart tracked (quantity update)');
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking AddToCart:', error);
          }
        }
      } else {
        toast.error(data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('حدث خطأ في تحديث الكمية');
    }
  };

  const removeItem = async (productId: string, variantId: string | null | undefined) => {
    try {
      const data = await storefrontApi.removeCartItem(productId, variantId);

      if (data.success) {
        setItems(data.data.items);
        toast.success('تم حذف المنتج من السلة');
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('حدث خطأ في حذف المنتج');
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const renderFreeShippingBanner = () => {
    if (!freeShippingSettings || !freeShippingSettings.freeShippingEnabled) {
      return null;
    }

    const cartTotal = calculateTotal();
    const threshold = freeShippingSettings.freeShippingThreshold;
    const remaining = threshold - cartTotal;
    const progress = Math.min((cartTotal / threshold) * 100, 100);

    if (remaining > 0) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <TruckIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-900 font-medium mb-2">
                🚚 أضف منتجات بقيمة <span className="font-bold">{remaining.toFixed(2)} جنيه</span> أخرى للحصول على شحن مجاني!
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700 mt-1">{progress.toFixed(0)}% من الحد الأدنى</p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <TruckIcon className="w-6 h-6 text-green-600" />
            <div className="flex-1">
              <p className="text-green-900 font-bold">
                🎉 تهانينا! حصلت على شحن مجاني!
              </p>
              <p className="text-sm text-green-700 mt-1">
                {freeShippingSettings.freeShippingMessage.replace('{amount}', threshold.toString())}
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    const companyId = getCompanyId();
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">السلة فارغة</h2>
        <p className="text-gray-600 mb-8">لم تقم بإضافة أي منتجات بعد</p>
        <Link
          to={`/shop?companyId=${companyId}`}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <>
      <StorefrontNav />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">سلة التسوق</h1>

        {/* Free Shipping Banner */}
        {renderFreeShippingBanner()}

        <div className="bg-white rounded-lg shadow">
          {/* Cart Items */}
          <div className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <div key={`${item.productId}-${item.variantId || 'default'}-${index}`} className="p-6">
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-3xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-lg font-bold text-gray-900">{item.price} جنيه</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MinusIcon className="h-4 w-4 text-gray-700" />
                    </button>
                    <span className="text-lg font-semibold w-8 text-center text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 text-gray-700" />
                    </button>
                  </div>

                  {/* Total */}
                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-bold text-gray-900">
                      {item.price * item.quantity} جنيه
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-700">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold">{calculateTotal()} جنيه</span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span>الشحن:</span>
                <span className="font-semibold">يُحسب عند الدفع</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex items-center justify-between text-xl font-bold text-gray-900">
                <span>الإجمالي:</span>
                <span>{calculateTotal()} جنيه</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to={`/shop?companyId=${companyId}`}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-center transition-colors"
              >
                متابعة التسوق
              </Link>
              <button
                onClick={() => {
                  console.log('🔍 [CART] Checkout button clicked');
                  console.log('🔍 [CART] companyId:', companyId);
                  console.log('🔍 [CART] items count:', items.length);
                  if (!companyId) {
                    toast.error('⚠️ يجب زيارة المتجر من رابط صحيح');
                    return;
                  }
                  if (items.length === 0) {
                    toast.error('⚠️ السلة فارغة. أضف منتجات قبل إتمام الطلب');
                    return;
                  }

                  // Track InitiateCheckout event
                  if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackInitiateCheckout !== false) {
                    try {
                      trackInitiateCheckout({
                        items: items.map(item => ({
                          id: item.productId,
                          quantity: item.quantity,
                          price: item.price
                        })),
                        total: calculateTotal()
                      });
                      console.log('📊 [Facebook Pixel] InitiateCheckout tracked from Cart');
                    } catch (error) {
                      console.error('❌ [Facebook Pixel] Error tracking InitiateCheckout:', error);
                    }
                  }

                  console.log('✅ [CART] Navigating to checkout:', `/shop/checkout?companyId=${companyId}`);
                  navigate(`/shop/checkout?companyId=${companyId}`);
                }}
                disabled={items.length === 0 || !companyId}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${items.length === 0 || !companyId
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                إتمام الطلب
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;

