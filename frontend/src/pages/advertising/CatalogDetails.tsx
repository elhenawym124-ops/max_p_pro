/**
 * Catalog Details Page
 * 
 * صفحة تفاصيل Product Catalog مع Sync Products
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrashIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookProductCatalog,
  FacebookCatalogProduct,
} from '../../services/facebookAdsService';

const CatalogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<FacebookProductCatalog | null>(null);
  const [products, setProducts] = useState<FacebookCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncAll, setSyncAll] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (id) {
      loadCatalog();
      loadCatalogProducts();
    }
  }, [id]);

  const loadCatalog = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await facebookAdsService.getCatalog(id);
      setCatalog(data);
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      toast.error(error?.response?.data?.error || 'فشل في تحميل Catalog');
      navigate('/advertising/facebook-ads/catalogs');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogProducts = async (page: number = 1) => {
    if (!id) return;
    
    try {
      setLoadingProducts(true);
      const result = await facebookAdsService.getCatalogProducts(id, page, 50);
      setProducts(result.data);
    } catch (error: any) {
      console.error('Error loading catalog products:', error);
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSync = async () => {
    if (!id) return;

    try {
      setSyncing(true);
      const result = await facebookAdsService.syncProducts(id, {
        syncAll,
        productIds: syncAll ? undefined : selectedProducts
      });

      toast.success(`تم مزامنة ${result.successful} منتج بنجاح`);
      
      // تحديث البيانات
      await loadCatalog();
      await loadCatalogProducts();

      if (result.failed > 0) {
        toast.error(`فشل في مزامنة ${result.failed} منتج`);
      }
    } catch (error: any) {
      console.error('Error syncing products:', error);
      toast.error(error?.response?.data?.error || 'فشل في مزامنة المنتجات');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('هل أنت متأكد من حذف هذا Catalog؟')) return;

    try {
      await facebookAdsService.deleteCatalog(id);
      toast.success('تم حذف Catalog بنجاح');
      navigate('/advertising/facebook-ads/catalogs');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف Catalog');
    }
  };

  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const getSyncStatusIcon = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">لم يتم العثور على Catalog</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/advertising/facebook-ads/catalogs')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            رجوع
          </button>
          <div className="flex items-center gap-3">
            <ShoppingBagIcon className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{catalog.name}</h1>
              {catalog.description && (
                <p className="mt-1 text-sm text-gray-600">{catalog.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || (!syncAll && selectedProducts.length === 0)}
            className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'جاري المزامنة...' : 'مزامنة المنتجات'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            <TrashIcon className="w-5 h-5" />
            حذف
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">إجمالي المنتجات</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{catalog.totalProducts || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">المنتجات المتزامنة</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{catalog.syncedProducts || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">حالة المزامنة</p>
          <div className="mt-1 flex items-center gap-2">
            {getSyncStatusIcon(catalog.lastSyncStatus)}
            <span className="text-sm font-medium text-gray-900">
              {catalog.lastSyncStatus === 'SUCCESS' ? 'مكتمل' : 
               catalog.lastSyncStatus === 'FAILED' ? 'فشل' :
               catalog.lastSyncStatus === 'IN_PROGRESS' ? 'جاري' : 'غير متزامن'}
            </span>
          </div>
          {catalog.lastSyncAt && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(catalog.lastSyncAt).toLocaleString('ar-EG')}
            </p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">الحالة</p>
          <p className="mt-1">
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
              catalog.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {catalog.status === 'ACTIVE' ? 'نشط' : catalog.status === 'PAUSED' ? 'متوقف' : 'محذوف'}
            </span>
          </p>
        </div>
      </div>

      {/* Sync Options */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">خيارات المزامنة</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={syncAll}
              onChange={() => {
                setSyncAll(true);
                setSelectedProducts([]);
              }}
              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <p className="font-medium text-gray-900">مزامنة جميع المنتجات</p>
              <p className="text-sm text-gray-500">سيتم مزامنة جميع المنتجات النشطة</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={!syncAll}
              onChange={() => setSyncAll(false)}
              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <p className="font-medium text-gray-900">مزامنة منتجات محددة</p>
              <p className="text-sm text-gray-500">اختر المنتجات التي تريد مزامنتها</p>
            </div>
          </label>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">المنتجات في Catalog</h2>
          <div className="flex items-center gap-3">
            {!syncAll && selectedProducts.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedProducts.length} منتج محدد
              </span>
            )}
          </div>
        </div>

        {loadingProducts ? (
          <div className="p-12 text-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="mt-2 text-gray-600">جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBagIcon className="w-16 h-16 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">لا توجد منتجات</h3>
            <p className="mt-2 text-sm text-gray-500">
              ابدأ بمزامنة المنتجات مع Catalog
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {!syncAll && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(products.map(p => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    السعر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    حالة المزامنة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    آخر مزامنة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {!syncAll && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.price ? `${product.price} ${product.currency || 'EGP'}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.availability === 'in stock'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.availability === 'in stock' ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.syncStatus === 'SYNCED'
                          ? 'bg-green-100 text-green-800'
                          : product.syncStatus === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.syncStatus === 'SYNCED' ? 'متزامن' :
                         product.syncStatus === 'FAILED' ? 'فشل' :
                         product.syncStatus === 'UPDATED' ? 'محدث' : 'في الانتظار'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.lastSyncedAt
                        ? new Date(product.lastSyncedAt).toLocaleDateString('ar-EG')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogDetails;

