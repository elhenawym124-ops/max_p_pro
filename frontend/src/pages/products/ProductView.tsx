import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useCurrency } from '../../hooks/useCurrency';
import { buildApiUrl } from '../../utils/urlHelper';
import { convertToPublicUrl } from '../../utils/urlConverter';
import { useAuth } from '../../hooks/useAuthSimple';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  CubeIcon,
  ScaleIcon,
  CalendarIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface ProductVariant {
  id: string;
  name: string;
  type: string;
  sku: string;
  price?: number;
  comparePrice?: number;
  cost?: number;
  images?: string;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  metadata?: any;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  category: {
    id: string;
    name: string;
  };
  images?: string[];
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  hasPromotedAd?: boolean;
  enableCheckoutForm?: boolean;
  tags?: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

const ProductView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  // Add effect to reload data when page becomes visible (user returns from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        loadProduct(id);
      }
    };

    const handleFocus = () => {
      if (id) {
        loadProduct(id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(buildApiUrl(`products/${productId}?_t=${timestamp}`), {
        headers,
        cache: 'no-cache'
      });

      console.log('🔍 Product API Response Status:', response.status);
      console.log('🔍 Product API Response Headers:', response.headers.get('content-type'));

      if (!response.ok) {
        console.error('❌ Product API Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Expected JSON but got:', contentType, text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setProduct(data.data);
        // Set first variant as selected if variants exist
        if (data.data.variants && data.data.variants.length > 0) {
          setSelectedVariant(data.data.variants[0]);
        }
        // Reset selected image index
        setSelectedImageIndex(0);
      } else {
        setError('فشل في تحميل بيانات المنتج');
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('حدث خطأ أثناء تحميل بيانات المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!product) return;

    try {
      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl(`products/${product.id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isActive: !product.isActive
        })
      });

      if (response.ok) {
        setProduct(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      } else {
        alert('فشل في تحديث حالة المنتج');
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  const handleDelete = async () => {
    if (!product || !confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      return;
    }

    try {
      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl(`products/${product.id}`), {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        alert('تم حذف المنتج بنجاح');
        window.location.href = '/products';
      } else {
        alert('فشل في حذف المنتج');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  // Helper functions for variant data
  const getCurrentPrice = () => {
    return selectedVariant?.price || product?.price || 0;
  };

  const getCurrentStock = () => {
    return selectedVariant?.stock || product?.stock || 0;
  };

  const getCurrentSku = () => {
    return selectedVariant?.sku || product?.sku || '';
  };

  const getVariantImages = () => {
    let images: string[] = [];

    // First try to get variant images
    if (selectedVariant?.images) {
      try {
        const variantImages = JSON.parse(selectedVariant.images);
        images = Array.isArray(variantImages) ? variantImages : [];
        console.log('📸 [PRODUCT-IMAGES] Loaded variant images:', images.length);
      } catch (e) {
        console.warn('⚠️ [PRODUCT-IMAGES] Failed to parse variant images:', e);
        images = [];
      }
    }

    // Then try to get product images if variant images are empty
    if (images.length === 0 && product?.images) {
      // If images is already an array, use it
      if (Array.isArray(product.images)) {
        images = product.images;
        console.log('📸 [PRODUCT-IMAGES] Loaded product images (array):', images.length);
      }
      // If images is a string (JSON), try to parse it
      else if (typeof product.images === 'string') {
        try {
          const productImages = JSON.parse(product.images);
          images = Array.isArray(productImages) ? productImages : [];
          console.log('📸 [PRODUCT-IMAGES] Loaded product images (parsed):', images.length);
        } catch (e) {
          console.warn('⚠️ [PRODUCT-IMAGES] Failed to parse product images:', e);
          images = [];
        }
      }
    }

    // معالجة روابط الصور لضمان عرضها بشكل صحيح
    const processedImages = images.map(imageUrl => {
      if (!imageUrl) {
        console.warn('⚠️ [PRODUCT-IMAGES] Empty image URL found');
        return imageUrl;
      }

      let processedUrl = imageUrl;

      // إذا كان الرابط نسبي، أضف base URL
      if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
        processedUrl = buildApiUrl(imageUrl.replace(/^\//, ''));
        console.log('🔄 [PRODUCT-IMAGES] Converted relative URL:', imageUrl, '->', processedUrl);
      } else {
        // معالجة الروابط باستخدام convertToPublicUrl
        processedUrl = convertToPublicUrl(imageUrl);
        if (processedUrl !== imageUrl) {
          console.log('🔄 [PRODUCT-IMAGES] Converted public URL:', imageUrl, '->', processedUrl);
        }
      }

      return processedUrl;
    }).filter(url => url); // إزالة أي روابط فارغة

    console.log('✅ [PRODUCT-IMAGES] Final processed images:', processedImages.length, processedImages);

    return processedImages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4 ml-2" />
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">المنتج غير موجود</div>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4 ml-2" />
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Link
                to="/products"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-4 w-4 ml-1" />
                العودة للمنتجات
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse">
              <button
                onClick={() => loadProduct(product.id)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowPathIcon className="h-4 w-4 ml-2" />
                تحديث
              </button>

              <Link
                to={`/products/${product.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PencilIcon className="h-4 w-4 ml-2" />
                تعديل
              </Link>

              {user?.companyId && (
                <a
                  href={`/shop/products/${product.slug || product.id}?companyId=${user.companyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-indigo-300 dark:border-indigo-700 rounded-md shadow-sm text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2" />
                  عرض في المتجر
                </a>
              )}

              <button
                onClick={handleToggleStatus}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${product.isActive
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {product.isActive ? (
                  <>
                    <EyeSlashIcon className="h-4 w-4 ml-2" />
                    إلغاء التفعيل
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4 ml-2" />
                    تفعيل
                  </>
                )}
              </button>

              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4 ml-2" />
                حذف
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${product.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
            {product.isActive ? (
              <>
                <CheckCircleIcon className="h-4 w-4 ml-1" />
                نشط
              </>
            ) : (
              <>
                <XCircleIcon className="h-4 w-4 ml-1" />
                غير نشط
              </>
            )}
          </span>

          {product.hasPromotedAd && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              📢 إعلان ممول على Facebook
            </span>
          )}

          {product.enableCheckoutForm !== false && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              🛒 فورم الشيك أوت مفعل
            </span>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">المعلومات الأساسية</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المنتج</label>
                  <p className="text-gray-900 dark:text-gray-100">{product.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                  {product.description ? (
                    <div
                      className="text-gray-900 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none product-description"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">لا يوجد وصف</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
                  <p className="text-gray-900 dark:text-gray-100">{product.category?.name || 'غير محدد'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر الحالي</label>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPrice(getCurrentPrice())}</p>
                  {selectedVariant && selectedVariant.price !== product.price && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">السعر الأساسي: {formatPrice(product.price)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المخزون المتاح</label>
                  <p className={`text-lg font-semibold ${getCurrentStock() > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {getCurrentStock()} قطعة
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز المنتج</label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{getCurrentSku()}</p>
                </div>
              </div>
            </div>

            {/* Product Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">متغيرات المنتج</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر المتغير:</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => {
                            setSelectedVariant(variant);
                            setSelectedImageIndex(0); // Reset to first image when variant changes
                          }}
                          className={`p-3 border rounded-lg text-center transition-all ${selectedVariant?.id === variant.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } ${!variant.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!variant.isActive}
                        >
                          <div className="font-medium">{variant.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{variant.type}</div>
                          {variant.price && variant.price !== product.price && (
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                              {formatPrice(variant.price)}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${variant.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {variant.stock > 0 ? `${variant.stock} متوفر` : 'نفد المخزون'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedVariant && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">تفاصيل المتغير المحدد:</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">الاسم:</span>
                          <span className="font-medium mr-2 text-gray-900 dark:text-gray-200">{selectedVariant.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">النوع:</span>
                          <span className="font-medium mr-2 text-gray-900 dark:text-gray-200">{selectedVariant.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">رمز المنتج:</span>
                          <span className="font-medium mr-2 font-mono text-gray-900 dark:text-gray-200">{selectedVariant.sku}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">السعر:</span>
                          <span className="font-medium mr-2 text-green-600 dark:text-green-400">
                            {formatPrice(selectedVariant.price || product.price)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">المخزون:</span>
                          <span className={`font-medium mr-2 ${selectedVariant.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {selectedVariant.stock} قطعة
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                          <span className={`font-medium mr-2 ${selectedVariant.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {selectedVariant.isActive ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="space-y-6">
            {/* Product Images */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">صور المنتج</h2>

              {(() => {
                const images = getVariantImages();

                if (!images || images.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-gray-400 dark:text-gray-500 text-sm">لا توجد صور متاحة</div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Main Image */}
                    <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer group relative">
                      <img
                        src={images[selectedImageIndex] || images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onClick={() => {
                          const imageUrl = images[selectedImageIndex] || images[0];
                          if (imageUrl) {
                            window.open(imageUrl, '_blank');
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error('❌ [PRODUCT-IMAGE] Failed to load image:', target.src);
                          // محاولة استخدام proxy إذا كان الرابط من نفس الدومين
                          const originalSrc = target.src;
                          if (originalSrc && !originalSrc.includes('/api/proxy-image')) {
                            try {
                              const proxyUrl = `${buildApiUrl('').replace('/api/v1', '')}/api/proxy-image?url=${encodeURIComponent(originalSrc)}`;
                              target.src = proxyUrl;
                            } catch {
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                            }
                          } else {
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                          }
                        }}
                      />
                      {/* Overlay hint */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                          انقر للعرض بالحجم الكامل
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Images */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((image, index) => (
                          <div
                            key={index}
                            className={`aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index
                                ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                          >
                            <img
                              src={image}
                              alt={`${product.name} - صورة ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => setSelectedImageIndex(index)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.error('❌ [PRODUCT-IMAGE] Failed to load thumbnail:', target.src);
                                // محاولة استخدام proxy إذا كان الرابط من نفس الدومين
                                const originalSrc = target.src;
                                if (originalSrc && !originalSrc.includes('/api/proxy-image')) {
                                  try {
                                    const proxyUrl = `${buildApiUrl('').replace('/api/v1', '')}/api/proxy-image?url=${encodeURIComponent(originalSrc)}`;
                                    target.src = proxyUrl;
                                  } catch {
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                                  }
                                } else {
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Image Count */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      {images.length} صورة متاحة
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إحصائيات سريعة</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي المتغيرات</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{product.variants?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي الصور</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{getVariantImages().length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الإنشاء</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {new Date(product.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">آخر تحديث</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {new Date(product.updatedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductView;


