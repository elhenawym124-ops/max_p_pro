import React, { useState, useEffect } from 'react';
import {
    BuildingOfficeIcon,
    MapPinIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    InboxStackIcon
} from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useTranslation } from 'react-i18next';

interface Warehouse {
    id: string;
    name: string;
    location: string | null;
    type: string;
    capacity: number | null;
    isActive: boolean;
    createdAt: string;
}

const WarehouseManagement: React.FC = () => {
    const { t } = useTranslation();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        type: 'main',
        capacity: ''
    });

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const response = await companyAwareApi.get('/warehouses');
            if (response.data.success) {
                setWarehouses(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                capacity: formData.capacity ? parseInt(formData.capacity) : null
            };

            if (editingWarehouse) {
                await companyAwareApi.put(`/warehouses/${editingWarehouse.id}`, data);
            } else {
                await companyAwareApi.post('/warehouses', data);
            }

            setShowModal(false);
            setEditingWarehouse(null);
            setFormData({ name: '', location: '', type: 'main', capacity: '' });
            fetchWarehouses();
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشل في حفظ المخزن');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;
        try {
            const response = await companyAwareApi.delete(`/warehouses/${id}`);
            if (response.data.success) {
                fetchWarehouses();
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشل في حذف المخزن');
        }
    };

    const handleEdit = (warehouse: Warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name,
            location: warehouse.location || '',
            type: warehouse.type,
            capacity: warehouse.capacity?.toString() || ''
        });
        setShowModal(true);
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                        إدارة المخازن
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">إدارة مواقع التخزين والمستودعات الخاصة بك</p>
                </div>
                <button
                    onClick={() => {
                        setEditingWarehouse(null);
                        setFormData({ name: '', location: '', type: 'main', capacity: '' });
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <PlusIcon className="h-5 w-5" />
                    إضافة مخزن جديد
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((warehouse) => (
                        <div key={warehouse.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                                    <InboxStackIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(warehouse)}
                                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                    >
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(warehouse.id)}
                                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{warehouse.name}</h3>
                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-4">
                                <MapPinIcon className="h-4 w-4 mr-1 ml-1" />
                                {warehouse.location || 'لا يوجد موقع محدد'}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-700">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${warehouse.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {warehouse.isActive ? 'نشط' : 'غير نشط'}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    السعة: {warehouse.capacity || 'غير محدد'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {warehouses.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <BuildingOfficeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">لا توجد مخازن حالياً</h3>
                            <p className="text-gray-400 dark:text-gray-500">ابدأ بإضافة أول مخزن لشركتك</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                {editingWarehouse ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المخزن *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="مثال: المخزن الرئيسي"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموقع / العنوان</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="مثال: مدينة نصر، القاهرة"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                        <option value="main">رئيسي</option>
                                        <option value="cold">تبريد</option>
                                        <option value="secondary">فرعي</option>
                                        <option value="fulfillment">شحن</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعة القصوى</label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="1000"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                                >
                                    {editingWarehouse ? 'حفظ التغييرات' : 'إضافة المخزن'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseManagement;
