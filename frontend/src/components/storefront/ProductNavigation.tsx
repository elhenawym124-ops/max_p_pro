import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { getCompanyId } from '../../utils/storefrontApi';

interface ProductNavigationProps {
  enabled: boolean;
  navigationType: 'sameCategory' | 'allProducts';
  showButtons: boolean;
  keyboardShortcuts: boolean;
  currentProductId: string;
  currentCategoryId?: string;
}

interface Product {
  id: string;
  name: string;
  slug?: string;
}

const ProductNavigation: React.FC<ProductNavigationProps> = ({
  enabled,
  navigationType,
  showButtons,
  keyboardShortcuts,
  currentProductId,
  currentCategoryId
}) => {
  const navigate = useNavigate();
  const [previousProduct, setPreviousProduct] = useState<Product | null>(null);
  const [nextProduct, setNextProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    fetchNavigationProducts();
  }, [enabled, navigationType, currentProductId, currentCategoryId]);

  useEffect(() => {
    if (!enabled || !keyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && previousProduct) {
        navigate(`/shop/products/${previousProduct.slug || previousProduct.id}?companyId=${getCompanyId()}`);
      } else if (e.key === 'ArrowRight' && nextProduct) {
        navigate(`/shop/products/${nextProduct.slug || nextProduct.id}?companyId=${getCompanyId()}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enabled, keyboardShortcuts, previousProduct, nextProduct, navigate]);

  const fetchNavigationProducts = async () => {
    try {
      setLoading(true);
      const companyId = getCompanyId();
      if (!companyId) return;

      const params: any = {
        companyId,
        currentProductId,
        type: navigationType
      };

      if (navigationType === 'sameCategory' && currentCategoryId) {
        params.categoryId = currentCategoryId;
      }

      // Build query string
      const queryString = new URLSearchParams(params).toString();

      // Use storefrontFetch for public routes
      const { storefrontFetch } = await import('../../utils/storefrontApi');
      const response = await storefrontFetch(`/products/navigation?${queryString}`);

      if (response && response.success && response.data) {
        setPreviousProduct(response.data.previous || null);
        setNextProduct(response.data.next || null);
      }
    } catch (error: any) {
      // Silently handle errors - endpoint might not exist
      // storefrontFetch throws Error with status property
      const status = error?.status || (error?.message?.includes('404') ? 404 : 0);
      if (status !== 404) {
        // Only log non-404 errors
        console.error('Error fetching navigation products:', error);
      }
      // Silently fail - navigation is optional
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !showButtons) return null;

  const hasNavigation = previousProduct || nextProduct;

  if (!hasNavigation && !loading) return null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 my-6">
      {/* Previous Product */}
      <button
        onClick={() => {
          if (previousProduct) {
            navigate(`/shop/products/${previousProduct.slug || previousProduct.id}?companyId=${getCompanyId()}`);
            window.scrollTo(0, 0);
          }
        }}
        disabled={!previousProduct || loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${previousProduct && !loading
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
      >
        <ArrowRightIcon className="h-5 w-5" />
        <div className="text-right">
          <div className="text-xs text-gray-500">السابق</div>
          {previousProduct && (
            <div className="text-sm font-medium truncate max-w-[150px]">
              {previousProduct.name}
            </div>
          )}
        </div>
      </button>

      {/* Keyboard Shortcuts Hint */}
      {keyboardShortcuts && (previousProduct || nextProduct) && (
        <div className="text-xs text-gray-400 text-center">
          استخدم ← → للتنقل
        </div>
      )}

      {/* Next Product */}
      <button
        onClick={() => {
          if (nextProduct) {
            navigate(`/shop/products/${nextProduct.slug || nextProduct.id}?companyId=${getCompanyId()}`);
            window.scrollTo(0, 0);
          }
        }}
        disabled={!nextProduct || loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${nextProduct && !loading
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
      >
        <div className="text-left">
          <div className="text-xs text-gray-500">التالي</div>
          {nextProduct && (
            <div className="text-sm font-medium truncate max-w-[150px]">
              {nextProduct.name}
            </div>
          )}
        </div>
        <ArrowLeftIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ProductNavigation;

