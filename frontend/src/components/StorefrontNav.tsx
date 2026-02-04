import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, TruckIcon, WalletIcon } from '@heroicons/react/24/outline';
import { storefrontApi, getCompanyId } from '../utils/storefrontApi';
import { storefrontSettingsService } from '../services/storefrontSettingsService';
import LanguageSwitcher from './storefront/LanguageSwitcher';
import { useAuth } from '../hooks/useAuthSimple';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: string;
  };
}

interface FreeShippingSettings {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
}

const StorefrontNav: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings | null>(null);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState('ar');

  useEffect(() => {
    fetchCart();
    fetchFreeShippingSettings();
    fetchStorefrontSettings();

    // Listen for cart updates
    const handleCartUpdate = () => {
      fetchCart();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success) {
          setStorefrontSettings(data.data);
          setCurrentLanguage(data.data.defaultLanguage || 'ar');
        }
      }
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const fetchCart = async () => {
    try {
      const data = await storefrontApi.getCart();
      if (data.success && data.data) {
        // Parse items - might be JSON string from database
        let items = data.data.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        // Ensure items is an array
        if (!Array.isArray(items)) {
          items = [];
        }
        setCartItems(items);
        const total = items.reduce((sum: number, item: CartItem) =>
          sum + (item.price * item.quantity), 0
        );
        setCartTotal(total);
      }
    } catch (error: any) {
      // Handle 500 errors gracefully - server might be having issues
      // Set empty cart instead of showing error
      const status = error?.status || error?.response?.status;
      if (status === 500) {
        // Server error - silently use empty cart
        setCartItems([]);
        setCartTotal(0);
      } else {
        // Other errors - only log in development
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.error('Error fetching cart:', error);
        }
        // Still set empty cart to avoid UI issues
        setCartItems([]);
        setCartTotal(0);
      }
    }
  };


  const fetchFreeShippingSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (!companyId) return;

      // Use storefrontFetch for public routes
      const { storefrontFetch } = await import('../utils/storefrontApi');
      const data = await storefrontFetch(`/promotion-settings/${companyId}`);

      if (data.success) {
        setFreeShippingSettings(data.data);
      }
    } catch (error: any) {
      // Silently handle errors - free shipping settings are optional
      const status = error?.status || (error?.message?.includes('401') ? 401 : error?.message?.includes('404') ? 404 : 0);
      if (status !== 401 && status !== 404) {
        console.error('Error fetching free shipping settings:', error);
      }
    }
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate free shipping progress
  const renderFreeShippingProgress = () => {
    if (!freeShippingSettings || !freeShippingSettings.freeShippingEnabled) {
      return null;
    }

    const threshold = freeShippingSettings.freeShippingThreshold;
    const remaining = threshold - cartTotal;
    const progress = Math.min((cartTotal / threshold) * 100, 100);

    if (remaining > 0) {
      return (
        <div className="text-xs text-blue-600">
          باقي {remaining.toFixed(0)} جنيه
        </div>
      );
    } else {
      return (
        <div className="text-xs text-green-600 font-bold">
          شحن مجاني! 🎉
        </div>
      );
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/home"
            className="flex items-center"
            onClick={() => {
              const companyId = getCompanyId();
              if (companyId) {
                localStorage.setItem('storefront_companyId', companyId);
              }
            }}
          >
            <div className="text-2xl font-bold text-blue-600">
              🏪 المتجر
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link
              to="/home"
              onClick={() => {
                const companyId = getCompanyId();
                if (companyId) {
                  localStorage.setItem('storefront_companyId', companyId);
                }
              }}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              الرئيسية
            </Link>
            <Link
              to="/shop"
              onClick={() => {
                const companyId = getCompanyId();
                if (companyId) {
                  localStorage.setItem('storefront_companyId', companyId);
                }
              }}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              المنتجات
            </Link>
            <Link
              to="/shop/track-order"
              onClick={() => {
                const companyId = getCompanyId();
                if (companyId) {
                  localStorage.setItem('storefront_companyId', companyId);
                }
              }}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              تتبع الطلب
            </Link>
            <Link
              to={user?.role === 'CUSTOMER' ? '/account/wallet' : '/auth/customer-register'}
              onClick={() => {
                const companyId = getCompanyId();
                if (companyId) {
                  localStorage.setItem('storefront_companyId', companyId);
                }
              }}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
            >
              <WalletIcon className="h-5 w-5" />
              محفظتي
            </Link>
            {storefrontSettings?.wishlistEnabled && (
              <Link
                to="/shop/wishlist"
                onClick={() => {
                  const companyId = getCompanyId();
                  if (companyId) {
                    localStorage.setItem('storefront_companyId', companyId);
                  }
                }}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                المفضلة
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            {storefrontSettings?.multiLanguageEnabled && (
              <LanguageSwitcher
                enabled={storefrontSettings.multiLanguageEnabled}
                currentLanguage={currentLanguage}
                supportedLanguages={storefrontSettings.supportedLanguages || ['ar']}
                onLanguageChange={(lang) => {
                  setCurrentLanguage(lang);
                  // Save to localStorage
                  localStorage.setItem('preferredLanguage', lang);
                  // Reload page to apply language (or use i18n if available)
                  window.location.reload();
                }}
              />
            )}

            {/* Cart Icon */}
            <div className="relative">
              <button
                onClick={() => {
                  const companyId = getCompanyId();
                  if (companyId) {
                    localStorage.setItem('storefront_companyId', companyId);
                  }
                  navigate('/shop/cart');
                }}
                onMouseEnter={() => setShowCartPreview(true)}
                onMouseLeave={() => setShowCartPreview(false)}
                className="relative flex items-center gap-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="relative">
                  <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {cartTotal.toFixed(2)} جنيه
                  </div>
                  {renderFreeShippingProgress()}
                </div>
              </button>

              {/* Cart Preview on Hover */}
              {showCartPreview && itemCount > 0 && (
                <div
                  className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
                  onMouseEnter={() => setShowCartPreview(true)}
                  onMouseLeave={() => setShowCartPreview(false)}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-3">السلة ({itemCount} منتج)</h3>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cartItems.slice(0, 3).map((item) => (
                      item.product ? (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                            <div className="text-xs text-gray-600">
                              {item.quantity} × {item.price} جنيه
                            </div>
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {(item.quantity * item.price).toFixed(2)} جنيه
                          </div>
                        </div>
                      ) : null
                    ))}
                    {cartItems.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        و {cartItems.length - 3} منتجات أخرى...
                      </div>
                    )}
                  </div>

                  {/* Free Shipping Progress in Preview */}
                  {freeShippingSettings && freeShippingSettings.freeShippingEnabled && (() => {
                    const threshold = freeShippingSettings.freeShippingThreshold;
                    const remaining = threshold - cartTotal;
                    const progress = Math.min((cartTotal / threshold) * 100, 100);

                    return (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {remaining > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                              <TruckIcon className="h-4 w-4" />
                              <span>باقي {remaining.toFixed(0)} جنيه للشحن المجاني</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                            <TruckIcon className="h-4 w-4" />
                            <span>🎉 تهانينا! شحن مجاني!</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">الإجمالي:</span>
                      <span className="text-lg font-bold text-gray-900">{cartTotal.toFixed(2)} جنيه</span>
                    </div>

                    <button
                      onClick={() => {
                        const companyId = getCompanyId();
                        if (companyId) {
                          localStorage.setItem('storefront_companyId', companyId);
                        }
                        navigate('/shop/cart');
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      عرض السلة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StorefrontNav;

