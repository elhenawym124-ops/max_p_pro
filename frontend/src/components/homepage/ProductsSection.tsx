import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HeartIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { storefrontApi } from '../../utils/storefrontApi';

interface ProductsSectionProps {
  section: any;
  settings: any;
}

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  slug?: string;
  inStock: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  discount?: number;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ section, settings }) => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
    loadWishlist();
  }, [section.displayType, section.limit]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('🛍️ [ProductsSection] Loading products...', { displayType: section.displayType, limit: section.limit });

      // Build query parameters based on section settings
      const params: Record<string, string> = {
        limit: (section.limit || 8).toString(),
        page: '1'
      };

      // Filter by display type
      if (section.displayType === 'featured') {
        params.isFeatured = 'true';
      } else if (section.displayType === 'new') {
        params.sortBy = 'createdAt';
        params.sortOrder = 'desc';
      } else if (section.displayType === 'bestseller') {
        params.sortBy = 'sales';
        params.sortOrder = 'desc';
      } else if (section.displayType === 'sale') {
        params.onSale = 'true';
      }

      console.log('🛍️ [ProductsSection] Request params:', params);
      const data = await storefrontApi.getProducts(params);
      console.log('🛍️ [ProductsSection] Response:', data);

      if (data.success) {
        // Handle both response formats: { data: { products: [...] } } or { data: [...] }
        const productsList = data.data?.products || data.data || [];

        // Transform API data to match Product interface
        const transformedProducts: Product[] = productsList.map((product: any) => {
          // Parse images from JSON string or array
          let images: string[] = [];
          if (product.images) {
            if (typeof product.images === 'string') {
              try {
                images = JSON.parse(product.images);
              } catch {
                images = [product.images];
              }
            } else if (Array.isArray(product.images)) {
              images = product.images;
            }
          }

          // Calculate salePrice from comparePrice
          const salePrice = product.comparePrice && product.comparePrice < product.price
            ? parseFloat(product.comparePrice)
            : undefined;

          // Check if in stock
          const inStock = product.stock > 0;

          // Use backend slug if available
          const slug = product.slug;

          return {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price) || 0,
            salePrice,
            images,
            slug,
            inStock,
            isFeatured: product.isFeatured || false,
            isNew: product.isNew || false,
            discount: salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : undefined
          };
        });

        console.log('🛍️ [ProductsSection] Transformed products:', transformedProducts.length);
        setProducts(transformedProducts);
      } else {
        console.warn('⚠️ [ProductsSection] API response not successful:', data);
      }
    } catch (error) {
      console.error('❌ [ProductsSection] Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = () => {
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        setWishlist(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const toggleWishlist = (productId: string) => {
    const newWishlist = new Set(wishlist);
    if (newWishlist.has(productId)) {
      newWishlist.delete(productId);
    } else {
      newWishlist.add(productId);
    }
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify([...newWishlist]));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">لا توجد منتجات متاحة حالياً</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {section.title && (
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-2"
              style={{
                color: settings.colorScheme?.text || '#1a1a1a',
                fontFamily: settings.typography?.headingFont || 'inherit'
              }}
            >
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-gray-600">{section.subtitle}</p>
            )}
          </div>
        )}

        <div className={`grid grid-cols-2 md:grid-cols-${section.columns || 4} gap-6`}>
          {products.map((product) => {
            const isInWishlist = wishlist.has(product.id);
            const hasDiscount = product.salePrice && product.salePrice < product.price;
            const discountPercent = hasDiscount
              ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
              : 0;

            return (
              <div key={product.id} className="group relative">
                {/* Product Image */}
                <Link
                  to={`/shop/products/${product.slug || product.id}`}
                  className="block relative overflow-hidden rounded-lg mb-4 bg-gray-100 aspect-square"
                >
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-400">لا توجد صورة</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {hasDiscount && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{discountPercent}%
                      </span>
                    )}
                    {product.isNew && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                        جديد
                      </span>
                    )}
                    {!product.inStock && (
                      <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded">
                        نفذ
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {section.showQuickView && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleWishlist(product.id);
                          }}
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title={isInWishlist ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          {isInWishlist ? (
                            <HeartIconSolid className="w-5 h-5 text-red-500" />
                          ) : (
                            <HeartIcon className="w-5 h-5 text-gray-700" />
                          )}
                        </button>
                        <button
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title="معاينة سريعة"
                        >
                          <EyeIcon className="w-5 h-5 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  )}
                </Link>

                {/* Product Info */}
                <div className="space-y-2">
                  <Link
                    to={`/shop/products/${product.slug || product.id}`}
                    className="block"
                  >
                    <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    {hasDiscount ? (
                      <>
                        <span
                          className="text-lg font-bold"
                          style={{ color: settings.colorScheme?.primary || '#4F46E5' }}
                        >
                          {formatPrice(product.salePrice!)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span
                        className="text-lg font-bold"
                        style={{ color: settings.colorScheme?.primary || '#4F46E5' }}
                      >
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  {product.inStock && (
                    <button
                      className="w-full py-2 px-4 rounded-lg font-semibold transition-all hover:shadow-md"
                      style={{
                        backgroundColor: settings.colorScheme?.primary || '#4F46E5',
                        color: '#ffffff'
                      }}
                    >
                      <ShoppingCartIcon className="w-5 h-5 inline ml-2" />
                      أضف للسلة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Link */}
        {section.showViewAll && (
          <div className="text-center mt-12">
            <Link
              to="/shop"
              className="inline-block px-8 py-3 rounded-lg font-semibold transition-all hover:shadow-md"
              style={{
                backgroundColor: settings.colorScheme?.primary || '#4F46E5',
                color: '#ffffff'
              }}
            >
              عرض جميع المنتجات
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsSection;
