import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';

const AssetSuppliers: React.FC = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSupplier, setNewSupplier] = useState({ name: '', mobile: '', address: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const response = await companyAwareApi.get('/procurement/suppliers');
            if (response.data.suppliers) {
                setSuppliers(response.data.suppliers);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplier.name.trim()) return;

        setAdding(true);
        try {
            const response = await companyAwareApi.post('/procurement/suppliers', newSupplier);
            if (response.data.success) {
                setNewSupplier({ name: '', mobile: '', address: '' });
                fetchSuppliers();
            }
        } catch (error) {
            console.error('Error creating supplier:', error);
            alert('فشل في إضافة المورد');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

        try {
            const response = await companyAwareApi.delete(`/procurement/suppliers/${id}`);
            if (response.data.success) {
                fetchSuppliers();
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert('فشل في حذف المورد. قد يكون مرتبطاً بطلبات شراء أو أصول.');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List */}
            <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">الموردون المسجلون</h3>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        لا يوجد موردون مسجلون بعد
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {suppliers.map((s) => (
                            <div key={s.id} className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</h4>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                        <PhoneIcon className="h-3 w-3 mr-1" />
                                        {s.mobile || 'غير مسجل'}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                        <MapPinIcon className="h-3 w-3 mr-1" />
                                        {s.address || 'لا يوجد عنوان'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
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
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إضافة مورد جديد</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المورد *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={newSupplier.name}
                                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                placeholder="مثال: شركة النصر للتكنولوجيا"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الموبايل</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={newSupplier.mobile}
                                onChange={(e) => setNewSupplier({ ...newSupplier, mobile: e.target.value })}
                                placeholder="01xxxxxxxxx"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                rows={2}
                                value={newSupplier.address}
                                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                placeholder="العنوان بالتفصيل..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all font-bold"
                        >
                            {adding ? 'جاري الإضافة...' : 'إضافة المورد'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssetSuppliers;
