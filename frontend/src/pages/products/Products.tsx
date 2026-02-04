import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAuth } from '../../hooks/useAuthSimple';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  ListBulletIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string | null, defaultValue: any = null) => {
  if (!jsonString || jsonString === 'null') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error);

    // If it's a simple string (like tags), try to split by comma
    if (typeof jsonString === 'string' && Array.isArray(defaultValue)) {
      return jsonString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    return defaultValue;
  }
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  category: string;
  categoryId?: string;
  images: string[];
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

type SortField = 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const { user } = useAuth();
  const isAdmin = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selection state for bulk actions
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [tagsFilter, setTagsFilter] = useState<string>('');

  // Quick edit state
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter state (must be defined before hasActiveFilters)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Check if any filters are active
  const hasActiveFilters = !!(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' ||
    stockFilter !== 'all' || priceMin || priceMax || dateFrom || dateTo || tagsFilter);

  // Load products from API with pagination
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If filters are active, load all products for client-side filtering
      // Otherwise, use server-side pagination
      const limit = hasActiveFilters ? 10000 : itemsPerPage;
      const page = hasActiveFilters ? 1 : currentPage;

      const response = await apiClient.get('products', {
        params: {
          page,
          limit,
          sortBy: sortField,
          sortOrder: sortDirection,
        }
      });

      const data = response.data;

      if (data.success && data.data) {
        const transformedProducts = data.data.map((product: any) => ({
          id: product.id,
          name: product.name || '',
          description: product.description || '',
          price: product.price,
          comparePrice: product.comparePrice,
          cost: product.cost,
          sku: product.sku || '',
          category: product.category?.name || 'غير محدد',
          categoryId: product.categoryId,
          images: product.images ? safeJsonParse(product.images, []) : [],
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold || 5,
          isActive: product.isActive,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt),
          tags: product.tags ? safeJsonParse(product.tags, []) : [],
          weight: product.weight,
          dimensions: product.dimensions ? safeJsonParse(product.dimensions, undefined) : undefined,
        }));

        setProducts(transformedProducts);
        setTotalItems(data.pagination?.total || transformedProducts.length);
      } else {
        setError('فشل في تحميل المنتجات');
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, hasActiveFilters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, categoryFilter, statusFilter, stockFilter, priceMin, priceMax, dateFrom, dateTo, tagsFilter]);


  const categories = Array.from(new Set(products.map(p => p.category)));
  const allTags = Array.from(new Set(products.flatMap(p => p.tags || [])));

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'bg-green-100 text-green-800';
      case 'low-stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'متوفر';
      case 'low-stock':
        return 'مخزون منخفض';
      case 'out-of-stock':
        return 'نفد المخزون';
      default:
        return 'غير محدد';
    }
  };

  // Advanced filtering with price range, date range, and tags
  // Only apply client-side filtering when filters are active
  const filteredProducts = hasActiveFilters ? products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.tags || []).some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'inactive' && !product.isActive);

    const stockStatus = getStockStatus(product);
    const matchesStock = stockFilter === 'all' || stockStatus === stockFilter;

    // Advanced filters
    const matchesPriceMin = !priceMin || (product.price != null && product.price >= parseFloat(priceMin));
    const matchesPriceMax = !priceMax || (product.price != null && product.price <= parseFloat(priceMax));
    const matchesDateFrom = !dateFrom || (product.createdAt && new Date(product.createdAt) >= new Date(dateFrom));
    const matchesDateTo = !dateTo || (product.createdAt && new Date(product.createdAt) <= new Date(dateTo));
    const matchesTags = !tagsFilter || (product.tags || []).some(tag =>
      (tag || '').toLowerCase().includes(tagsFilter.toLowerCase())
    );

    return matchesSearch && matchesCategory && matchesStatus && matchesStock &&
      matchesPriceMin && matchesPriceMax && matchesDateFrom && matchesDateTo && matchesTags;
  }) : products;

  // Sorting - only apply client-side sorting when filters are active (server handles sorting when no filters)
  const sortedProducts = hasActiveFilters ? [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'ar');
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'stock':
        comparison = a.stock - b.stock;
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  }) : filteredProducts;

  // Pagination calculations
  // When no filters: use server-side pagination (products are already paginated)
  // When filters active: use client-side pagination on filtered results
  const totalPages = hasActiveFilters
    ? Math.ceil(sortedProducts.length / itemsPerPage)
    : Math.ceil(totalItems / itemsPerPage);
  const startIndex = hasActiveFilters
    ? (currentPage - 1) * itemsPerPage
    : (currentPage - 1) * itemsPerPage; // For display purposes only when no filters
  const paginatedProducts = hasActiveFilters
    ? sortedProducts.slice(startIndex, startIndex + itemsPerPage)
    : sortedProducts; // Server already paginated, use as-is

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle single selection
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === paginatedProducts.length);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;

    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.size} منتج؟`)) return;

    try {
      let deletedCount = 0;
      for (const productId of selectedProducts) {
        const response = await apiClient.delete(`products/${productId}`);
        if (response.status === 200 || response.status === 204) deletedCount++;
      }

      setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      setSelectAll(false);
      alert(`تم حذف ${deletedCount} منتج بنجاح`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleBulkToggleStatus = async (activate: boolean) => {
    if (selectedProducts.size === 0) return;

    try {
      for (const productId of selectedProducts) {
        await apiClient.patch(`products/${productId}`, { isActive: activate });
      }

      setProducts(prev => prev.map(p =>
        selectedProducts.has(p.id) ? { ...p, isActive: activate } : p
      ));
      setSelectedProducts(new Set());
      setSelectAll(false);
      alert(`تم ${activate ? 'تفعيل' : 'تعطيل'} ${selectedProducts.size} منتج بنجاح`);
    } catch (error) {
      console.error('Error bulk toggle status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  // Quick edit handlers
  const startQuickEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
  };

  const cancelQuickEdit = () => {
    setEditingProduct(null);
    setEditPrice('');
    setEditStock('');
  };

  const saveQuickEdit = async (productId: string) => {
    try {
      const response = await apiClient.patch(`products/${productId}`, {
        price: parseFloat(editPrice),
        stock: parseInt(editStock)
      });

      if (response.status === 200) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, price: parseFloat(editPrice), stock: parseInt(editStock), updatedAt: new Date() }
            : p
        ));
        cancelQuickEdit();
      } else {
        alert('فشل في تحديث المنتج');
      }
    } catch (error) {
      console.error('Error quick edit:', error);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  // Duplicate product
  const handleDuplicate = async (product: Product) => {
    try {
      const duplicateData = {
        name: `${product.name} (نسخة)`,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        cost: product.cost,
        sku: `${product.sku}-copy`,
        categoryId: product.categoryId,
        images: product.images,
        tags: product.tags,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        isActive: false,
        weight: product.weight,
        dimensions: product.dimensions,
      };

      const response = await apiClient.post('products', duplicateData);

      if (response.status === 200 || response.status === 201) {
        loadProducts();
        alert('تم نسخ المنتج بنجاح');
      } else {
        alert('فشل في نسخ المنتج');
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert('حدث خطأ أثناء نسخ المنتج');
    }
  };

  // Export to CSV
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('products/export', {
        params: { format: 'csv' },
        responseType: 'blob'
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('تم تصدير المنتجات بنجاح!');
      } else {
        // Fallback: export locally
        exportToCSVLocal();
      }
    } catch (error) {
      console.error('Error exporting:', error);
      exportToCSVLocal();
    } finally {
      setIsLoading(false);
    }
  };

  // Local CSV export fallback
  const exportToCSVLocal = () => {
    const headers = ['الاسم', 'SKU', 'السعر', 'سعر المقارنة', 'المخزون', 'الفئة', 'الحالة', 'تاريخ الإنشاء'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.sku,
      p.price,
      p.comparePrice || '',
      p.stock,
      p.category,
      p.isActive ? 'نشط' : 'غير نشط',
      new Date(p.createdAt).toLocaleDateString('ar-EG')
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    alert('تم تصدير المنتجات بنجاح!');
  };

  // Import from CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      // Skip header line
      const dataLines = lines.slice(1);

      const productsToImport = dataLines.map(line => {
        const values = line.split(',');
        return {
          name: values[0]?.trim() || '',
          sku: values[1]?.trim() || `SKU-${Date.now()}`,
          price: parseFloat(values[2] || '0') || 0,
          stock: parseInt(values[4] || '0', 10) || 0,
          isActive: true,
        };
      }).filter(p => p.name);

      let importedCount = 0;
      for (const product of productsToImport) {
        const response = await apiClient.post('products', product);
        if (response.status === 200 || response.status === 201) importedCount++;
      }

      loadProducts();
      setShowImportModal(false);
      alert(`تم استيراد ${importedCount} منتج بنجاح`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('حدث خطأ أثناء استيراد الملف');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setDateFrom('');
    setDateTo('');
    setTagsFilter('');
  };

  const handleView = (productId: string) => {
    // Navigate to product details page
    window.location.href = `/products/${productId}`;
  };

  const handleEdit = (productId: string) => {
    // Navigate to product edit page
    window.location.href = `/products/${productId}/edit`;
  };

  const handleToggleStatus = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const response = await apiClient.patch(`products/${productId}`, {
        isActive: !product.isActive
      });

      if (response.status === 200) {
        // Update local state
        setProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? { ...p, isActive: !p.isActive, updatedAt: new Date() }
              : p
          )
        );
      } else {
        alert('فشل في تحديث حالة المنتج');
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      return;
    }

    try {
      const response = await apiClient.delete(`products/${productId}`);

      if (response.status === 200 || response.status === 204) {
        // Update local state
        setProducts(prev => prev.filter(product => product.id !== productId));
        alert('تم حذف المنتج بنجاح');
      } else {
        alert('فشل في حذف المنتج');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  const handleDeleteAll = async () => {
    if (products.length === 0) {
      alert('لا توجد منتجات لحذفها');
      return;
    }

    const confirmMessage = `هل أنت متأكد من حذف جميع المنتجات؟\n\nسيتم حذف ${products.length} منتج نهائياً.\n\nهذا الإجراء لا يمكن التراجع عنه!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // تأكيد إضافي للسلامة
    const secondConfirm = prompt('للتأكيد، اكتب "حذف الكل" في المربع أدناه:');
    if (secondConfirm !== 'حذف الكل') {
      alert('تم إلغاء عملية الحذف');
      return;
    }

    try {
      setIsDeletingAll(true);
      const response = await apiClient.delete('products/bulk/delete');

      if (response.status === 200 && response.data.success) {
        setProducts([]);
        alert(`تم حذف ${response.data.data?.deletedProductsCount || 0} منتج و ${response.data.data?.deletedVariantsCount || 0} متغير بنجاح`);
      } else {
        alert(response.data.message || 'فشل في حذف المنتجات');
      }
    } catch (error) {
      console.error('Error deleting all products:', error);
      alert('حدث خطأ أثناء حذف المنتجات');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
  const lowStockCount = products.filter(p => getStockStatus(p) === 'low-stock').length;
  const outOfStockCount = products.filter(p => getStockStatus(p) === 'out-of-stock').length;

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    return sortDirection === 'asc'
      ? <ChevronUpIcon className="h-4 w-4 text-indigo-600" />
      : <ChevronDownIcon className="h-4 w-4 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المنتجات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة وتتبع جميع منتجاتك ومخزونك</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="عرض جدول"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="عرض شبكة"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={handleDeleteAll}
              disabled={isDeletingAll || products.length === 0}
              className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-900/50 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashIcon className="h-4 w-4 ml-2" />
              {isDeletingAll ? 'جاري الحذف...' : 'حذف الكل'}
            </button>
          )}

          {/* Import Button */}
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
              استيراد CSV
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
            {isLoading ? 'جاري التصدير...' : 'تصدير CSV'}
          </button>
          {isAdmin && (
            <>
              <Link
                to="/products/import-easy-orders"
                className="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                Easy Orders
              </Link>
              <Link
                to="/products/import-woocommerce"
                className="inline-flex items-center px-4 py-2 border border-purple-600 dark:border-purple-500 rounded-md shadow-sm text-sm font-medium text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                WooCommerce
              </Link>
            </>
          )}
          {isAdmin && (
            <Link
              to="/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 ml-2" />
              إضافة منتج
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems || products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">منتجات نشطة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {products.filter(p => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مخزون منخفض</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">نفد المخزون</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{outOfStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">قيمة المخزون</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-indigo-700 dark:text-indigo-300 font-medium">
            تم تحديد {selectedProducts.size} منتج
          </span>
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={() => handleBulkToggleStatus(true)}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              <CheckCircleIcon className="h-4 w-4 ml-1" />
              تفعيل
            </button>
            <button
              onClick={() => handleBulkToggleStatus(false)}
              className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
            >
              <XCircleIcon className="h-4 w-4 ml-1" />
              تعطيل
            </button>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4 ml-1" />
              حذف
            </button>
            <button
              onClick={() => { setSelectedProducts(new Set()); setSelectAll(false); }}
              className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
            >
              <XMarkIcon className="h-4 w-4 ml-1" />
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="البحث عن منتج أو SKU أو Tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">جميع الفئات</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">جميع المخزون</option>
            <option value="in-stock">متوفر</option>
            <option value="low-stock">مخزون منخفض</option>
            <option value="out-of-stock">نفد المخزون</option>
          </select>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${showAdvancedFilters
              ? 'border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
          >
            <FunnelIcon className="h-4 w-4 ml-2" />
            فلاتر متقدمة
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر من</label>
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر إلى</label>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="999999"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <select
                  value={tagsFilter}
                  onChange={(e) => setTagsFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">جميع الـ Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={resetAdvancedFilters}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل المنتجات...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          {/* Header with Actions */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">المنتجات</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة منتجات المتجر</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/products/import-easy-orders"
                className="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                Easy Orders
              </Link>
              <Link
                to="/products/import-woocommerce"
                className="inline-flex items-center px-4 py-2 border border-purple-600 dark:border-purple-500 rounded-md shadow-sm text-sm font-medium text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                WooCommerce
              </Link>
              <Link
                to="/products/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 ml-2" />
                إضافة منتج جديد
              </Link>
            </div>
          </div>
          <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد منتجات</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">ابدأ بإضافة منتجك الأول</p>
          <Link
            to="/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة منتج جديد
          </Link>
        </div>
      )}

      {/* Products Table View */}
      {!isLoading && !error && products.length > 0 && viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-right">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      المنتج
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      السعر
                      <SortIcon field="price" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center gap-1">
                      المخزون
                      <SortIcon field="stock" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      آخر تحديث
                      <SortIcon field="updatedAt" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const isEditing = editingProduct === product.id;
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedProducts.has(product.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`/products/${product.id}`}
                          className="flex items-center hover:opacity-80 transition-opacity"
                        >
                          <div className="flex-shrink-0 h-12 w-12">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-12 w-12 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${product.images && product.images.length > 0 ? 'hidden' : ''}`}>
                              <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{product.category}</div>
                          </div>
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                          />
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white">{formatPrice(product.price)}</div>
                            {product.comparePrice && (
                              <div className="text-sm text-gray-500 line-through">
                                {formatPrice(product.comparePrice)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                          />
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white">{product.stock} قطعة</div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
                              {getStockStatusText(stockStatus)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {product.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveQuickEdit(product.id)}
                                className="text-green-600 hover:text-green-900"
                                title="حفظ"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelQuickEdit}
                                className="text-red-600 hover:text-red-900"
                                title="إلغاء"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleView(product.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="عرض المنتج"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(product.id)}
                                className="text-green-600 hover:text-green-900"
                                title="تعديل المنتج"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => startQuickEdit(product)}
                                className="text-blue-600 hover:text-blue-900"
                                title="تعديل سريع"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(product)}
                                className="text-purple-600 hover:text-purple-900"
                                title="نسخ المنتج"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(product.id)}
                                className={`${product.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                                title={product.isActive ? 'إلغاء تفعيل المنتج' : 'تفعيل المنتج'}
                              >
                                {product.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-900"
                                title="حذف المنتج"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Grid View */}
      {!isLoading && !error && products.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${selectedProducts.has(product.id) ? 'ring-2 ring-indigo-500' : ''
                  }`}
              >
                <a href={`/products/${product.id}`} className="block">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded z-10"
                    />
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <span className={`absolute bottom-2 left-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {product.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SKU: {product.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-indigo-600">{formatPrice(product.price)}</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </a>
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={(e) => { e.preventDefault(); handleView(product.id); }}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="عرض"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.preventDefault(); handleEdit(product.id); }}
                          className="text-green-600 hover:text-green-900"
                          title="تعديل"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDuplicate(product); }}
                          className="text-purple-600 hover:text-purple-900"
                          title="نسخ"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDelete(product.id); }}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && sortedProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRightIcon className="h-5 w-5" />
              السابق
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              التالي
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                عرض <span className="font-medium">{startIndex + 1}</span> إلى{' '}
                <span className="font-medium">{hasActiveFilters ? Math.min(startIndex + itemsPerPage, sortedProducts.length) : Math.min(startIndex + itemsPerPage, totalItems)}</span> من{' '}
                <span className="font-medium">{hasActiveFilters ? sortedProducts.length : totalItems}</span> منتج
              </p>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
              >
                <option value={10}>10 لكل صفحة</option>
                <option value={25}>25 لكل صفحة</option>
                <option value={50}>50 لكل صفحة</option>
                <option value={100}>100 لكل صفحة</option>
              </select>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                        ? 'z-10 bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">استيراد منتجات من CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                قم برفع ملف CSV يحتوي على الأعمدة التالية:
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
                <li>الاسم (مطلوب)</li>
                <li>SKU</li>
                <li>السعر</li>
                <li>سعر المقارنة</li>
                <li>المخزون</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
