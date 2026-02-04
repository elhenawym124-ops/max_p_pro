import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { checkoutFormSettingsService } from '../../services/checkoutFormSettingsService';
import logger from '../../utils/logger';
import StorefrontNav from '../../components/StorefrontNav';

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

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string>('');
  const [formSettings, setFormSettings] = useState<any>(null);
  const companyId = getCompanyId(); // Get companyId from URL or localStorage

  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    shippingAddress: '',
    city: '',
    paymentMethod: 'CASH',
    notes: ''
  });

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
  }, []);

  const fetchFormSettings = async () => {
    try {
      if (!companyId) return;
      const data = await checkoutFormSettingsService.getPublicSettings(companyId);
      if (data.success) {
        setFormSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching form settings:', error);
      // استخدام القيم الافتراضية في حالة الخطأ
      setFormSettings({
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
      });
    }
  };

  useEffect(() => {
    if (selectedDeliveryOption) {
      const option = deliveryOptions.find(o => o.id === selectedDeliveryOption);
      if (option) {
        setShippingCost(option.price);
      }
    } else if (formData.city) {
      calculateShipping();
    }
  }, [formData.city, selectedDeliveryOption, deliveryOptions]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('cart_session_id');
      
      if (!sessionId) {
        navigate(`/shop/cart?companyId=${companyId}`);
        return;
      }

      const data = await storefrontApi.getCart();
      
      if (data.success) {
        if (data.data.items.length === 0) {
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
        
        // Auto-select first option
        if (activeOptions.length > 0) {
          setSelectedDeliveryOption(activeOptions[0].id);
          setShippingCost(activeOptions[0].price);
          console.log('✅ [DELIVERY-OPTIONS] Selected:', activeOptions[0].name);
        } else {
          console.log('⚠️ [DELIVERY-OPTIONS] No active options found');
        }
      }
    } catch (error) {
      console.error('❌ [DELIVERY-OPTIONS] Error:', error);
      logger.error('Error fetching delivery options:', error);
      // Fallback to old shipping calculation
    }
  };

  const calculateShipping = async () => {
    if (!formData.city) {
      setShippingCost(0);
      return;
    }

    try {
      // استدعاء API لحساب تكلفة الشحن
      const data = await storefrontApi.calculateShipping(formData.city);
      
      if (data.success && data.data?.cost !== undefined) {
        setShippingCost(data.data.cost);
      } else {
        // Fallback: استخدام تكلفة افتراضية في حالة فشل API
        setShippingCost(50); // 50 جنيه شحن افتراضي
      }
    } catch (error: any) {
      // في حالة الخطأ، استخدام تكلفة افتراضية
      logger.error('Error calculating shipping:', error);
      setShippingCost(50); // 50 جنيه شحن افتراضي
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
    return calculateSubtotal() + shippingCost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on settings
    if (formSettings?.requireGuestName && !formData.guestName) {
      toast.error('الاسم الكامل مطلوب');
      return;
    }
    if (formSettings?.requireGuestPhone && !formData.guestPhone) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    if (formSettings?.requireGuestEmail && !formData.guestEmail) {
      toast.error('البريد الإلكتروني مطلوب');
      return;
    }
    if (formSettings?.requireCity && !formData.city) {
      toast.error('المدينة مطلوبة');
      return;
    }
    if (formSettings?.requireShippingAddress && !formData.shippingAddress) {
      toast.error('العنوان التفصيلي مطلوب');
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('📝 [CHECKOUT] Creating order with data:', {
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        guestEmail: formData.guestEmail,
        city: formData.city,
        shippingAddress: formData.shippingAddress,
        paymentMethod: formData.paymentMethod
      });
      
      const data = await storefrontApi.createOrder({
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        guestEmail: formData.guestEmail || '',
        shippingAddress: {
          governorate: formData.city,
          city: formData.city,
          street: formData.shippingAddress,
          building: '',
          floor: '',
          apartment: ''
        },
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || ''
      });

      if (data.success) {
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
        navigate(`/shop/order-confirmation/${data.data.orderNumber}?trackingToken=${data.data.trackingToken}&companyId=${companyId}`);
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
      <>
        <StorefrontNav />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StorefrontNav />
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
                {formSettings?.showGuestName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الكامل {formSettings?.requireGuestName && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      value={formData.guestName}
                      onChange={handleInputChange}
                      required={formSettings?.requireGuestName}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="أحمد محمد"
                    />
                  </div>
                )}

                {formSettings?.showGuestPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف {formSettings?.requireGuestPhone && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      name="guestPhone"
                      value={formData.guestPhone}
                      onChange={handleInputChange}
                      required={formSettings?.requireGuestPhone}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="01012345678"
                    />
                  </div>
                )}

                {formSettings?.showGuestEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني {formSettings?.requireGuestEmail && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email"
                      name="guestEmail"
                      value={formData.guestEmail}
                      onChange={handleInputChange}
                      required={formSettings?.requireGuestEmail}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {formSettings?.showCity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المدينة {formSettings?.requireCity && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required={formSettings?.requireCity}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="القاهرة"
                    />
                  </div>
                )}

                {formSettings?.showShippingAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العنوان التفصيلي {formSettings?.requireShippingAddress && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleInputChange}
                      required={formSettings?.requireShippingAddress}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123 شارع النيل، المعادي"
                    />
                  </div>
                )}

                {/* Delivery Options */}
                {deliveryOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚚 طريقة التوصيل <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {deliveryOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedDeliveryOption === option.id
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
            {formSettings?.showPaymentMethod && (
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
            {formSettings?.showNotes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">ملاحظات إضافية</h2>
                
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{calculateSubtotal()} جنيه</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>الشحن:</span>
                  <span className="font-semibold">
                    {shippingCost > 0 ? `${shippingCost} جنيه` : 'يُحسب عند إدخال المدينة'}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-gray-900">
                  <span>الإجمالي:</span>
                  <span>{calculateTotal()} جنيه</span>
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
    </>
  );
};

export default Checkout;

