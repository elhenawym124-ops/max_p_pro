import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';

const AssetCategories: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await companyAwareApi.get('/assets/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.name.trim()) return;

        setAdding(true);
        try {
            const response = await companyAwareApi.post('/assets/categories', newCategory);
            if (response.data.success) {
                setNewCategory({ name: '', description: '' });
                fetchCategories();
            }
        } catch (error) {
            console.error('Error creating category:', error);
            alert('فشل في إضافة التصنيف');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

        try {
            const response = await companyAwareApi.delete(`/assets/categories/${id}`);
            if (response.data.success) {
                fetchCategories();
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('فشل في حذف التصنيف. قد يكون مرتبطاً بأصول.');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List */}
            <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">التصنيفات الحالية</h3>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        لا توجد تصنيفات
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {categories.map((cat) => (
                            <div key={cat.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</h4>
                                    {cat.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cat.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">عدد الأصول: {cat._count?.assets || 0}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full"
                                    title="حذف"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Form */}
            <div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إضافة تصنيف جديد</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                rows={3}
                                value={newCategory.description}
                                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {adding ? 'جاري الإضافة...' : 'إضافة التصنيف'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssetCategories;
