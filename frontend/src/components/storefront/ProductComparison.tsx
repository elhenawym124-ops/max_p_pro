import React, { useState, useEffect } from 'react';
import { ArrowsRightLeftIcon, XMarkIcon, TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getCompanyId, storefrontApi } from '../../utils/storefrontApi';

interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  comparePrice?: number;
  images: string | string[];
  stock: number;
  description?: string;
  category?: {
    id: string;
    name: string;
  };
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
    stock: number;
  }>;
}

interface ProductComparisonProps {
  enabled: boolean;
  maxProducts: number;
  showPrice: boolean;
  showSpecs: boolean;
}

const ProductComparison: React.FC<ProductComparisonProps> = ({
  enabled,
  maxProducts,
  showPrice,
  showSpecs
}) => {
  const [comparisonProducts, setComparisonProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load comparison products from localStorage
    const stored = localStorage.getItem('product_comparison');
    if (stored) {
      try {
        const products = JSON.parse(stored);
        setComparisonProducts(products);
        if (products.length > 0) {
          setIsOpen(true);
        }
      } catch (e) {
        console.error('Error loading comparison products:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    if (comparisonProducts.length > 0) {
      localStorage.setItem('product_comparison', JSON.stringify(comparisonProducts));
    } else {
      localStorage.removeItem('product_comparison');
    }
  }, [comparisonProducts]);

  useEffect(() => {
    // Listen for addToComparison events
    const handleAddToComparison = (event: Event) => {
      const customEvent = event as CustomEvent<Product>;
      const product = customEvent.detail;

      if (comparisonProducts.length >= maxProducts) {
        toast.error(`يمكنك مقارنة ${maxProducts} منتجات كحد أقصى`);
        return;
      }

      if (comparisonProducts.some(p => p.id === product.id)) {
        toast.error('المنتج موجود بالفعل في المقارنة');
        return;
      }

      setComparisonProducts([...comparisonProducts, product]);
      setIsOpen(true);
      toast.success('تم إضافة المنتج للمقارنة');
    };

    window.addEventListener('addToComparison', handleAddToComparison);
    return () => {
      window.removeEventListener('addToComparison', handleAddToComparison);
    };
  }, [comparisonProducts, maxProducts]);


  const removeFromComparison = (productId: string) => {
    setComparisonProducts(comparisonProducts.filter(p => p.id !== productId));
  };

  const clearComparison = () => {
    setComparisonProducts([]);
    setIsOpen(false);
  };

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

  if (!enabled) return null;

  return (
    <>
      {/* Comparison Button (Floating) */}
      {comparisonProducts.length > 0 && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
          title="فتح المقارنة"
        >
          <ArrowsRightLeftIcon className="h-5 w-5" />
          <span className="font-medium">مقارنة ({comparisonProducts.length})</span>
        </button>
      )}

      {/* Comparison Modal */}
      {isOpen && comparisonProducts.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ArrowsRightLeftIcon className="h-6 w-6" />
                  مقارنة المنتجات
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearComparison}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5 inline ml-2" />
                    مسح الكل
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="p-6 overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-right p-4 border-b border-gray-200 font-semibold text-gray-900">الميزة</th>
                          {comparisonProducts.map((product) => (
                            <th key={product.id} className="text-center p-4 border-b border-gray-200 relative min-w-[200px]">
                              <button
                                onClick={() => removeFromComparison(product.id)}
                                className="absolute top-2 left-2 p-1 hover:bg-gray-100 rounded-full"
                              >
                                <XMarkIcon className="h-4 w-4 text-gray-500" />
                              </button>
                              <div className="space-y-2">
                                <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                                  {parseImages(product.images).length > 0 && parseImages(product.images)[0] ? (
                                    <img
                                      src={parseImages(product.images)[0]}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <span className="text-4xl">📦</span>
                                    </div>
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Price */}
                        {showPrice && (
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 border-b border-gray-200 font-semibold text-gray-900">السعر</td>
                            {comparisonProducts.map((product) => (
                              <td key={product.id} className="p-4 border-b border-gray-200 text-center">
                                <div>
                                  <span className="text-lg font-bold text-gray-900">
                                    {product.price} جنيه
                                  </span>
                                  {product.comparePrice && product.comparePrice > product.price && (
                                    <div className="text-sm text-gray-500 line-through">
                                      {product.comparePrice} جنيه
                                    </div>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        )}

                        {/* Stock */}
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 border-b border-gray-200 font-semibold text-gray-900">التوفر</td>
                          {comparisonProducts.map((product) => (
                            <td key={product.id} className="p-4 border-b border-gray-200 text-center">
                              {product.stock > 0 ? (
                                <span className="text-green-600 font-medium">
                                  متوفر ({product.stock})
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">غير متوفر</span>
                              )}
                            </td>
                          ))}
                        </tr>

                        {/* Category */}
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 border-b border-gray-200 font-semibold text-gray-900">الفئة</td>
                          {comparisonProducts.map((product) => (
                            <td key={product.id} className="p-4 border-b border-gray-200 text-center">
                              {product.category?.name || '-'}
                            </td>
                          ))}
                        </tr>

                        {/* Description */}
                        {showSpecs && (
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 border-b border-gray-200 font-semibold text-gray-900">الوصف</td>
                            {comparisonProducts.map((product) => (
                              <td key={product.id} className="p-4 border-b border-gray-200 text-center text-sm text-gray-600">
                                {product.description ? (
                                  <p className="line-clamp-3">{product.description}</p>
                                ) : (
                                  '-'
                                )}
                              </td>
                            ))}
                          </tr>
                        )}

                        {/* Actions */}
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-semibold text-gray-900">الإجراءات</td>
                          {comparisonProducts.map((product) => (
                            <td key={product.id} className="p-4 text-center">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      await storefrontApi.addToCart({
                                        productId: product.id,
                                        quantity: 1,
                                        variantId: null
                                      });
                                      toast.success(`تم إضافة ${product.name} للسلة`);
                                      window.dispatchEvent(new Event('cartUpdated'));
                                    } catch (error) {
                                      console.error('Error adding to cart:', error);
                                      toast.error('حدث خطأ في إضافة المنتج للسلة');
                                    }
                                  }}
                                  disabled={product.stock === 0}
                                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${product.stock === 0
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                  <ShoppingCartIcon className="h-4 w-4" />
                                  {product.stock === 0 ? 'غير متوفر' : 'أضف للسلة'}
                                </button>
                                <Link
                                  to={`/shop/products/${product.slug || product.id}?companyId=${getCompanyId()}`}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm text-center"
                                >
                                  عرض التفاصيل
                                </Link>
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export function to add product to comparison (will be used by component internally)
const addToComparisonInternal = (product: Product, setProducts: React.Dispatch<React.SetStateAction<Product[]>>, maxProducts: number) => {
  setProducts((prev) => {
    if (prev.length >= maxProducts) {
      alert(`يمكنك مقارنة ${maxProducts} منتجات كحد أقصى`);
      return prev;
    }
    if (prev.some(p => p.id === product.id)) {
      alert('المنتج موجود بالفعل في المقارنة');
      return prev;
    }
    return [...prev, product];
  });
};

// Export function to add product to comparison (for external use)
export const addToComparison = (product: Product) => {
  const event = new CustomEvent('addToComparison', { detail: product });
  window.dispatchEvent(event);
};

export default ProductComparison;

