import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  FolderIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive?: boolean;
  sortOrder?: number;
  displayType?: string;
  metaTitle?: string;
  metaDescription?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
  productCount?: number;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
  isActive: boolean;
  sortOrder: number;
  displayType: string;
  metaTitle: string;
  metaDescription: string;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { formatDate } = useDateFormat();

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
    isActive: true,
    sortOrder: 0,
    displayType: 'default',
    metaTitle: '',
    metaDescription: ''
  });

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading categories...');

      const response = await apiClient.get('/products/categories');
      console.log('📦 Categories response:', response);
      console.log('📦 Response status:', response.status);
      console.log('📦 Response headers:', response.headers);

      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Categories loaded (direct array):', response.data.length);
        setCategories(response.data);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        console.log('✅ Categories loaded (nested data):', response.data.data.length);
        setCategories(response.data.data);
      } else {
        console.log('❌ No categories found in response:', response.data);
        setCategories([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading categories:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);

      // More specific error messages
      let errorMessage = 'فشل في تحميل الفئات';

      if (error.response?.status === 401) {
        errorMessage = 'يجب تسجيل الدخول مرة أخرى';
      } else if (error.response?.status === 403) {
        errorMessage = 'ليس لديك صلاحية للوصول لهذه البيانات';
      } else if (error.response?.status === 500) {
        errorMessage = 'خطأ في الخادم - يرجى المحاولة لاحقاً';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Create category
  const createCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('اسم الفئة مطلوب');
      return;
    }

    try {
      const response = await apiClient.post('/products/categories', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim() || undefined,
        image: formData.image || undefined,
        parentId: formData.parentId || undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        displayType: formData.displayType,
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined
      });

      if (response.data.success) {
        toast.success('تم إنشاء الفئة بنجاح');
        setShowCreateModal(false);
        resetFormData();
        loadCategories();
      }
    } catch (error: any) {
      console.error('❌ Error creating category:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل في إنشاء الفئة';
      toast.error(errorMessage);
    }
  };

  // Update category
  const updateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      toast.error('اسم الفئة مطلوب');
      return;
    }

    try {
      const response = await apiClient.put(`/products/categories/${editingCategory.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim() || undefined,
        image: formData.image || undefined,
        parentId: formData.parentId || undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        displayType: formData.displayType,
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined
      });

      if (response.data.success) {
        toast.success('تم تحديث الفئة بنجاح');
        setShowEditModal(false);
        setEditingCategory(null);
        resetFormData();
        loadCategories();
      }
    } catch (error: any) {
      console.error('❌ Error updating category:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل في تحديث الفئة';
      toast.error(errorMessage);
    }
  };

  // Delete category
  const deleteCategory = async (categoryId: string, categoryName: string) => {
    const category = categories.find(c => c.id === categoryId);

    if (category && getProductCount(category) > 0) {
      toast.error(`لا يمكن حذف الفئة "${categoryName}" لأنها تحتوي على ${getProductCount(category)} منتج`);
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف الفئة "${categoryName}"؟`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/products/categories/${categoryId}`);

      if (response.data.success) {
        toast.success('تم حذف الفئة بنجاح');
        loadCategories();
      }
    } catch (error: any) {
      console.error('❌ Error deleting category:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل في حذف الفئة';
      toast.error(errorMessage);
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[\u0600-\u06FF]/g, (char) => char) // Keep Arabic
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '')
      .replace(/--+/g, '-')
      .trim();
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      parentId: '',
      isActive: true,
      sortOrder: 0,
      displayType: 'default',
      metaTitle: '',
      metaDescription: ''
    });
  };

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || '',
      isActive: category.isActive !== false,
      sortOrder: category.sortOrder || 0,
      displayType: category.displayType || 'default',
      metaTitle: category.metaTitle || '',
      metaDescription: category.metaDescription || ''
    });
    setShowEditModal(true);
  };

  // Clean up duplicates
  const cleanupDuplicates = async () => {
    if (!confirm('هل أنت متأكد من تنظيف الفئات المكررة؟ سيتم حذف الفئات الفارغة والمكررة.')) {
      return;
    }

    try {
      const response = await apiClient.post('/products/categories/cleanup');

      if (response.data.success) {
        toast.success('تم تنظيف الفئات بنجاح');
        loadCategories();
      }
    } catch (error: any) {
      console.error('❌ Error cleaning up categories:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل في تنظيف الفئات';
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    try {
      loadCategories();
    } catch (error) {
      console.error('❌ Error in useEffect:', error);
      toast.error('فشل في تحميل الصفحة');
    }
  }, []);

  // Get category statistics
  const getProductCount = (category: Category) => {
    return category._count?.products || category.productCount || 0;
  };

  const stats = {
    total: categories.length,
    withProducts: categories.filter(c => getProductCount(c) > 0).length,
    empty: categories.filter(c => getProductCount(c) === 0).length,
    duplicates: categories.filter((cat, index, arr) =>
      arr.findIndex(c => c.name === cat.name) !== index
    ).length
  };

  console.log('📊 Categories stats:', stats);
  console.log('📋 Categories data:', categories);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <TagIcon className="h-8 w-8 text-indigo-600 ml-3" />
            إدارة فئات المنتجات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">تنظيم وإدارة فئات المنتجات</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          {stats.duplicates > 0 && (
            <button
              onClick={cleanupDuplicates}
              className="inline-flex items-center px-4 py-2 border border-orange-300 dark:border-orange-800 rounded-md shadow-sm text-sm font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
            >
              <ExclamationTriangleIcon className="h-4 w-4 ml-2" />
              تنظيف المكررات ({stats.duplicates})
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            فئة جديدة
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700 transition-all hover:shadow-md">
          <div className="flex items-center">
            <FolderIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي الفئات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700 transition-all hover:shadow-md">
          <div className="flex items-center">
            <TagIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">فئات بمنتجات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700 transition-all hover:shadow-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">فئات فارغة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.empty}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700 transition-all hover:shadow-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">فئات مكررة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.duplicates}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    اسم الفئة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الوصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    عدد المنتجات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr key={category.id} className={`${getProductCount(category) === 0 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TagIcon className="h-5 w-5 text-gray-400 ml-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {category.id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {category.description || 'لا يوجد وصف'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProductCount(category) > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                        {getProductCount(category)} منتج
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {category.createdAt ? formatDate(category.createdAt) : 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="تعديل الفئة"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id, category.name)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف الفئة"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <TagIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">لا توجد فئات</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ابدأ بإنشاء فئة جديدة لتنظيم منتجاتك</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 ml-2" />
                    فئة جديدة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
                {showEditModal ? `تعديل الفئة: ${editingCategory?.name}` : 'إنشاء فئة جديدة'}
              </h3>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      اسم الفئة *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="أدخل اسم الفئة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug (للرابط)
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="category-name"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">سيتم إنشاؤه تلقائياً إذا تركته فارغاً</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="وصف الفئة (اختياري)"
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    صورة الفئة
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.image && (
                      <img src={formData.image} alt="Category" className="w-16 h-16 object-cover rounded-lg border dark:border-gray-600" />
                    )}
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="رابط الصورة"
                    />
                  </div>
                </div>

                {/* Parent & Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الفئة الأب
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">بدون (فئة رئيسية)</option>
                      {categories
                        .filter(c => c.id !== editingCategory?.id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نوع العرض
                    </label>
                    <select
                      value={formData.displayType}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="default">افتراضي</option>
                      <option value="products">المنتجات فقط</option>
                      <option value="subcategories">الفئات الفرعية فقط</option>
                      <option value="both">المنتجات والفئات الفرعية</option>
                    </select>
                  </div>
                </div>

                {/* Sort & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ترتيب العرض
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الأرقام الأصغر تظهر أولاً</p>
                  </div>

                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="mr-2 block text-sm text-gray-900 dark:text-white">
                      الفئة نشطة ومرئية
                    </label>
                  </div>
                </div>

                {/* SEO Section */}
                <div className="border-t dark:border-gray-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">🔍 إعدادات SEO</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        عنوان SEO
                      </label>
                      <input
                        type="text"
                        value={formData.metaTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="عنوان يظهر في نتائج البحث"
                        maxLength={60}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.metaTitle.length}/60 حرف</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        وصف SEO
                      </label>
                      <textarea
                        value={formData.metaDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="وصف يظهر في نتائج البحث"
                        maxLength={160}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.metaDescription.length}/160 حرف</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse mt-6 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingCategory(null);
                    resetFormData();
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={showEditModal ? updateCategory : createCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {showEditModal ? 'حفظ التغييرات' : 'إنشاء'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
