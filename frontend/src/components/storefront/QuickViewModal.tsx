import React, { useState, useEffect } from 'react';
import { XMarkIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import WishlistButton from './WishlistButton';
import { trackViewContent, trackAddToCart } from '../../utils/facebookPixel';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';

interface QuickViewProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  comparePrice?: number;
  images: string | string[];
  stock: number;
  sku?: string;
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

interface QuickViewModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: () => void;
  onAddToWishlist?: () => void;
  showAddToCart?: boolean;
  showWishlist?: boolean;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({
  productId,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist,
  showAddToCart = true,
  showWishlist = true,
}) => {
  const [product, setProduct] = useState<QuickViewProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct();
      fetchStorefrontSettings();
    }
  }, [isOpen, productId]);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const response = await storefrontSettingsService.getPublicSettings(companyId);
        if (response.success && response.data) {
          setStorefrontSettings(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await storefrontApi.getProductQuick(productId);
      if (data.success) {
        setProduct(data.data);

        // Track ViewContent event when product is loaded in QuickView
        if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackViewContent !== false && data.data) {
          try {
            trackViewContent({
              id: data.data.id,
              name: data.data.name,
              price: data.data.price,
              category: data.data.category?.name
            });
            console.log('📊 [Facebook Pixel] ViewContent tracked (QuickView loaded)');
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking ViewContent:', error);
          }
        }
      } else {
        toast.error('فشل تحميل المنتج');
        onClose();
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('حدث خطأ في تحميل المنتج');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await storefrontApi.addToCart({
        productId: product.id,
        quantity,
        ...(selectedVariant && { variantId: selectedVariant })
      });

      // Track AddToCart event
      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackAddToCart !== false) {
        try {
          trackAddToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity
          });
          console.log('📊 [Facebook Pixel] AddToCart tracked (QuickView)');
        } catch (error) {
          console.error('❌ [Facebook Pixel] Error tracking AddToCart:', error);
        }
      }

      toast.success('تمت إضافة المنتج للسلة');
      if (onAddToCart) onAddToCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ في إضافة المنتج');
    }
  };

  // WishlistButton component handles its own logic

  if (!isOpen) return null;

  // Parse images
  let productImages: string[] = [];
  if (product) {
    try {
      if (product.images && typeof product.images === 'string') {
        productImages = JSON.parse(product.images);
      } else if (Array.isArray(product.images)) {
        productImages = product.images;
      }
    } catch (e) {
      console.error('Error parsing images:', e);
    }
  }

  const currentPrice = selectedVariant && product?.variants
    ? product.variants.find(v => v.id === selectedVariant)?.price || product.price
    : product?.price || 0;

  const currentStock = selectedVariant && product?.variants
    ? product.variants.find(v => v.id === selectedVariant)?.stock || 0
    : product?.stock || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">جاري التحميل...</p>
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Images */}
              <div>
                <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {productImages.length > 0 && productImages[selectedImage] ? (
                    <img
                      src={productImages[selectedImage]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-6xl">📦</span>
                    </div>
                  )}
                </div>
                {productImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-indigo-600' : 'border-transparent'
                          }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-16 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>

                {product.category && (
                  <p className="text-sm text-gray-600 mb-4">{product.category.name}</p>
                )}

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-gray-900">
                      {currentPrice} جنيه
                    </span>
                    {product.comparePrice && product.comparePrice > currentPrice && (
                      <>
                        <span className="text-xl text-gray-500 line-through">
                          {product.comparePrice} جنيه
                        </span>
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                          خصم {Math.round(((product.comparePrice - currentPrice) / product.comparePrice) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  {currentStock > 0 ? (
                    <p className="text-green-600 font-medium">
                      ✓ متوفر في المخزون ({currentStock} قطعة)
                    </p>
                  ) : (
                    <p className="text-red-600 font-medium">
                      ✗ غير متوفر حالياً
                    </p>
                  )}
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">الخيارات المتاحة:</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant.id)}
                          disabled={variant.stock === 0}
                          className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${selectedVariant === variant.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                              : variant.stock === 0
                                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 hover:border-indigo-600'
                            }`}
                        >
                          {variant.name}
                          {variant.stock === 0 && ' (غير متوفر)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">الكمية:</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                      disabled={quantity >= currentStock}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {showAddToCart && (
                    <button
                      onClick={handleAddToCart}
                      disabled={currentStock === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingCartIcon className="h-5 w-5" />
                      <span>أضف للسلة</span>
                    </button>
                  )}
                  {showWishlist && (
                    <WishlistButton
                      productId={product.id}
                      variantId={selectedVariant || undefined}
                      enabled={true}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                      size="lg"
                      productName={product.name}
                      productPrice={currentPrice}
                    />
                  )}
                </div>

                {/* View Full Details Link */}
                <div className="mt-4">
                  <Link
                    to={`/shop/products/${product.slug || product.id}?companyId=${getCompanyId()}`}
                    onClick={onClose}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <EyeIcon className="h-5 w-5" />
                    <span>عرض التفاصيل الكاملة</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">المنتج غير موجود</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;

