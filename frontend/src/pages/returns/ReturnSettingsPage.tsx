import React, { useState, useEffect } from 'react';
import { returnService, ReturnReason, ReturnReasonCategory } from '../../services/returnService';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, FolderPlus, Tag, Shield, CheckCircle, XCircle, Sparkles } from 'lucide-react';

const DEFAULT_DATA = [
    {
        name: 'عيوب صناعة',
        defaultRole: 'STORE',
        reasons: [
            { reason: 'المنتج تالف', description: 'المنتج وصل به كسر أو تلف واضح' },
            { reason: 'لا يعمل', description: 'المنتج لا يعمل عند التجربة الأولى' }
        ]
    },
    {
        name: 'مشاكل الشحن',
        defaultRole: 'SHIPPING',
        reasons: [
            { reason: 'تلف أثناء الشحن', description: 'الكرتونة الخارجية ممزقة والمنتج متضرر' },
            { reason: 'تأخير في التوصيل', description: 'وصل بعد الموعد المحدد بكثير' }
        ]
    },
    {
        name: 'أسباب العميل',
        defaultRole: 'CUSTOMER',
        reasons: [
            { reason: 'غير مناسب', description: 'المقاس أو اللون غير مناسب' },
            { reason: 'لم يعد بحاجة إليه', description: 'العميل غير رأيه' }
        ]
    }
];

const ReturnSettingsPage: React.FC = () => {
    const [categories, setCategories] = useState<ReturnReasonCategory[]>([]);
    const [reasons, setReasons] = useState<ReturnReason[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ReturnReasonCategory | null>(null);
    const [editingReason, setEditingReason] = useState<ReturnReason | null>(null);

    const [categoryName, setCategoryName] = useState('');
    const [defaultRole, setDefaultRole] = useState<'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER'>('OTHER');

    const [reasonText, setReasonText] = useState('');
    const [reasonDesc, setReasonDesc] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, resRes] = await Promise.all([
                returnService.getCategories(),
                returnService.getReasons()
            ]);
            setCategories(catRes.data);
            setReasons(resRes.data);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addDefaults = async () => {
        if (!confirm('سيتم إضافة بيانات افتراضية. هل أنت متأكد؟')) return;
        setLoading(true);
        try {
            for (const catData of DEFAULT_DATA) {
                // Create Category
                const catRes = await returnService.createCategory({
                    name: catData.name,
                    defaultRole: catData.defaultRole as any
                });
                const catId = catRes.data.id;

                // Create Reasons for this category
                for (const reasonData of catData.reasons) {
                    await returnService.createReason({
                        reason: reasonData.reason,
                        description: reasonData.description,
                        categoryId: catId
                    });
                }
            }
            toast.success('تم إضافة البيانات الافتراضية بنجاح');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('فشل في إضافة البيانات الافتراضية');
            setLoading(false);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await returnService.updateCategory(editingCategory.id, { name: categoryName, defaultRole });
                toast.success('تم تحديث التصنيف');
            } else {
                await returnService.createCategory({ name: categoryName, defaultRole });
                toast.success('تم إنشاء التصنيف');
            }
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setCategoryName('');
            fetchData();
        } catch (error) {
            toast.error('فشل في الحفظ');
        }
    };

    const handleSaveReason = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingReason) {
                await returnService.updateReason(editingReason.id, {
                    reason: reasonText,
                    description: reasonDesc,
                    categoryId: selectedCategoryId
                });
                toast.success('تم تحديث السبب');
            } else {
                await returnService.createReason({
                    reason: reasonText,
                    description: reasonDesc,
                    categoryId: selectedCategoryId
                });
                toast.success('تم إنشاء السبب');
            }
            setIsReasonModalOpen(false);
            setEditingReason(null);
            setReasonText('');
            setReasonDesc('');
            setSelectedCategoryId('');
            fetchData();
        } catch (error) {
            toast.error('فشل في الحفظ');
        }
    };

    const deleteReason = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا السبب؟')) return;
        try {
            await returnService.deleteReason(id);
            toast.success('تم الحذف');
            fetchData();
        } catch (error) {
            toast.error('فشل في الحذف');
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إعدادات المرتجعات</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">إدارة تصنيفات وأسباب الإرجاع والمسؤوليات</p>
                </div>
                <div className="flex gap-2">
                    {categories.length === 0 && (
                        <button
                            onClick={addDefaults}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                            <Sparkles size={18} /> اقتراحات ذكية
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryName('');
                            setDefaultRole('OTHER');
                            setIsCategoryModalOpen(true);
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <FolderPlus size={18} /> تصنيف جديد
                    </button>
                    <button
                        onClick={() => {
                            setEditingReason(null);
                            setReasonText('');
                            setReasonDesc('');
                            setSelectedCategoryId(categories[0]?.id || '');
                            setIsReasonModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} /> سبب جديد
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categories List */}
                <div className="lg:col-span-1">
                    <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <FolderPlus size={20} className="text-blue-500" /> التصنيفات (الجهات المسؤولة)
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                        ) : categories.length === 0 ? (
                            <div className="p-4 text-center text-gray-400">لا توجد تصنيفات</div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                            <Shield size={12} /> المسؤول الافتراضي: {cat.defaultRole}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingCategory(cat);
                                            setCategoryName(cat.name);
                                            setDefaultRole(cat.defaultRole);
                                            setIsCategoryModalOpen(true);
                                        }}
                                        className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Reasons List */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <Tag size={20} className="text-green-500" /> أسباب الإرجاع المتاحة
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">السبب</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">التصنيف</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</td></tr>
                                ) : reasons.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">لا توجد أسباب</td></tr>
                                ) : (
                                    reasons.map(reason => (
                                        <tr key={reason.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{reason.reason}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{reason.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                                                    {reason.category?.name || 'غير مصنف'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {reason.isActive ?
                                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs"><CheckCircle size={14} /> نشط</span> :
                                                    <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs"><XCircle size={14} /> معطل</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-left pl-6">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingReason(reason);
                                                            setReasonText(reason.reason);
                                                            setReasonDesc(reason.description || '');
                                                            setSelectedCategoryId(reason.categoryId || '');
                                                            setIsReasonModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => deleteReason(reason.id)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editingCategory ? 'تعديل تصنيف' : 'تصنيف جديد'}</h3>
                        <form onSubmit={handleSaveCategory}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم التصنيف (مثال: عيب صناعة)</label>
                                    <input
                                        type="text"
                                        required
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المسؤول الافتراضي عن هذا التصنيف</label>
                                    <select
                                        value={defaultRole}
                                        onChange={(e) => setDefaultRole(e.target.value as any)}
                                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="CUSTOMER">العميل (يؤثر على تقييمه)</option>
                                        <option value="STORE">المتجر (عيب فني/تغليف)</option>
                                        <option value="SHIPPING">شركة الشحن (تلف أثناء النقل)</option>
                                        <option value="OTHER">أخرى (بدون تأثير)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reason Modal */}
            {isReasonModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editingReason ? 'تعديل سبب' : 'سبب جديد'}</h3>
                        <form onSubmit={handleSaveReason}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السبب (مثال: القياس غير مناسب)</label>
                                    <input
                                        type="text"
                                        required
                                        value={reasonText}
                                        onChange={(e) => setReasonText(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التصنيف</label>
                                    <select
                                        required
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="">اختر تصنيفاً...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف إضافي</label>
                                    <textarea
                                        value={reasonDesc}
                                        onChange={(e) => setReasonDesc(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsReasonModalOpen(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReturnSettingsPage;
