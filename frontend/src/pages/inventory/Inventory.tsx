import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useCurrency } from '../../hooks/useCurrency';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../services/companyAwareApi';

interface InventoryItem {
  id: string; // Internal inventory ID
  productId: string;
  productName: string;
  sku: string;
  price: number;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  available: number;
  reserved: number;
  reorderPoint?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  updatedAt: string;
}

interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock';
  priority: 'critical' | 'high' | 'medium' | 'low';
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  message: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity?: number;
  createdAt: string;
  isRead: boolean;
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string, name: string }[]>([]);
  const [filters, setFilters] = useState({
    warehouseId: '',
    lowStock: false,
    outOfStock: false,
  });

  const [stockUpdate, setStockUpdate] = useState({
    productId: '',
    warehouseId: '',
    quantity: 0,
    type: 'IN' as any,
    reason: 'PURCHASE' as any,
    reference: '',
    notes: '',
    batchNumber: '',
    expiryDate: '',
    isApproved: true,
  });

  const [transferData, setTransferData] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: 0,
    notes: '',
    batchNumber: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
    fetchWarehouses();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const response = await companyAwareApi.get('/warehouses');
      if (response.data.success) {
        setWarehouses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;
      if (filters.lowStock) params.lowStock = 'true';
      if (filters.outOfStock) params.outOfStock = 'true';

      const response = await companyAwareApi.get('/inventory', { params });
      if (response.data.success) {
        const rawData = response.data.data;
        const items: InventoryItem[] = rawData.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.products.name,
          sku: item.products.sku,
          price: item.products.price,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouses?.name || '---',
          quantity: item.quantity,
          available: item.available,
          reserved: item.reserved,
          reorderPoint: item.reorderPoint,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          updatedAt: item.updatedAt
        }));
        setInventory(items);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await companyAwareApi.get('/inventory/alerts');
      if (response.data.success) {
        // Flatten alerts if needed, or handle based on backend structure
        const { lowStock, outOfStock } = response.data.data;
        const allAlerts = [
          ...lowStock.map((item: any) => ({ ...item, type: 'low_stock', priority: 'high', message: 'مخزون منخفض' })),
          ...outOfStock.map((item: any) => ({ ...item, type: 'out_of_stock', priority: 'critical', message: 'نفد المخزون' }))
        ];
        setAlerts(allAlerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const updateStock = async () => {
    try {
      if (!stockUpdate.productId || !stockUpdate.warehouseId || stockUpdate.quantity <= 0) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      const response = await companyAwareApi.post('/inventory/update-stock', stockUpdate);

      if (response.data.success) {
        fetchInventory();
        fetchAlerts();
        setShowStockUpdateModal(false);
        setStockUpdate({
          productId: '',
          warehouseId: '',
          quantity: 0,
          type: 'IN',
          reason: 'PURCHASE',
          reference: '',
          notes: '',
          batchNumber: '',
          expiryDate: '',
          isApproved: true,
        });
        alert(response.data.message || 'تم تحديث المخزون بنجاح');
      } else {
        alert(response.data.message || 'فشل في تحديث المخزون');
      }
    } catch (error: any) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.message || 'فشل في تحديث المخزون');
    }
  };

  const downloadCSV = () => {
    const headers = ['Product', 'SKU', 'Warehouse', 'Batch', 'Quantity', 'Available', 'Cost', 'Expiry'];
    const rows = inventory.map(item => [
      item.productName,
      item.sku,
      item.warehouseName,
      item.batchNumber || '',
      item.quantity,
      item.available,
      item.price,
      item.expiryDate || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const transferStock = async () => {
    try {
      if (!transferData.fromWarehouseId || !transferData.toWarehouseId || transferData.quantity <= 0) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      const response = await companyAwareApi.post('/inventory/transfer', transferData);
      if (response.data.success) {
        fetchInventory();
        setShowTransferModal(false);
        setTransferData({
          productId: '',
          fromWarehouseId: '',
          toWarehouseId: '',
          quantity: 0,
          notes: '',
          batchNumber: '',
        });
        alert('تم نقل المخزون بنجاح');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل في نقل المخزون');
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.available === 0) {
      return { status: 'نفد المخزون', color: 'text-red-600 bg-red-100' };
    }

    if (item.available <= (item.reorderPoint || 0)) {
      return { status: 'مخزون منخفض', color: 'text-yellow-600 bg-yellow-100' };
    }

    return { status: 'متوفر', color: 'text-green-600 bg-green-100' };
  };

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getInventoryStats = () => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((acc, item) => acc + (item.available * item.price), 0);
    const lowStockCount = inventory.filter(item => item.available > 0 && item.available <= (item.reorderPoint || 0)).length;
    const outOfStockCount = inventory.filter(item => item.available === 0).length;

    return { totalItems, totalValue, lowStockCount, outOfStockCount };
  };

  const stats = getInventoryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <CubeIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              إدارة المخزون
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">متابعة وإدارة مستويات المخزون والتنبيهات لجميع منتجات الشركة</p>
          </div>
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={downloadCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
              تصدير CSV
            </button>
            <button
              onClick={() => setShowStockUpdateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              تحديث المخزون
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي المنتجات</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي قيمة المخزون</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(stats.totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">فئات منخفضة المخزون</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStockCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">نفد من المخزون</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{stats.outOfStockCount}</p>
        </div>
      </div>

      {/* Stock Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            تنبيهات المخزون ({alerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertPriorityColor(alert.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium dark:text-gray-100">{alert.productName}</h3>
                    <p className="text-sm mt-1 dark:text-gray-300">{alert.message}</p>
                    <p className="text-xs mt-2 dark:text-gray-400">
                      المخزون الحالي: {alert.currentStock} | نقطة الطلب: {alert.reorderPoint}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-white/50 dark:bg-black/20">
                    {alert.priority === 'critical' ? 'حرج' :
                      alert.priority === 'high' ? 'عالي' :
                        alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-transparent dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              بحث عن منتج
            </label>
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو الـ SKU..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            // Add a search filter if needed in state, or just use frontend filter
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المستودع
            </label>
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المستودعات</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ warehouseId: '', lowStock: false, outOfStock: false })}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
            />
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">مخزون منخفض فقط</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.outOfStock}
              onChange={(e) => setFilters({ ...filters, outOfStock: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
            />
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">نفد المخزون فقط</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المنتج / SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المستودع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الدفعة / الصلاحية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الكمية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المتاح
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  التكلفة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item);

                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{item.batchNumber || '---'}</div>
                      {item.expiryDate && (
                        <div className="text-xs text-red-500">
                          {formatDate(item.expiryDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-bold">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.available}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setTransferData({
                              ...transferData,
                              productId: item.productId,
                              fromWarehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || ''
                            });
                            setShowTransferModal(true);
                          }}
                          className="p-1 text-orange-600 hover:text-orange-900 transition-colors"
                          title="نقل مخزن"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setStockUpdate({
                              ...stockUpdate,
                              productId: item.productId,
                              warehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || '',
                              type: 'IN',
                              reason: 'PURCHASE'
                            });
                            setShowStockUpdateModal(true);
                          }}
                          className="p-1 text-green-600 hover:text-green-900 transition-colors"
                          title="توريد"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setStockUpdate({
                              ...stockUpdate,
                              productId: item.productId,
                              warehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || '',
                              type: 'OUT',
                              reason: 'SALE'
                            });
                            setShowStockUpdateModal(true);
                          }}
                          className="p-1 text-red-600 hover:text-red-900 transition-colors"
                          title="صرف"
                        >
                          <MinusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-20">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">لا توجد منتجات حالياً</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ابدأ بإضافة منتجاتك في قسم المنتجات أولاً.</p>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  تفاصيل المخزون - {selectedItem.productName}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">معلومات المنتج</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>اسم المنتج:</strong> {selectedItem.productName}</p>
                    <p><strong>SKU:</strong> {selectedItem.sku}</p>
                    <p><strong>السعر:</strong> {formatPrice(selectedItem.price)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">حالة المخزون</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>المستودع:</strong> {selectedItem.warehouseName}</p>
                        <p><strong>رقم الدفعة:</strong> {selectedItem.batchNumber || 'بدون'}</p>
                        <p><strong>تاريخ الصلاحية:</strong> {selectedItem.expiryDate ? formatDate(selectedItem.expiryDate) : '---'}</p>
                      </div>
                      <div>
                        <p><strong>الكمية الإجمالية:</strong> {selectedItem.quantity}</p>
                        <p><strong>المتاح للبيع:</strong> {selectedItem.available}</p>
                        <p><strong>المحجوز:</strong> {selectedItem.reserved}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockUpdateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  تحديث المخزون
                </h3>
                <button
                  onClick={() => setShowStockUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المنتج
                  </label>
                  <select
                    value={stockUpdate.productId}
                    onChange={(e) => setStockUpdate({ ...stockUpdate, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر المنتج</option>
                    {inventory.map((item) => (
                      <option key={item.productId} value={item.productId}>
                        {item.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المستودع
                    </label>
                    <select
                      value={stockUpdate.warehouseId}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, warehouseId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="WH001">المستودع الرئيسي</option>
                      <option value="WH002">مستودع جدة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع الحركة
                    </label>
                    <select
                      value={stockUpdate.type}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="IN">إدخال</option>
                      <option value="OUT">إخراج</option>
                      <option value="ADJUSTMENT_IN">تعديل إضافة</option>
                      <option value="ADJUSTMENT_OUT">تعديل سحب</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكمية
                    </label>
                    <input
                      type="number"
                      value={stockUpdate.quantity}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السبب
                    </label>
                    <select
                      value={stockUpdate.reason}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, reason: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="PURCHASE">شراء</option>
                      <option value="SALE">بيع</option>
                      <option value="ADJUSTMENT">تعديل</option>
                      <option value="DAMAGE">تلف</option>
                      <option value="RETURN">مرتجع</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الدفعة (Batch)
                    </label>
                    <input
                      type="text"
                      value={stockUpdate.batchNumber}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="رقم الدفعة أو Lot"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ الصلاحية
                    </label>
                    <input
                      type="date"
                      value={stockUpdate.expiryDate}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center cursor-pointer bg-blue-50 p-2 rounded border border-blue-200">
                    <input
                      type="checkbox"
                      checked={!stockUpdate.isApproved}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, isApproved: !e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="mr-2 text-sm font-medium text-blue-800">يتطلب موافقة المدير (مسودة)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المرجع
                  </label>
                  <input
                    type="text"
                    value={stockUpdate.reference}
                    onChange={(e) => setStockUpdate({ ...stockUpdate, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="رقم الطلب أو المرجع"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    value={stockUpdate.notes}
                    onChange={(e) => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  onClick={() => setShowStockUpdateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateStock}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  تحديث المخزون
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">نقل مخزون بين المستودعات</h3>
                <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                  سيتم نقل الكمية المحددة من مستودع المصدر إلى مستودع الوجهة بشكل مباشر.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">من مستودع</label>
                    <input
                      type="text"
                      value={inventory.find(i => i.warehouseId === transferData.fromWarehouseId)?.warehouseName || ''}
                      disabled
                      className="w-full px-3 py-2 border bg-gray-100 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">إلى مستودع</label>
                    <select
                      value={transferData.toWarehouseId}
                      onChange={(e) => setTransferData({ ...transferData, toWarehouseId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">اختر الوجهة</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
                    <input
                      type="number"
                      value={transferData.quantity}
                      onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      max={inventory.find(i => i.productId === transferData.productId && i.warehouseId === transferData.fromWarehouseId)?.available || 0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الدفعة (Batch)</label>
                    <input type="text" value={transferData.batchNumber} disabled className="w-full px-3 py-2 border bg-gray-100 rounded-md" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات التحويل</label>
                  <textarea
                    value={transferData.notes}
                    onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">إلغاء</button>
                <button onClick={transferStock} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 shadow-sm transition-all">بدء النقل</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

