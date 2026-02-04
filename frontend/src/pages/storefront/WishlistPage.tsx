import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartIcon, ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { wishlistApi } from '../../utils/wishlistApi';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import StorefrontNav from '../../components/StorefrontNav';

interface WishlistItem {
  id: string;
  productId: string;
  variantId?: string;
  product: {
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
  };
  createdAt: string;
}

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);

  useEffect(() => {
    fetchWishlist();
    fetchStorefrontSettings();
  }, []);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success) {
          setStorefrontSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const data = await wishlistApi.getWishlist();
      if (data.success) {
        setItems(data.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.error('حدث خطأ في جلب قائمة الرغبات');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string, productId: string, variantId?: string) => {
    try {
      await wishlistApi.removeFromWishlist(productId, variantId);
      setItems(items.filter(item => item.id !== itemId));
      toast.success('تم حذف المنتج من المفضلة');
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('حدث خطأ في حذف المنتج');
    }
  };

  const handleAddToCart = async (productId: string, variantId?: string) => {
    try {
      await storefrontApi.addToCart({
        productId,
        quantity: 1,
        ...(variantId && { variantId })
      });
      toast.success('تمت إضافة المنتج للسلة');
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ في إضافة المنتج');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('هل أنت متأكد من مسح جميع المنتجات من المفضلة؟')) return;

    try {
      await wishlistApi.clearWishlist();
      setItems([]);
      toast.success('تم مسح قائمة الرغبات');
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      toast.error('حدث خطأ في مسح القائمة');
    }
  };

  // Parse images helper
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

  if (!storefrontSettings?.wishlistEnabled) {
    return (
      <>
        <StorefrontNav />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">قائمة الرغبات غير مفعلة</h2>
            <p className="text-gray-600">يرجى تفعيل قائمة الرغبات من إعدادات المتجر</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StorefrontNav />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <HeartIcon className="h-8 w-8 text-red-500 ml-3" />
              قائمة الرغبات
            </h1>
            <p className="mt-2 text-gray-600">
              {items.length > 0 ? `${items.length} منتج في قائمة الرغبات` : 'قائمة الرغبات فارغة'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-5 w-5 inline ml-2" />
              مسح الكل
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري التحميل...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">قائمة الرغبات فارغة</h2>
            <p className="text-gray-600 mb-6">لم تقم بإضافة أي منتجات لقائمة الرغبات بعد</p>
            <Link
              to={`/shop?companyId=${getCompanyId()}`}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const productImages = parseImages(item.product.images);
              const companyId = getCompanyId();

              return (
                <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <Link to={`/shop/products/${item.product.slug || item.product.id}?companyId=${companyId}`}>
                    <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                      {productImages.length > 0 && productImages[0] ? (
                        <img
                          src={productImages[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link to={`/shop/products/${item.product.slug || item.product.id}?companyId=${companyId}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                        {item.product.name}
                      </h3>
                    </Link>

                    {item.product.category && (
                      <p className="text-sm text-gray-500 mb-2">{item.product.category.name}</p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xl font-bold text-gray-900">
                          {item.product.price} جنيه
                        </span>
                        {item.product.comparePrice && item.product.comparePrice > item.product.price && (
                          <span className="text-sm text-gray-500 line-through mr-2">
                            {item.product.comparePrice} جنيه
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item.product.id, item.variantId)}
                        disabled={item.product.stock === 0}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${item.product.stock === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                        <span>أضف للسلة</span>
                      </button>
                      <button
                        onClick={() => handleRemove(item.id, item.product.id, item.variantId)}
                        className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف من المفضلة"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default WishlistPage;


