import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';

interface AssetFormProps {
    initialData?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ initialData, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        categoryId: '',
        code: '',
        serialNumber: '',
        model: '',
        brand: '',
        status: 'AVAILABLE',
        condition: 'NEW',
        purchaseDate: '',
        purchaseValue: '',
        location: '',
        notes: '',
        warrantyStartDate: '',
        warrantyEndDate: '',
        warrantyMonths: '',
        warrantyProvider: '',
        supplierName: '',
        supplierMobile: '',
        supplierAddress: '',
        assignedToId: '',
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
        fetchEmployees();
        if (initialData) {
            setFormData({
                name: (initialData.name as string) || '',
                categoryId: (initialData.categoryId as string) || '',
                code: (initialData.code as string) || '',
                serialNumber: (initialData.serialNumber as string) || '',
                model: (initialData.model as string) || '',
                brand: (initialData.brand as string) || '',
                status: (initialData.status as string) || 'AVAILABLE',
                condition: (initialData.condition as string) || 'NEW',
                purchaseDate: (initialData as any).purchaseDate ? new Date((initialData as any).purchaseDate).toISOString().split('T')[0] : '',
                purchaseValue: (initialData as any).purchaseValue || '',
                location: (initialData as any).location || '',
                notes: (initialData as any).notes || '',
                warrantyStartDate: (initialData as any).warrantyStartDate ? new Date((initialData as any).warrantyStartDate).toISOString().split('T')[0] : '',
                warrantyEndDate: (initialData as any).warrantyEndDate ? new Date((initialData as any).warrantyEndDate).toISOString().split('T')[0] : '',
                warrantyMonths: (initialData.warrantyMonths as string) || '',
                warrantyProvider: (initialData.warrantyProvider as string) || '',
                supplierName: (initialData.supplierName as string) || '',
                supplierMobile: (initialData.supplierMobile as string) || '',
                supplierAddress: (initialData.supplierAddress as string) || '',
                assignedToId: (initialData.assignedToId as string) || '',
            });
        }
    }, [initialData]);

    const fetchCategories = async () => {
        try {
            const response = await companyAwareApi.get('/assets/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await companyAwareApi.get('/procurement/suppliers');
            if (response.data.suppliers) {
                setSuppliers(response.data.suppliers);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const response = await companyAwareApi.get('/hr/employees');
            if (response.data.success) {
                setEmployees(response.data.employees || response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (initialData) {
                await companyAwareApi.put(`/assets/${initialData.id}`, {
                    ...formData,
                    warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths.toString()) : null,
                });
            } else {
                await companyAwareApi.post('/assets', {
                    ...formData,
                    warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths.toString()) : null,
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                {initialData ? 'تعديل بيانات الأصل' : 'إضافة أصل جديد'}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الأصل *</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التصنيف</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="">اختر التصنيف</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">كود الأصل (Tag ID)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرقم التسلسلي (S/N)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.serialNumber}
                                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموديل</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الماركة (Brand)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    >
                                        <option value="NEW">جديد</option>
                                        <option value="GOOD">جيد</option>
                                        <option value="FAIR">مقبول</option>
                                        <option value="POOR">سيء</option>
                                        <option value="DAMAGED">تالف</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموقع الحالي</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="مثال: المكتب الرئيسي"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الشراء</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.purchaseDate}
                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">قيمة الشراء</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.purchaseValue}
                                        onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-bold">الموظف المسؤول (اختياري)</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.assignedToId}
                                        onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                                        disabled={loadingEmployees}
                                    >
                                        <option value="">{loadingEmployees ? 'جاري تحميل الموظفين...' : '--- غير مخصص لموظف حالياً ---'}</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeNumber || 'بدون رقم'})
                                            </option>
                                        ))}
                                    </select>
                                    {!loadingEmployees && employees.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-500">⚠️ لم يتم العثور على موظفين في سجلات HR</p>
                                    )}
                                </div>

                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">بيانات المورد والضمان</h4>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المورد</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.supplierName}
                                        onChange={(e) => {
                                            const selected = suppliers.find(s => s.name === e.target.value);
                                            setFormData({
                                                ...formData,
                                                supplierName: e.target.value,
                                                supplierMobile: selected?.mobile || '',
                                                supplierAddress: selected?.address || ''
                                            });
                                        }}
                                    >
                                        <option value="">اختر المورد...</option>
                                        {suppliers.map((s: any) => (
                                            <option key={s.id} value={s.name}>
                                                {s.name} {s.mobile ? ` | 📱 ${s.mobile}` : ''} {s.address ? ` | 📍 ${s.address}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.supplierName && (
                                        <div className="mt-2 flex space-x-4 space-x-reverse text-xs text-gray-500 dark:text-gray-400 italic">
                                            {formData.supplierMobile && <span>📱 {formData.supplierMobile}</span>}
                                            {formData.supplierAddress && <span>📍 {formData.supplierAddress}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">بيانات الضمان</h4>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ انتهاء الضمان</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.warrantyEndDate}
                                        onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مدة الضمان (بالأشهر)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={formData.warrantyMonths}
                                        onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                                        placeholder="مثال: 12"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                                <textarea
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-3"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {loading ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetForm;
