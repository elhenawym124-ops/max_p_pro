import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Product {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
  weight?: number;
  dimensions?: any;
  easyOrdersId?: string;
  easyOrdersUrl?: string;
}

const EasyOrdersImport: React.FC = () => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // جلب المنتجات من Easy Orders
  const fetchProducts = async () => {
    if (!apiKey.trim()) {
      toast.error(t('easyOrdersImport.errorApiKey'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/easy-orders/fetch-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          apiKey: apiKey.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        toast.success(data.message);

        // تحديد كل المنتجات افتراضياً
        const allIndexes = new Set<number>(data.data.products.map((_: any, i: number) => i));
        setSelectedProducts(allIndexes);
      } else {
        toast.error(data.message || t('easyOrdersImport.errorFetch'));
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(t('easyOrdersImport.errorConnection'));
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
      toast.error(t('easyOrdersImport.errorSelectOne'));
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map(index => products[index]);

      const response = await fetch('/api/v1/easy-orders/import-selected', {
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

        let message = t('easyOrdersImport.successImport', { imported });
        if (skipped > 0) message += ' | ' + t('easyOrdersImport.skipped', { count: skipped });
        if (failed > 0) message += ' | ' + t('easyOrdersImport.failed', { count: failed });

        toast.success(message);

        // إعادة تعيين
        clearData();
      } else {
        toast.error(data.message || t('easyOrdersImport.errorImport'));
      }
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast.error(t('easyOrdersImport.errorImportConnection'));
    } finally {
      setImporting(false);
    }
  };

  // تحديد/إلغاء تحديد منتج
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
        filteredProducts.map(p => products.indexOf(p))
      );
      setSelectedProducts(allIndexes);
    }
  };

  // فلترة المنتجات حسب البحث
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full">


        {/* Form */}
        {products.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('easyOrdersImport.connectionInfo')}
            </h2>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('easyOrdersImport.apiKey')} *
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('easyOrdersImport.apiKeyPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('easyOrdersImport.apiKeyHelp')}
                </p>
              </div>

              {/* Fetch Button */}
              <button
                onClick={fetchProducts}
                disabled={loading || !apiKey.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('easyOrdersImport.fetching')}
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    {t('easyOrdersImport.fetchProducts')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Products List */}
        {products.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Header with Search and Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('easyOrdersImport.availableProducts', { count: filteredProducts.length })}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('easyOrdersImport.selectedCount', { count: selectedProducts.size })}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('easyOrdersImport.search')}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Select All */}
                <button
                  onClick={toggleAll}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {selectedProducts.size === filteredProducts.length ? t('easyOrdersImport.deselectAll') : t('easyOrdersImport.selectAll')}
                </button>

                {/* Import Button */}
                <button
                  onClick={importProducts}
                  disabled={importing || selectedProducts.size === 0}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {t('easyOrdersImport.importing')}
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      {t('easyOrdersImport.importSelected')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => {
                const originalIndex = products.indexOf(product);
                const isSelected = selectedProducts.has(originalIndex);

                return (
                  <div
                    key={originalIndex}
                    onClick={() => toggleProduct(originalIndex)}
                    className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-3 left-3">
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      >
                        {isSelected && (
                          <CheckCircleIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Product Image */}
                    {product.images && product.images.length > 0 && (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(product.images[0] || '')}`}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                        }}
                      />
                    )}

                    {/* Product Info */}
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 pr-8">
                      {product.name}
                    </h3>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('easyOrdersImport.price')}:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {product.price} ج.م
                        </span>
                      </div>

                      {product.stock !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('easyOrdersImport.stock')}:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {product.stock}
                          </span>
                        </div>
                      )}

                      {product.category && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('easyOrdersImport.category')}:</span>
                          <span className="text-gray-900 dark:text-white">
                            {product.category}
                          </span>
                        </div>
                      )}

                      {product.sku && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                          <span className="text-gray-900 dark:text-white font-mono text-xs">
                            {product.sku}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results */}
            {filteredProducts.length === 0 && (
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

export default EasyOrdersImport;

