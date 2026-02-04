import React, { useState, useEffect } from 'react';
import { XMarkIcon, FireIcon, ClockIcon } from '@heroicons/react/24/outline';

interface FOMOPopupProps {
  enabled: boolean;
  type: 'soldCount' | 'visitors' | 'stock' | 'countdown';
  trigger: 'time' | 'scroll' | 'exit';
  delay: number; // بالثواني
  showOncePerSession: boolean;
  message?: string;
  product: {
    id: string;
    name: string;
    stock: number;
    saleEndDate?: string;
  };
  soldCount?: number;
  visitorsCount?: number;
}

const FOMOPopup: React.FC<FOMOPopupProps> = ({
  enabled,
  type,
  trigger,
  delay,
  showOncePerSession,
  message,
  product,
  soldCount = 0,
  visitorsCount = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // التحقق من Session Storage
    if (showOncePerSession) {
      const sessionKey = `fomo_popup_${product.id}`;
      const hasShownInSession = sessionStorage.getItem(sessionKey);
      if (hasShownInSession === 'true') {
        setHasShown(true);
        return;
      }
    }

    let timeoutId: NodeJS.Timeout;
    let scrollHandler: () => void;
    let exitHandler: (e: MouseEvent) => void;

    const showPopup = () => {
      if (hasShown) return;
      setIsVisible(true);
      setHasShown(true);
      
      if (showOncePerSession) {
        const sessionKey = `fomo_popup_${product.id}`;
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    if (trigger === 'time') {
      timeoutId = setTimeout(showPopup, delay * 1000);
    } else if (trigger === 'scroll') {
      let scrollPosition = 0;
      scrollHandler = () => {
        scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollPercentage = (scrollPosition / (documentHeight - windowHeight)) * 100;
        
        if (scrollPercentage >= delay) {
          showPopup();
          window.removeEventListener('scroll', scrollHandler);
        }
      };
      window.addEventListener('scroll', scrollHandler);
    } else if (trigger === 'exit') {
      exitHandler = (e: MouseEvent) => {
        // عندما يتحرك الماوس خارج النافذة
        if (e.clientY <= 0) {
          showPopup();
          document.removeEventListener('mouseleave', exitHandler);
        }
      };
      document.addEventListener('mouseleave', exitHandler);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
      if (exitHandler) document.removeEventListener('mouseleave', exitHandler);
    };
  }, [enabled, trigger, delay, showOncePerSession, product.id, hasShown]);

  if (!enabled || !isVisible) return null;

  const getFOMOMessage = () => {
    if (message) return message;

    switch (type) {
      case 'soldCount':
        return `🔥 تم بيع ${soldCount} قطعة في آخر ساعة!`;
      case 'visitors':
        return `👥 ${visitorsCount} شخص يشاهدون هذا المنتج الآن!`;
      case 'stock':
        if (product.stock <= 10) {
          return `⚡ آخر ${product.stock} قطع متبقية!`;
        }
        return `📦 ${product.stock} قطعة متبقية فقط!`;
      case 'countdown':
        if (product.saleEndDate) {
          const endDate = new Date(product.saleEndDate);
          const now = new Date();
          const diff = endDate.getTime() - now.getTime();
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `⏰ العرض ينتهي خلال ${hours} ساعة و ${minutes} دقيقة!`;
          }
        }
        return `⏰ عرض محدود - ينتهي قريباً!`;
      default:
        return `🔥 عرض خاص - لا تفوت الفرصة!`;
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleAddToCart = () => {
    // Scroll to add to cart button
    const addToCartButton = document.getElementById('add-to-cart-button') || 
                            document.querySelector('[data-add-to-cart]');
    if (addToCartButton) {
      addToCartButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Trigger click after scroll
      setTimeout(() => {
        (addToCartButton as HTMLElement).click();
      }, 500);
    }
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-full p-4">
              <FireIcon className="h-12 w-12 text-white" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            ⚡ لا تفوت الفرصة!
          </h3>

          <p className="text-lg text-gray-700 mb-4">
            {getFOMOMessage()}
          </p>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <ClockIcon className="h-5 w-5" />
              <span className="font-semibold">عرض محدود - لا تفوت!</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-bold hover:from-red-700 hover:to-orange-700 transition-all shadow-lg"
            >
              🛒 أضف للسلة الآن
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FOMOPopup;

