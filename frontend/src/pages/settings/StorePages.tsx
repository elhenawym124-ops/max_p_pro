import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { getApiUrl } from '../../config/environment';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface StorePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  isActive: boolean;
  showInFooter: boolean;
  showInMenu: boolean;
  order: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_TYPES = {
  SHIPPING_POLICY: 'سياسة الشحن',
  RETURN_POLICY: 'سياسة الإرجاع',
  REFUND_POLICY: 'سياسة الاسترجاع المالي',
  PRIVACY_POLICY: 'سياسة الخصوصية',
  TERMS_CONDITIONS: 'الشروط والأحكام',
  ABOUT_US: 'عن المتجر',
  CONTACT_US: 'اتصل بنا',
  FAQ: 'الأسئلة الشائعة',
  PAYMENT_METHODS: 'طرق الدفع',
  CUSTOM: 'صفحة مخصصة',
};

const StorePages: React.FC = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    pageType: 'CUSTOM',
    isActive: true,
    showInFooter: true,
    showInMenu: false,
    order: 0,
    metaTitle: '',
    metaDescription: '',
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/store-pages/list?includeInactive=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: user?.companyId }),
      });
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPages = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/store-pages/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: user?.companyId }),
      });
      const data = await response.json();
      if (data.success) {
        alert('تم إنشاء الصفحات الافتراضية بنجاح!');
        fetchPages();
      } else {
        alert(data.error || 'فشل في إنشاء الصفحات');
      }
    } catch (error) {
      console.error('Error initializing pages:', error);
      alert('حدث خطأ أثناء إنشاء الصفحات');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingPage
        ? `${getApiUrl()}/store-pages/page/${editingPage.id}`
        : `${getApiUrl()}/store-pages/`;

      const response = await fetch(url, {
        method: editingPage ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, companyId: user?.companyId }),
      });

      const data = await response.json();
      if (data.success) {
        alert(editingPage ? 'تم تحديث الصفحة بنجاح!' : 'تم إنشاء الصفحة بنجاح!');
        setShowModal(false);
        resetForm();
        fetchPages();
      } else {
        alert(data.error || 'فشل في حفظ الصفحة');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      alert('حدث خطأ أثناء حفظ الصفحة');
    }
  };

  const handleEdit = (page: StorePage) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      pageType: page.pageType,
      isActive: page.isActive,
      showInFooter: page.showInFooter,
      showInMenu: page.showInMenu,
      order: page.order,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/store-pages/page/${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: user?.companyId }),
      });

      const data = await response.json();
      if (data.success) {
        alert('تم حذف الصفحة بنجاح!');
        fetchPages();
      } else {
        alert(data.error || 'فشل في حذف الصفحة');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('حدث خطأ أثناء حذف الصفحة');
    }
  };

  const toggleStatus = async (pageId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/store-pages/page/${pageId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: user?.companyId }),
      });

      const data = await response.json();
      if (data.success) {
        fetchPages();
      } else {
        alert(data.error || 'فشل في تغيير حالة الصفحة');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('حدث خطأ أثناء تغيير حالة الصفحة');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      pageType: 'CUSTOM',
      isActive: true,
      showInFooter: true,
      showInMenu: false,
      order: 0,
      metaTitle: '',
      metaDescription: '',
    });
    setEditingPage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
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
              <DocumentTextIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              صفحات المتجر
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة صفحات المتجر (سياسات، معلومات، إلخ)</p>
          </div>
          <div className="flex space-x-3 space-x-reverse">
            {pages.length === 0 && (
              <button
                onClick={initializeDefaultPages}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                إنشاء الصفحات الافتراضية
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة صفحة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* Pages List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        {pages.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">لا توجد صفحات</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ابدأ بإنشاء الصفحات الافتراضية أو أضف صفحة جديدة</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  العنوان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الرابط
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{page.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {PAGE_TYPES[page.pageType as keyof typeof PAGE_TYPES]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    /{page.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${page.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                    >
                      {page.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => toggleStatus(page.id)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        title={page.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                      >
                        {page.isActive ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(page)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="تعديل"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border dark:border-gray-700 w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                {editingPage ? 'تعديل الصفحة' : 'إضافة صفحة جديدة'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      عنوان الصفحة *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الرابط (Slug) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="shipping-policy"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الصفحة
                  </label>
                  <select
                    value={formData.pageType}
                    onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(PAGE_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المحتوى *
                  </label>
                  <textarea
                    required
                    rows={10}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="يمكنك استخدام HTML"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                    />
                    <label htmlFor="isActive" className="mr-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                      نشط
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showInFooter"
                      checked={formData.showInFooter}
                      onChange={(e) => setFormData({ ...formData, showInFooter: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                    />
                    <label htmlFor="showInFooter" className="mr-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                      عرض في الفوتر
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showInMenu"
                      checked={formData.showInMenu}
                      onChange={(e) => setFormData({ ...formData, showInMenu: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                    />
                    <label htmlFor="showInMenu" className="mr-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                      عرض في القائمة
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-transparent dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {editingPage ? 'تحديث' : 'إنشاء'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePages;

