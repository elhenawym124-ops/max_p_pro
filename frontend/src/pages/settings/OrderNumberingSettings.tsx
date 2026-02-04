import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';
import toast from 'react-hot-toast';
import {
    Cog6ToothIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface OrderSettings {
    enableSequentialOrders: boolean;
    orderPrefix: string;
    nextOrderNumber: number;
    orderNumberFormat: string;
}

const OrderNumberingSettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<OrderSettings>({
        enableSequentialOrders: false,
        orderPrefix: 'ORD',
        nextOrderNumber: 1,
        orderNumberFormat: 'PREFIX-XXXXXX',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetNumber, setResetNumber] = useState('');
    const [previewNumber, setPreviewNumber] = useState('ORD-000001');
    const [applyToPastOrders, setApplyToPastOrders] = useState(false);

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    // Update preview when settings change
    useEffect(() => {
        updatePreview();
    }, [settings.orderPrefix, settings.nextOrderNumber]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/order-settings');
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Error toast is handled by apiClient
        } finally {
            setLoading(false);
        }
    };

    const updatePreview = () => {
        const paddedNumber = settings.nextOrderNumber.toString();
        setPreviewNumber(`${settings.orderPrefix}-${paddedNumber}`);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await apiClient.put('/order-settings', {
                ...settings,
                applyToPastOrders
            });
            if (response.data.success) {
                toast.success(t('orderNumbering.saveSuccess') || 'تم حفظ الإعدادات بنجاح ✅');
                fetchSettings(); // Refresh to get latest state
            }
        } catch (error: any) {
            console.error('Error saving settings:', error);
            // Error toast is handled by apiClient
        } finally {
            setSaving(false);
        }
    };

    const handleResetCounter = async () => {
        const newNumber = parseInt(resetNumber);

        if (!resetNumber || newNumber < 1) {
            toast.error(t('orderNumbering.invalidNumber') || 'الرجاء إدخال رقم صحيح (1 أو أكثر)');
            return;
        }

        if (!window.confirm(`هل أنت متأكد من إعادة تعيين العداد إلى ${newNumber}؟\nسيبدأ الرقم التالي من ${newNumber}`)) {
            return;
        }

        try {
            setSaving(true);
            const response = await apiClient.post('/order-settings/reset-counter', {
                newStartNumber: newNumber
            });

            if (response.data.success) {
                toast.success(t('orderNumbering.resetSuccess') || `تم إعادة تعيين العداد بنجاح ✅\nالرقم التالي: ${newNumber}`);
                setResetNumber('');
                fetchSettings();
            }
        } catch (error: any) {
            console.error('Error resetting counter:', error);
            // Error toast is handled by apiClient
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Main Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    الإعدادات الأساسية
                </h2>

                {/* Enable Sequential Numbering */}
                <div className="mb-6">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enableSequentialOrders}
                            onChange={(e) =>
                                setSettings({ ...settings, enableSequentialOrders: e.target.checked })
                            }
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="mr-3 text-gray-900 dark:text-gray-100 font-medium">
                            تفعيل الترقيم التسلسلي
                        </span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mr-8 mt-1">
                        عند التفعيل، ستبدأ أرقام الطلبات من 1 وتزيد تلقائياً (ORD-1, ORD-2, ...)
                    </p>
                </div>

                {/* Order Prefix */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        البادئة (Prefix)
                    </label>
                    <input
                        type="text"
                        value={settings.orderPrefix}
                        onChange={(e) => setSettings({ ...settings, orderPrefix: e.target.value.toUpperCase() })}
                        maxLength={10}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="ORD"
                        disabled={!settings.enableSequentialOrders}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        الأحرف أو الكلمة التي تظهر قبل الرقم (حد أقصى 10 أحرف)
                    </p>
                </div>

                {/* Next Order Number */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الرقم التالي
                    </label>
                    <input
                        type="number"
                        value={settings.nextOrderNumber}
                        onChange={(e) =>
                            setSettings({ ...settings, nextOrderNumber: parseInt(e.target.value) || 1 })
                        }
                        min="1"
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        disabled={!settings.enableSequentialOrders}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        الرقم الذي سيتم استخدامه للطلب القادم
                    </p>
                </div>

                {/* Preview */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            معاينة رقم الطلب القادم:
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {settings.enableSequentialOrders ? previewNumber : 'ORD-173719-456 (عشوائي)'}
                    </div>
                </div>

                {/* Apply To Option */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        نطاق تطبيق التعديلات:
                    </label>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center cursor-pointer group">
                            <input
                                type="radio"
                                name="applyScope"
                                checked={!applyToPastOrders}
                                onChange={() => setApplyToPastOrders(false)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="mr-3">
                                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                    تطبيق على الطلبات الجديدة فقط (من الآن)
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                    الطلبات السابقة ستحتفظ بأرقامها القديمة دون تغيير
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center cursor-pointer group">
                            <input
                                type="radio"
                                name="applyScope"
                                checked={applyToPastOrders}
                                onChange={() => setApplyToPastOrders(true)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="mr-3">
                                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                    تطبيق على كافة الطلبات (الكل)
                                </span>
                                <span className="block text-xs text-amber-600 dark:text-amber-400">
                                    ⚠️ سيتم تحديث أرقام كافة الطلبات السابقة لتتوافق مع البادئة والترقيم الجديد
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-5 h-5" />
                                حفظ الإعدادات
                            </>
                        )}
                    </button>
                </div>

                {/* Reset Counter Card */}
                {settings.enableSequentialOrders && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <ArrowPathIcon className="w-5 h-5" />
                            إعادة تعيين العداد
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            يمكنك إعادة تعيين العداد لبدء الترقيم من رقم معين. استخدم هذه الميزة بحذر.
                        </p>

                        <div className="flex items-end gap-3">
                            <div className="flex-1 max-w-xs">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    الرقم الجديد
                                </label>
                                <input
                                    type="number"
                                    value={resetNumber}
                                    onChange={(e) => setResetNumber(e.target.value)}
                                    min="1"
                                    placeholder="مثال: 100"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <button
                                onClick={handleResetCounter}
                                disabled={saving || !resetNumber}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowPathIcon className="w-5 h-5 inline ml-2" />
                                إعادة تعيين
                            </button>
                        </div>

                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ <strong>تحذير:</strong> إعادة تعيين العداد قد يؤدي إلى تكرار أرقام الطلبات إذا كانت موجودة بالفعل في النظام.
                                تأكد من اختيار رقم أكبر من آخر رقم طلب حالي.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderNumberingSettings;
