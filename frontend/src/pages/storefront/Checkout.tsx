import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { checkoutFormSettingsService } from '../../services/checkoutFormSettingsService';
import logger from '../../utils/logger';
import { getApiUrl } from '../../config/environment';
import { TicketIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { trackInitiateCheckout, trackPurchase } from '../../utils/facebookPixel';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import analyticsService from '../../services/analyticsService';
import { tokenManager } from '../../utils/tokenManager';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface DeliveryOption {
  id: string;
  name: string;
  description: string | null;
  deliveryTime: string;
  price: number;
  isActive: boolean;
}

const DEFAULT_FORM_SETTINGS = {
  showGuestName: true,
  requireGuestName: true,
  showGuestPhone: true,
  requireGuestPhone: true,
  showGuestEmail: true,
  requireGuestEmail: false,
  showCity: true,
  requireCity: true,
  showShippingAddress: true,
  requireShippingAddress: true,
  showPaymentMethod: true,
  showNotes: true
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string>('');
  const [formSettings, setFormSettings] = useState<any>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);
  const companyId = getCompanyId(); // Get companyId from URL or localStorage

  const effectiveFormSettings = formSettings || DEFAULT_FORM_SETTINGS;

  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    shippingAddress: '',
    governorate: '',
    city: '',
    paymentMethod: 'CASH',
    notes: ''
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Shipping Methods state (New Architecture)
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');

  // Wallet (Customer)
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState<number>(0);

  useEffect(() => {
    // Verify companyId exists
    if (!companyId) {
      toast.error('⚠️ يجب زيارة المتجر من رابط صحيح');
      navigate('/');
      return;
    }
    fetchCart();
    fetchFormSettings();
    fetchDeliveryOptions();
    fetchStorefrontSettings();
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        setWalletBalance(0);
        return;
      }

      setWalletLoading(true);
      const data = await storefrontApi.getWalletBalance();
      if (data?.success && data?.data) {
        setWalletBalance(Number(data.data.balance) || 0);
      }
    } catch (error: any) {
      // If not logged in or token invalid, ignore
      setWalletBalance(0);
    } finally {
      setWalletLoading(false);
    }
  };

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

  // Track InitiateCheckout when page loads
  useEffect(() => {
    // Track store visit
    analyticsService.trackStoreVisit(window.location.pathname);
    
    if (items.length > 0) {
      const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Track Facebook Pixel
      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackInitiateCheckout !== false) {
        try {
          trackInitiateCheckout({
            items: items.map(item => ({
              id: item.productId,
              quantity: item.quantity,
              price: item.price
            })),
            total: cartTotal
          });
          console.log('📊 [Facebook Pixel] InitiateCheckout tracked on Checkout page load');
        } catch (error) {
          console.error('❌ [Facebook Pixel] Error tracking InitiateCheckout:', error);
        }
      }
      
      // Track analytics checkout
      const productIds = items.map(item => item.productId);
      analyticsService.trackCheckout(cartTotal, productIds);
    }
  }, [items, storefrontSettings]);

  const fetchFormSettings = async () => {
    try {
      if (!companyId) return;
      const data = await checkoutFormSettingsService.getPublicSettings(companyId);
      if (data?.success && data?.data) {
        setFormSettings(data.data);
      } else {
        setFormSettings(DEFAULT_FORM_SETTINGS);
      }
    } catch (error) {
      console.error('Error fetching form settings:', error);
      // استخدام القيم الافتراضية في حالة الخطأ
      setFormSettings(DEFAULT_FORM_SETTINGS);
    }
  };

  useEffect(() => {
    if (selectedDeliveryOption) {
      const option = deliveryOptions.find(o => o.id === selectedDeliveryOption);
      if (option) {
        setShippingCost(option.price);
      }
    } else if (formData.governorate) {
      calculateShipping();
    }
  }, [formData.governorate, selectedDeliveryOption, deliveryOptions]);

  const fetchCart = async () => {
    try {
      setLoading(true);

      // Backend uses cookies for cart, no need for sessionId check
      // Just fetch the cart directly
      console.log('🛒 [CHECKOUT] Fetching cart...');
      const data = await storefrontApi.getCart();

      if (data.success) {
        if (!data.data.items || data.data.items.length === 0) {
          console.warn('⚠️ [CHECKOUT] Cart is empty, redirecting to cart page');
          toast.error('السلة فارغة. أضف منتجات قبل إتمام الطلب');
          navigate(`/shop/cart?companyId=${companyId}`);
          return;
        }
        console.log('🛒 [CHECKOUT] Cart items:', data.data.items);

        // Fix image URLs - parse JSON strings if needed
        const fixedItems = data.data.items.map((item: any) => {
          let fixedImage = item.image;

          // If image is a JSON string, parse it
          if (typeof item.image === 'string' && item.image.startsWith('[')) {
            try {
              const parsed = JSON.parse(item.image);
              fixedImage = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
              console.log('🖼️ [CHECKOUT] Fixed image:', item.image, '->', fixedImage);
            } catch (e) {
              console.error('❌ [CHECKOUT] Failed to parse image:', item.image);
            }
          }

          return {
            ...item,
            image: fixedImage
          };
        });

        fixedItems.forEach((item: any, index: number) => {
          console.log(`📦 [CHECKOUT] Item ${index}:`, {
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.quantity
          });
        });

        setItems(fixedItems);
      }
    } catch (error: any) {
      logger.error('Error fetching cart:', error);
      toast.error('حدث خطأ في جلب السلة');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryOptions = async () => {
    try {
      if (!companyId) {
        console.log('⚠️ [DELIVERY-OPTIONS] No companyId');
        return;
      }

      console.log('🔍 [DELIVERY-OPTIONS] Fetching for company:', companyId);
      const data = await storefrontApi.getDeliveryOptions(companyId);
      console.log('📦 [DELIVERY-OPTIONS] Response:', data);

      if (data.success && data.data) {
        const activeOptions = data.data.filter((opt: DeliveryOption) => opt.isActive);
        console.log('✅ [DELIVERY-OPTIONS] Active options:', activeOptions.length);
        setDeliveryOptions(activeOptions);

        // Auto-select first option logic REMOVED to prioritize dynamic shipping
        // if (activeOptions.length > 0) {
        //   setSelectedDeliveryOption(activeOptions[0].id);
        //   setShippingCost(activeOptions[0].price);
        //   console.log('✅ [DELIVERY-OPTIONS] Selected:', activeOptions[0].name);
        // } else {
        //   console.log('⚠️ [DELIVERY-OPTIONS] No active options found');
        // }
      }
    } catch (error) {
      console.error('❌ [DELIVERY-OPTIONS] Error:', error);
      logger.error('Error fetching delivery options:', error);
      // Fallback to old shipping calculation
    }
  };

  const calculateShipping = async () => {
    if (!formData.governorate) {
      setShippingCost(0);
      setShippingMethods([]);
      setSelectedShippingMethod('');
      return;
    }

    try {
      const data = await storefrontApi.calculateShipping(formData.governorate);

      if (data.success && data.data?.methods && data.data.methods.length > 0) {
        const methods = data.data.methods;
        setShippingMethods(methods);

        // Auto-select first method
        setSelectedShippingMethod(methods[0].id);
        setShippingCost(methods[0].cost);

        console.log(`✅ [CHECKOUT] Found ${methods.length} shipping methods for ${formData.governorate}`);
      } else {
        // No methods found for this city
        setShippingMethods([]);
        setSelectedShippingMethod('');
        setShippingCost(0);
        console.log(`⚠️ [CHECKOUT] No shipping methods found for ${formData.governorate}`);
      }
    } catch (error: any) {
      logger.error('Error calculating shipping:', error);
      setShippingMethods([]);
      setSelectedShippingMethod('');
      setShippingCost(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const total = subtotal + shippingCost - discount;
    return Math.max(0, total); // لا يمكن أن يكون المجموع سالباً
  };

  const calculateWalletApplied = () => {
    if (!useWalletBalance) return 0;
    const total = calculateTotal();
    const desired = walletAmountToUse || walletBalance;
    return Math.max(0, Math.min(walletBalance, desired, total));
  };

  const calculateTotalAfterWallet = () => {
    const total = calculateTotal();
    const applied = calculateWalletApplied();
    return Math.max(0, total - applied);
  };

  // التحقق من الكوبون
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('يرجى إدخال كود الكوبون');
      return;
    }

    try {
      setCouponLoading(true);
      const subtotal = calculateSubtotal();

      const response = await fetch(`${getApiUrl()}/public/coupons/${companyId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: couponCode,
          orderAmount: subtotal
        })
      });

      const data = await response.json();

      if (data.success) {
        setAppliedCoupon(data.data.coupon);
        setDiscount(data.data.discountAmount);
        toast.success(`تم تطبيق الكوبون: ${data.data.coupon.name}`);
      } else {
        toast.error(data.error || 'الكوبون غير صحيح');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error('فشل في التحقق من الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  // إلغاء الكوبون
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
    toast.success('تم إلغاء الكوبون');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on settings
    if (effectiveFormSettings?.requireGuestName && !formData.guestName) {
      toast.error('الاسم الكامل مطلوب');
      return;
    }
    if (effectiveFormSettings?.requireGuestPhone && !formData.guestPhone) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    if (effectiveFormSettings?.requireGuestEmail && !formData.guestEmail) {
      toast.error('البريد الإلكتروني مطلوب');
      return;
    }
    if (effectiveFormSettings?.requireCity && !formData.governorate) {
      toast.error('المحافظة مطلوبة');
      return;
    }
    if (effectiveFormSettings?.requireShippingAddress && !formData.shippingAddress) {
      toast.error('العنوان التفصيلي مطلوب');
      return;
    }

    try {
      setSubmitting(true);

      console.log('📝 [CHECKOUT] Creating order with data:', {
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        guestEmail: formData.guestEmail,
        governorate: formData.governorate,
        city: formData.city,
        shippingAddress: formData.shippingAddress,
        paymentMethod: formData.paymentMethod
      });

      // Generate event ID for deduplication (will be used by both Pixel and CAPI)
      let purchaseEventId: string | undefined;
      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackPurchase !== false) {
        purchaseEventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const finalTotal = cartTotal + shippingCost - discount;

      const walletApplied = useWalletBalance
        ? Math.max(0, Math.min(walletBalance, walletAmountToUse || walletBalance, finalTotal))
        : 0;

      const data = await storefrontApi.createOrder({
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        guestEmail: formData.guestEmail || '',
        shippingAddress: {
          governorate: formData.governorate,
          city: formData.city,
          street: formData.shippingAddress,
          building: '',
          floor: '',
          apartment: ''
        },
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || '',
        pixelEventId: purchaseEventId, // Pass event ID for CAPI deduplication
        useWallet: useWalletBalance,
        walletAmount: walletApplied
      });

      if (data.success) {
        // Track Purchase event
        if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackPurchase !== false && purchaseEventId) {
          try {
            trackPurchase({
              orderNumber: data.data.orderNumber,
              items: items.map(item => ({
                id: item.productId,
                quantity: item.quantity,
                price: item.price
              })),
              total: finalTotal
            }, purchaseEventId);
            console.log('✅ [Facebook Pixel] Purchase tracked for order:', data.data.orderNumber, 'Event ID:', purchaseEventId);
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking Purchase:', error);
          }
        }

        // Track analytics purchase
        try {
          const productIds = items.map(item => item.productId);
          await analyticsService.trackPurchase(data.data.id, finalTotal, productIds);
          console.log('✅ [Analytics] Purchase tracked for order:', data.data.orderNumber);
        } catch (error) {
          console.error('❌ [Analytics] Error tracking Purchase:', error);
        }

        // Clear cart from database
        try {
          await storefrontApi.clearCart();
        } catch (error) {
          console.error('Error clearing cart:', error);
          // لا نوقف العملية إذا فشل حذف السلة
        }

        // Clear cart session from localStorage
        localStorage.removeItem('cart_session_id');

        // Notify cart update
        window.dispatchEvent(new Event('cartUpdated'));

        toast.success('تم إنشاء الطلب بنجاح!');
        const companyId = getCompanyId();
        navigate(`/shop/order-confirmation/${data.data.orderNumber}?trackingToken=${data.data.trackingToken}&phone=${encodeURIComponent(formData.guestPhone)}&companyId=${companyId}`);
      } else {
        toast.error(data.message || 'حدث خطأ في إنشاء الطلب');
      }
    } catch (error: any) {
      logger.error('Error creating order:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">إتمام الطلب</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات العميل</h2>

              <div className="space-y-4">
                {effectiveFormSettings?.showGuestName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الكامل {effectiveFormSettings?.requireGuestName && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      value={formData.guestName}
                      onChange={handleInputChange}
                      required={effectiveFormSettings?.requireGuestName}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="أحمد محمد"
                    />
                  </div>
                )}

                {effectiveFormSettings?.showGuestPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف {effectiveFormSettings?.requireGuestPhone && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      name="guestPhone"
                      value={formData.guestPhone}
                      onChange={handleInputChange}
                      required={effectiveFormSettings?.requireGuestPhone}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="01012345678"
                    />
                  </div>
                )}

                {effectiveFormSettings?.showGuestEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني {effectiveFormSettings?.requireGuestEmail && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email"
                      name="guestEmail"
                      value={formData.guestEmail}
                      onChange={handleInputChange}
                      required={effectiveFormSettings?.requireGuestEmail}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="ahmed@example.com"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">عنوان الشحن</h2>

              <div className="space-y-4">
                {effectiveFormSettings?.showCity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المحافظة {effectiveFormSettings?.requireCity && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      name="governorate"
                      value={formData.governorate}
                      onChange={handleInputChange}
                      required={effectiveFormSettings?.requireCity}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      <option value="">اختر المحافظة...</option>
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov.id} value={gov.nameAr}>
                          {gov.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {effectiveFormSettings?.showCity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المدينة
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="مثال: المعادي"
                    />
                  </div>
                )}

                {effectiveFormSettings?.showShippingAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العنوان التفصيلي {effectiveFormSettings?.requireShippingAddress && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleInputChange}
                      required={effectiveFormSettings?.requireShippingAddress}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="123 شارع النيل، المعادي"
                    />
                  </div>
                )}

                {/* Shipping Methods (New Architecture) */}
                {shippingMethods.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚚 طريقة الشحن <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {shippingMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedShippingMethod === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={method.id}
                              checked={selectedShippingMethod === method.id}
                              onChange={(e) => {
                                setSelectedShippingMethod(e.target.value);
                                setShippingCost(method.cost);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{method.title}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                ⏱️ {method.deliveryTime}
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {method.cost > 0 ? `${method.cost} جنيه` : 'مجاناً'}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy Delivery Options (Kept for backward compatibility) */}
                {deliveryOptions.length > 0 && shippingMethods.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚚 طريقة التوصيل <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {deliveryOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedDeliveryOption === option.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="deliveryOption"
                              value={option.id}
                              checked={selectedDeliveryOption === option.id}
                              onChange={(e) => setSelectedDeliveryOption(e.target.value)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{option.name}</div>
                              {option.description && (
                                <div className="text-sm text-gray-500">{option.description}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                ⏱️ {option.deliveryTime}
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {option.price > 0 ? `${option.price} جنيه` : 'مجاناً'}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            {effectiveFormSettings?.showPaymentMethod && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">طريقة الدفع</h2>

                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={formData.paymentMethod === 'CASH'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="mr-3">
                      <div className="font-medium text-gray-900">الدفع عند الاستلام</div>
                      <div className="text-sm text-gray-500">ادفع نقداً عند استلام الطلب</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Notes */}
            {effectiveFormSettings?.showNotes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">ملاحظات إضافية</h2>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="أي ملاحظات خاصة بالطلب (اختياري)"
                />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">ملخص الطلب</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.price * item.quantity} جنيه
                    </p>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-blue-600" />
                  كود الخصم
                </h3>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="أدخل كود الكوبون"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {couponLoading ? 'جاري التحقق...' : 'تطبيق'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <TicketIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">{appliedCoupon.code}</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">{appliedCoupon.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{calculateSubtotal()} جنيه</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>الشحن:</span>
                  <span className="font-semibold">
                    {shippingCost > 0 ? `${shippingCost} جنيه` : 'يُحسب عند اختيار المحافظة'}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>الخصم:</span>
                    <span className="font-semibold">- {discount} جنيه</span>
                  </div>
                )}

                {/* Wallet */}
                {walletLoading ? (
                  <div className="flex justify-between text-gray-700">
                    <span>المحفظة:</span>
                    <span className="font-semibold">جاري التحميل...</span>
                  </div>
                ) : walletBalance > 0 ? (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useWalletBalance}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseWalletBalance(checked);
                            if (checked && !walletAmountToUse) {
                              setWalletAmountToUse(walletBalance);
                            }
                          }}
                        />
                        <span>استخدم المحفظة</span>
                      </label>
                      <span className="text-sm font-semibold text-gray-900">الرصيد: {walletBalance} جنيه</span>
                    </div>

                    {useWalletBalance && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={walletBalance}
                          value={walletAmountToUse}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setWalletAmountToUse(Number.isFinite(v) ? v : 0);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                          placeholder="المبلغ المراد استخدامه"
                        />
                        <button
                          type="button"
                          onClick={() => setWalletAmountToUse(walletBalance)}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200"
                        >
                          الكل
                        </button>
                      </div>
                    )}

                    {useWalletBalance && calculateWalletApplied() > 0 && (
                      <div className="flex justify-between text-blue-700 mt-2">
                        <span>خصم المحفظة:</span>
                        <span className="font-semibold">- {calculateWalletApplied()} جنيه</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-gray-900">
                  <span>الإجمالي:</span>
                  <span>{calculateTotalAfterWallet()} جنيه</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;

