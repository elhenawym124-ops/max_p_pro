import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon } from '@heroicons/react/24/outline';
import { recentlyViewedApi } from '../../utils/storefrontApi';
import { getCompanyId } from '../../utils/storefrontApi';

interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  comparePrice?: number;
  images: string | string[];
  stock: number;
  category?: {
    id: string;
    name: string;
  };
}

interface RecentlyViewedProps {
  enabled?: boolean;
  count?: number;
  title?: string;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  enabled = true,
  count = 8,
  title = 'المنتجات المشاهدة مؤخراً'
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (enabled) {
      fetchRecentlyViewed();
    }
  }, [enabled, count]);

  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true);
      const data = await recentlyViewedApi.getRecentlyViewed(count);
      console.log('🔍 [RecentlyViewed] API Response:', {
        success: data.success,
        productsCount: data.data?.length || 0,
        products: data.data
      });
      if (data.success) {
        setProducts(data.data || []);
      } else {
        console.warn('⚠️ [RecentlyViewed] API returned success: false');
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ [RecentlyViewed] Error fetching recently viewed:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || products.length === 0) {
    return null;
  }

  const parseImages = (images: string | string[]): string[] => {
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch {
        return [images];
      }
    }
    return [];
  };

  return (
    <div className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <EyeIcon className="h-6 w-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const productImages = parseImages(product.images);
            const companyId = getCompanyId();

            return (
              <Link
                key={product.id}
                to={`/shop/products/${product.slug || product.id}?companyId=${companyId}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                  {productImages.length > 0 && productImages[0] ? (
                    <img
                      src={productImages[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}

                  {product.comparePrice && product.comparePrice > product.price && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      خصم {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {product.price} جنيه
                    </span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {product.comparePrice} جنيه
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;

