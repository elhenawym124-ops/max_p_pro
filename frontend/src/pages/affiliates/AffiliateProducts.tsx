import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import {
  LinkIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AffiliateProduct {
  id: string;
  productId: string;
  basePrice: number;
  markup: number;
  finalPrice: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    images: string;
  };
}

const AffiliateProducts: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const navigate = useNavigate();
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/affiliates/products');
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMarkup = async (productId: string, markup: number) => {
    try {
      const product = products.find(p => p.productId === productId);
      if (!product) return;

      const response = await apiClient.put(`/affiliates/products/${product.id}`, { markup });
      if (response.data.success) {
        toast.success('تم تحديث الهامش بنجاح');
        loadProducts();
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const generateAffiliateLink = async (productId: string) => {
    try {
      // الحصول على كود المسوق من API
      const response = await apiClient.get('/affiliates/me');
      if (response.data.success && response.data.data) {
        const affiliateCode = response.data.data.affiliateCode;
        const baseUrl = window.location.origin;
        return `${baseUrl}/shop/products/${productId}?ref=${affiliateCode}`;
      }
    } catch (error) {
      console.error('Error getting affiliate code:', error);
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}/shop/products/${productId}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>منتجاتي</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>إدارة منتجاتك مع هامش الربح</p>
          </div>
          <button
            onClick={() => navigate('/affiliates/marketplace')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-500/20"
          >
            <ShoppingBagIcon className="h-5 w-5" />
            تصفح السوق
          </button>
        </div>

        {/* Product Grid / Empty State */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((affiliateProduct) => {
              const images = affiliateProduct.product.images
                ? JSON.parse(affiliateProduct.product.images)
                : [];
              const mainImage = images[0] || '/placeholder-product.png';

              return (
                <div key={affiliateProduct.id} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'} overflow-hidden hover:shadow-md transition-all group`}>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={mainImage}
                      alt={affiliateProduct.product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-lg">منتجي</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className={`font-bold mb-2 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {affiliateProduct.product.name}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">سعر المنصة:</span>
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatPrice(affiliateProduct.basePrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">هامش ربحك:</span>
                        <span className="font-bold text-green-500">+{formatPrice(affiliateProduct.markup)}</span>
                      </div>
                      <div className={`flex justify-between text-sm font-bold border-t pt-2 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>السعر للعميل:</span>
                        <span className="text-blue-500">
                          {formatPrice(affiliateProduct.finalPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={affiliateProduct.markup}
                        onBlur={(e) => {
                          const newMarkup = parseFloat(e.target.value);
                          if (newMarkup !== affiliateProduct.markup) {
                            handleUpdateMarkup(affiliateProduct.productId, newMarkup);
                          }
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm ${isDark
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                          } outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="تعديل الربح"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const link = await generateAffiliateLink(affiliateProduct.productId);
                          navigator.clipboard.writeText(link);
                          toast.success('تم نسخ الرابط!');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-xs font-bold transition shadow-sm shadow-blue-500/20"
                      >
                        <LinkIcon className="h-4 w-4" />
                        نسخ الرابط
                      </button>
                      <button
                        onClick={() => navigate(`/shop/products/${affiliateProduct.productId}`)}
                        className={`px-3 py-2 border rounded-lg text-xs font-bold transition ${isDark
                          ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        عرض
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`text-center py-20 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
            <ShoppingBagIcon className={`h-16 w-16 mx-auto mb-4 opacity-20 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <p className={`mb-6 text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>كتالوجك الشخصي فارغ تماماً</p>
            <button
              onClick={() => navigate('/affiliates/marketplace')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-500/30"
            >
              اكتشف المنتجات في السوق الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateProducts;

