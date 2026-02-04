import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';

interface AssetAssignmentModalProps {
    asset: any;
    type: 'assign' | 'return';
    onClose: () => void;
    onSuccess: () => void;
}

const AssetAssignmentModal: React.FC<AssetAssignmentModalProps> = ({ asset, type, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        employeeId: '',
        assignedAt: new Date().toISOString().split('T')[0],
        returnedAt: new Date().toISOString().split('T')[0],
        returnCondition: asset.condition || 'GOOD',
        notes: '',
    });

    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (type === 'assign') {
            fetchEmployees();
        }
    }, [type]);

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            // Need an endpoint to fetch active employees
            // Using existing /hr/employees endpoint
            const response = await companyAwareApi.get('/hr/employees');
            if (response.data.success) {
                // Backend returns strictly { employees: [], pagination: {} }
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
            if (type === 'assign') {
                await companyAwareApi.post('/assets/assign', {
                    assetId: asset.id,
                    employeeId: formData.employeeId,
                    assignedAt: formData.assignedAt,
                    notes: formData.notes
                });
            } else {
                await companyAwareApi.post('/assets/return', {
                    assetId: asset.id,
                    returnedAt: formData.returnedAt,
                    returnCondition: formData.returnCondition,
                    notes: formData.notes
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                {type === 'assign' ? 'تسليم عهدة' : 'استرجاع عهدة'} - {asset.name}
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
                            {type === 'assign' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            الموظف <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.employeeId}
                                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            disabled={loadingEmployees}
                                        >
                                            <option value="">
                                                {loadingEmployees ? 'جاري التحميل...' : 'اختر الموظف'}
                                            </option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                                                </option>
                                            ))}
                                        </select>
                                        {!loadingEmployees && employees.length === 0 && (
                                            <p className="mt-1 text-xs text-amber-500">
                                                ⚠️ لم يتم العثور على موظفين. يرجى التأكد من إضافة الموظفين في نظام HR أولاً.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ التسليم</label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={formData.assignedAt}
                                            onChange={(e) => setFormData({ ...formData, assignedAt: e.target.value })}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-700">
                                        عهدة لدى: {asset.currentHolder?.firstName} {asset.currentHolder?.lastName}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الاسترجاع</label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={formData.returnedAt}
                                            onChange={(e) => setFormData({ ...formData, returnedAt: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حالة الأصل عند الاسترجاع</label>
                                        <select
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={formData.returnCondition}
                                            onChange={(e) => setFormData({ ...formData, returnCondition: e.target.value })}
                                        >
                                            <option value="NEW">جديد</option>
                                            <option value="GOOD">جيد</option>
                                            <option value="FAIR">مقبول</option>
                                            <option value="POOR">سيء</option>
                                            <option value="DAMAGED">تالف</option>
                                        </select>
                                    </div>
                                </>
                            )}

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
                                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${type === 'assign' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}
                                >
                                    {loading ? 'جاري الحفظ...' : (type === 'assign' ? 'تأكيد التسليم' : 'تأكيد الاسترجاع')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetAssignmentModal;
