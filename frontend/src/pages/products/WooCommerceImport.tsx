import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  CheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface Product {
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
  weight?: number;
  dimensions?: any;
  wooCommerceId?: string;
  wooCommerceUrl?: string;
}

const WooCommerceImport: React.FC = () => {
  const navigate = useNavigate();
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // جلب المنتجات من WooCommerce
  const fetchProducts = async () => {
    if (!storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/woocommerce/fetch-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          storeUrl: storeUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        toast.success(data.message);
        
        // تحديد كل المنتجات افتراضياً
        const allIndexes = new Set(data.data.products.map((_: any, i: number) => i));
        setSelectedProducts(allIndexes);
      } else {
        toast.error(data.message || 'فشل جلب المنتجات');
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // مسح البيانات
  const clearData = () => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm('');
  };

  // استيراد المنتجات المحددة
  const importProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error('يرجى اختيار منتج واحد على الأقل');
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map(index => products[index]);

      const response = await fetch('/api/v1/woocommerce/import-selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          products: selectedProductsList
        })
      });

      const data = await response.json();

      if (data.success) {
        const { imported, failed, skipped } = data.data;
        
        let message = `تم استيراد ${imported} منتج بنجاح`;
        if (skipped > 0) message += ` | تم تخطي ${skipped} منتج موجود`;
        if (failed > 0) message += ` | فشل ${failed} منتج`;
        
        toast.success(message);
        
        // إعادة تعيين
        clearData();
      } else {
        toast.error(data.message || 'فشل استيراد المنتجات');
      }
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast.error('خطأ في استيراد المنتجات');
    } finally {
      setImporting(false);
    }
  };

  // تبديل تحديد منتج
  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const allIndexes = new Set(
        filteredProducts.map((p: Product) => products.indexOf(p))
      );
      setSelectedProducts(allIndexes);
    }
  };

  // تصفية المنتجات حسب البحث
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            العودة للمنتجات
          </button>
          <div className="flex items-center gap-3">
            <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              استيراد من WooCommerce
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            استورد منتجاتك من WooCommerce مباشرة إلى متجرك
          </p>
        </div>

        {/* Form */}
        {products.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              معلومات الاتصال
            </h2>
            
            <div className="space-y-4">
              {/* Store URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رابط المتجر *
                </label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  أدخل رابط متجرك على WooCommerce
                </p>
              </div>

              {/* Consumer Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Consumer Key *
                </label>
                <input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Consumer Secret *
                </label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  احصل على مفاتيح API من WooCommerce → Settings → Advanced → REST API
                </p>
              </div>

              {/* Fetch Button */}
              <button
                onClick={fetchProducts}
                disabled={loading || !storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري جلب المنتجات...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    جلب المنتجات
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Products List */}
        {products.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Search and Actions */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="ابحث عن منتج..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={toggleAll}
                    className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {selectedProducts.size === filteredProducts.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                  
                  <button
                    onClick={importProducts}
                    disabled={importing || selectedProducts.size === 0}
                    className="flex-1 sm:flex-none px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        جاري الاستيراد...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        استيراد ({selectedProducts.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product: Product, index: number) => {
                  const productIndex = products.indexOf(product);
                  const isSelected = selectedProducts.has(productIndex);

                  return (
                    <div
                      key={productIndex}
                      onClick={() => toggleProduct(productIndex)}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {/* Selection Indicator */}
                      <div className="absolute top-2 right-2">
                        {isSelected ? (
                          <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                        ) : (
                          <div className="h-6 w-6 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                        )}
                      </div>

                      {/* Product Image */}
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                          <ShoppingBagIcon className="h-16 w-16 text-gray-400" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        
                        <div className="space-y-1 text-sm">
                          {/* Price */}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">السعر:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {product.price} جنيه
                            </span>
                          </div>

                          {/* Compare Price */}
                          {product.comparePrice && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 dark:text-gray-400">السعر الأصلي:</span>
                              <span className="line-through text-gray-500">
                                {product.comparePrice} جنيه
                              </span>
                            </div>
                          )}

                          {/* Stock */}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">المخزون:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {product.stock}
                            </span>
                          </div>

                          {/* Category */}
                          {product.category && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 dark:text-gray-400">الفئة:</span>
                              <span className="text-gray-900 dark:text-white">
                                {product.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  لا توجد منتجات تطابق البحث
                </p>
              </div>
            )}

            {/* Cancel Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={clearData}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                إلغاء وبدء من جديد
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WooCommerceImport;

