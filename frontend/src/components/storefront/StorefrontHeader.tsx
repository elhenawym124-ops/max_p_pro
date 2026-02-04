import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCartIcon, MagnifyingGlassIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { buildShopLink, buildCartLink } from '../../utils/storeUrl';

const StorefrontHeader: React.FC = () => {
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('المتجر');
  const location = useLocation();
  const companyId = getCompanyId();

  // Fetch cart count on load
  useEffect(() => {
    fetchCartCount();

    // Listen for cart updates
    const handleCartUpdate = () => {
      fetchCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  // Fetch company info
  useEffect(() => {
    if (companyId) {
      // You can add API call here to get company name if needed
      // For now, we'll use the default
    }
  }, [companyId]);

  const fetchCartCount = async () => {
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
        if (!Array.isArray(items)) {
          items = [];
        }
        const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(count);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to={buildShopLink(companyId || '')}
            className="flex items-center space-x-2 space-x-reverse"
          >
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">🛍️</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">{companyName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link
              to={buildShopLink(companyId || '')}
              className={`text-sm font-medium transition-colors ${isActivePath('/shop')
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              المنتجات
            </Link>
            <Link
              to={`/shop/track-order?companyId=${companyId}`}
              className={`text-sm font-medium transition-colors ${isActivePath('/shop/track-order')
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              تتبع الطلب
            </Link>
          </nav>

          {/* Right Side - Cart & Mobile Menu */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Cart Button */}
            <Link
              to={`/shop/cart?companyId=${companyId}`}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to={`/shop?companyId=${companyId}`}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActivePath('/shop')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                المنتجات
              </Link>
              <Link
                to={`/shop/cart?companyId=${companyId}`}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActivePath('/shop/cart')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                السلة {cartCount > 0 && `(${cartCount})`}
              </Link>
              <Link
                to={`/shop/track-order?companyId=${companyId}`}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActivePath('/shop/track-order')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                تتبع الطلب
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default StorefrontHeader;

