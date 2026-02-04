import React, { useState, useEffect } from 'react';
import { ShoppingCartIcon, MinusIcon, PlusIcon, BoltIcon, WalletIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { trackInitiateCheckout } from '../../utils/facebookPixel';

interface StickyAddToCartProps {
  enabled: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  scrollThreshold?: number; // المسافة بالبكسل قبل الظهور
  showBuyNow?: boolean; // إظهار زر "شراء الآن"
  showAddToCartButton?: boolean; // إظهار زر "أضف للسلة"
  showQuantity?: boolean; // إظهار اختيار الكمية
  showProductImage?: boolean; // إظهار صورة المنتج
  showProductName?: boolean; // إظهار اسم المنتج
  trackAnalytics?: boolean; // تتبع التحليلات
  autoScrollToCheckout?: boolean; // التمرير التلقائي لصفحة الشراء
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    images: string | string[];
    enableCheckoutForm?: boolean;
  };
  selectedVariant?: string | null;
  onQuantityChange?: (quantity: number) => void;
  storefrontSettings?: any; // للإعدادات العامة
}

const StickyAddToCart: React.FC<StickyAddToCartProps> = ({
  enabled,
  showOnMobile,
  showOnDesktop,
  scrollThreshold = 300,
  showBuyNow = true,
  showAddToCartButton = true,
  showQuantity = true,
  showProductImage = true,
  showProductName = true,
  trackAnalytics = true,
  autoScrollToCheckout = false,
  product,
  selectedVariant,
  onQuantityChange,
  storefrontSettings
}) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show sticky bar when scrolled past threshold and not at bottom
      setIsVisible(scrollPosition > scrollThreshold && scrollPosition < documentHeight - windowHeight - 100);
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, scrollThreshold]);

  useEffect(() => {
    if (onQuantityChange) {
      onQuantityChange(quantity);
    }
  }, [quantity, onQuantityChange]);

  // تتبع التحليلات
  const trackEvent = (eventType: 'add_to_cart' | 'buy_now', data: any) => {
    if (!trackAnalytics) return;

    try {
      // تتبع Facebook Pixel
      if (storefrontSettings?.facebookPixelEnabled) {
        if (eventType === 'buy_now' && storefrontSettings?.pixelTrackInitiateCheckout !== false) {
          trackInitiateCheckout({
            items: [{
              id: product.id,
              quantity: quantity,
              price: product.price
            }],
            total: product.price * quantity
          });
        }
      }

      // تتبع مخصص (يمكن إضافة Google Analytics أو أي نظام آخر)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventType, {
          'event_category': 'Sticky Bar',
          'event_label': product.name,
          'value': product.price * quantity,
          'items': [{
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity
          }]
        });
      }

      // حفظ في localStorage للتحليل لاحقاً
      const analyticsData = {
        event: eventType,
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity,
        timestamp: new Date().toISOString(),
        variantId: selectedVariant || null
      };

      const existingData = JSON.parse(localStorage.getItem('stickyBarAnalytics') || '[]');
      existingData.push(analyticsData);
      // حفظ آخر 100 حدث فقط
      const recentData = existingData.slice(-100);
      localStorage.setItem('stickyBarAnalytics', JSON.stringify(recentData));

      console.log('📊 [StickyBar Analytics]', analyticsData);
    } catch (error) {
      console.error('❌ [StickyBar Analytics] Error:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAdding(true);
      await storefrontApi.addToCart({
        productId: product.id,
        quantity,
        ...(selectedVariant && { variantId: selectedVariant })
      });
      
      // تتبع التحليلات
      trackEvent('add_to_cart', { quantity });
      
      toast.success('تمت إضافة المنتج للسلة');
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ في إضافة المنتج');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product.enableCheckoutForm) {
      // إذا لم يكن المنتج يدعم الشراء المباشر، أضف للسلة ثم اذهب للشيك أوت
      try {
        setBuying(true);
        await storefrontApi.addToCart({
          productId: product.id,
          quantity,
          ...(selectedVariant && { variantId: selectedVariant })
        });
        
        // تتبع التحليلات
        trackEvent('buy_now', { quantity });
        
        const companyId = getCompanyId();
        if (companyId) {
          navigate(`/shop/checkout?companyId=${companyId}`);
        } else {
          toast.error('حدث خطأ في الانتقال للشيك أوت');
        }
      } catch (error) {
        console.error('Error in buy now:', error);
        toast.error('حدث خطأ في إتمام الشراء');
      } finally {
        setBuying(false);
      }
    } else {
      // إذا كان المنتج يدعم الشراء المباشر، انتقل مباشرة لصفحة المنتج مع تمرير تلقائي للفورم
      trackEvent('buy_now', { quantity });
      
      // التمرير التلقائي لصفحة الشراء
      if (autoScrollToCheckout) {
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
          checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // إعطاء تركيز للعنصر الأول في الفورم
          setTimeout(() => {
            const firstInput = checkoutForm.querySelector('input, textarea, select') as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 500);
        }
      } else {
        // الانتقال مباشرة للفورم
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
          checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            const firstInput = checkoutForm.querySelector('input, textarea, select') as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 500);
        }
      }
    }
  };

  if (!enabled || !isVisible) return null;

  // Check visibility based on screen size
  const shouldShow = (showOnMobile && window.innerWidth < 768) || 
                     (showOnDesktop && window.innerWidth >= 768);

  if (!shouldShow) return null;

  // Parse images
  let productImage = '';
  try {
    if (typeof product.images === 'string') {
      const parsed = JSON.parse(product.images);
      productImage = Array.isArray(parsed) ? parsed[0] : parsed;
    } else if (Array.isArray(product.images)) {
      productImage = product.images[0];
    }
  } catch (e) {
    // Ignore
  }

  const totalPrice = product.price * quantity;
  const isOutOfStock = product.stock === 0;

  // حساب عدد الأزرار المرئية
  const visibleButtonsCount = 
    (showAddToCartButton ? 1 : 0) + 
    (showBuyNow && !isOutOfStock ? 1 : 0);
  
  // تحديد إذا كان هناك زر واحد فقط
  const hasSingleButton = visibleButtonsCount === 1;
  
  // تحديد إذا كان هناك محتوى على اليسار (صورة أو اسم)
  const hasLeftContent = showProductImage || showProductName;
  
  // تحديد التخطيط: إذا كان زر واحد فقط وليس هناك محتوى على اليسار، ضع الزر في المنتصف
  const shouldCenterButton = hasSingleButton && !hasLeftContent && !showQuantity;

  // تحديد أي زر هو الوحيد المرئي
  const isOnlyBuyNow = hasSingleButton && showBuyNow && !isOutOfStock && !showAddToCartButton;
  const isOnlyAddToCart = hasSingleButton && showAddToCartButton && (!showBuyNow || isOutOfStock);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-50/95 backdrop-blur-sm transform transition-transform duration-300 ease-in-out">
      <div className="w-full px-4 py-4">
        {shouldCenterButton ? (
          // تصميم خاص للزر الواحد في المنتصف (مشابه للصورة)
          <div className="flex justify-center">
            <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-md">
              {isOnlyBuyNow && (
                <button
                  onClick={handleBuyNow}
                  disabled={buying}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold text-base transition-all ${
                    buying
                      ? 'bg-gray-800 text-white opacity-75'
                      : 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-lg'
                  }`}
                >
                  <WalletIcon className="h-6 w-6" />
                  <span>{buying ? 'جاري التوجيه...' : 'اضغط هنا للشراء'}</span>
                </button>
              )}
              {isOnlyAddToCart && (
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || adding}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold text-base transition-all ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : adding
                      ? 'bg-gray-800 text-white opacity-75'
                      : 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-lg'
                  }`}
                >
                  <ShoppingCartIcon className="h-6 w-6" />
                  <span>{isOutOfStock ? 'غير متوفر' : adding ? 'جاري الإضافة...' : 'اضغط هنا للشراء'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          // التصميم العادي (عند وجود محتوى إضافي)
          <div className="flex items-center gap-3 md:gap-4 bg-white rounded-xl shadow-lg p-3 md:p-4">
            {/* Product Image & Name */}
            {(showProductImage || showProductName) && (
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                {showProductImage && productImage && (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-10 h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                  />
                )}
                {showProductName && (
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate text-xs md:text-sm">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs md:text-sm font-bold text-indigo-600">{product.price} جنيه</p>
                      {quantity > 1 && (
                        <span className="text-xs text-gray-500">× {quantity} = {totalPrice} ج.م</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            {showQuantity && (
              <div className="flex items-center gap-1 md:gap-2 border border-gray-300 rounded-lg flex-shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1.5 md:p-2 hover:bg-gray-100 transition-colors"
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="h-3 w-3 md:h-4 md:w-4" />
                </button>
                <span className="px-2 md:px-3 py-1 font-semibold text-xs md:text-sm min-w-[2rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={isOutOfStock || quantity >= product.stock}
                  className="p-1.5 md:p-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Add to Cart Button */}
              {showAddToCartButton && (
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || adding}
                  className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-xs md:text-sm ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                  } ${adding ? 'opacity-75' : ''}`}
                >
                  <ShoppingCartIcon className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">
                    {isOutOfStock ? 'غير متوفر' : adding ? 'جاري الإضافة...' : 'أضف للسلة'}
                  </span>
                  <span className="sm:hidden">
                    {isOutOfStock ? 'غير متوفر' : adding ? '...' : 'السلة'}
                  </span>
                </button>
              )}

              {/* Buy Now Button */}
              {showBuyNow && !isOutOfStock && (
                <button
                  onClick={handleBuyNow}
                  disabled={buying}
                  className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 rounded-lg font-bold transition-all text-xs md:text-sm ${
                    buying
                      ? 'bg-green-400 text-white opacity-75'
                      : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-md hover:shadow-lg'
                  }`}
                >
                  <BoltIcon className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">
                    {buying ? 'جاري التوجيه...' : 'شراء الآن'}
                  </span>
                  <span className="sm:hidden">
                    {buying ? '...' : 'شراء'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyAddToCart;

