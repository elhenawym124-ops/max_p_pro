/**
 * Catalogs Management Page
 * 
 * صفحة إدارة Product Catalogs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  FolderIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  FacebookProductCatalog,
} from '../../services/facebookAdsService';

const CatalogsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<FacebookProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      setErrors({});

      if (!businessId) {
        setErrors({ businessId: 'Business ID is required' });
        setLoading(false);
        return;
      }

      const data = await facebookAdsService.getCatalogs(businessId);
      setCatalogs(data);
    } catch (error: any) {
      console.error('Error loading catalogs:', error);
      const errorMsg = error?.response?.data?.error || 'فشل في تحميل Catalogs';
      toast.error(errorMsg);
      if (errorMsg.includes('Business ID')) {
        setErrors({ businessId: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCatalogs();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const handleCreateCatalog = () => {
    navigate('/advertising/facebook-ads/catalogs/create');
  };

  const handleViewCatalog = (id: string) => {
    navigate(`/advertising/facebook-ads/catalogs/${id}`);
  };

  const handleDeleteCatalog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذا Catalog؟ سيتم حذف جميع المنتجات المرتبطة به.')) return;

    try {
      await facebookAdsService.deleteCatalog(id);
      toast.success('تم حذف Catalog بنجاح');
      await loadCatalogs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل في حذف Catalog');
    }
  };

  const getSyncStatusBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSyncStatusLabel = (status?: string) => {
    if (!status) return 'غير متزامن';

    switch (status) {
      case 'SUCCESS':
        return 'مكتمل';
      case 'FAILED':
        return 'فشل';
      case 'IN_PROGRESS':
        return 'جاري المزامنة';
      default:
        return 'غير متزامن';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة Product Catalogs</h1>
          <p className="mt-2 text-sm text-gray-600">
            أدر Product Catalogs لحملات Dynamic Ads
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={handleCreateCatalog}
            className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-5 h-5" />
            Catalog جديد
          </button>
        </div>
      </div>

      {/* Business ID Input */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business ID (اختياري)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={businessId}
            onChange={(e) => {
              setBusinessId(e.target.value);
              if (errors['businessId']) setErrors({ ...errors, businessId: '' });
            }}
            placeholder="أدخل Facebook Business ID"
            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors['businessId'] ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          <button
            onClick={loadCatalogs}
            className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            تحميل
          </button>
        </div>
        {errors['businessId'] && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
            {errors['businessId']}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          يمكنك العثور على Business ID من Facebook Business Manager
        </p>
      </div>

      {/* Catalogs List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {catalogs.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">لا توجد Catalogs</h3>
            <p className="mt-2 text-sm text-gray-500">
              ابدأ بإنشاء Catalog جديد لحملات Dynamic Ads
            </p>
            <button
              onClick={handleCreateCatalog}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5" />
              إنشاء Catalog جديد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الاسم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المنتجات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر مزامنة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {catalogs.map((catalog) => (
                  <tr
                    key={catalog.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewCatalog(catalog.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBagIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{catalog.name}</div>
                          {catalog.description && (
                            <div className="text-sm text-gray-500">{catalog.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {catalog.syncedProducts || 0} / {catalog.totalProducts || 0}
                      </div>
                      <div className="text-xs text-gray-500">منتج متزامن</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {catalog.lastSyncAt ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(catalog.lastSyncAt).toLocaleDateString('ar-EG')}
                          </div>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSyncStatusBadge(catalog.lastSyncStatus)}`}>
                            {getSyncStatusLabel(catalog.lastSyncStatus)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">لم يتم المزامنة</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {catalog.status === 'ACTIVE' ? 'نشط' : catalog.status === 'PAUSED' ? 'متوقف' : 'محذوف'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(catalog.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCatalog(catalog.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCatalog(catalog.id, e)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
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

export default CatalogsManagement;

