import React, { useState, useEffect } from 'react';
import { Star, ShieldAlert, Award, AlertTriangle, Save, Loader } from 'lucide-react';
import { returnService } from '../../services/returnService';
import toast from 'react-hot-toast';

const RatingSettingsManager: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        excellentThreshold: 90,
        goodThreshold: 70,
        averageThreshold: 50,
        autoApproveExcellent: false,
        autoRejectBad: false
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await returnService.getSettings();
            setSettings({
                excellentThreshold: res.data.excellentThreshold ?? 90,
                goodThreshold: res.data.goodThreshold ?? 70,
                averageThreshold: res.data.averageThreshold ?? 50,
                autoApproveExcellent: res.data.autoApproveExcellent ?? false,
                autoRejectBad: res.data.autoRejectBad ?? false
            });
        } catch (error) {
            console.error(error);
            // Fallback just in case
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await returnService.updateSettings(settings);
            toast.success('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            toast.error('فشل حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">جاري تحميل الإعدادات...</div>;

    return (
        <div className="space-y-6" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Award className="h-5 w-5 text-gray-400" />
                            حدود التقييم
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            تحديد نسبة النجاح المطلوبة لكل تصنيف.
                        </p>
                    </div>
                </div>

                <div className="p-6 grid gap-6 md:grid-cols-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/50">
                        <div className="flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-300 font-bold">
                            <Star className="h-4 w-4 fill-purple-700 text-purple-700" />
                            ممتاز (Excellent)
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">&ge;</span>
                            <input
                                type="number"
                                value={settings.excellentThreshold}
                                onChange={(e) => handleChange('excellentThreshold', parseInt(e.target.value))}
                                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-purple-900 dark:text-white dark:bg-gray-700"
                            />
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">%</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300 font-bold">
                            <Star className="h-4 w-4 text-blue-700" />
                            جيد (Good)
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">&ge;</span>
                            <input
                                type="number"
                                value={settings.goodThreshold}
                                onChange={(e) => handleChange('goodThreshold', parseInt(e.target.value))}
                                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-blue-900 dark:text-white dark:bg-gray-700"
                            />
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">%</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200 font-bold">
                            <Star className="h-4 w-4 text-gray-700" />
                            متوسط (Average)
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">&ge;</span>
                            <input
                                type="number"
                                value={settings.averageThreshold}
                                onChange={(e) => handleChange('averageThreshold', parseInt(e.target.value))}
                                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-gray-900 dark:text-white dark:bg-gray-700"
                            />
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">%</span>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 text-xs text-gray-500 dark:text-gray-400">
                    * أي نسبة أقل من "متوسط" تعتبر "سيء" تلقائياً.
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-gray-400" />
                        الأتمتة (Automations)
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        إجراءات تلقائية بناءً على تقييم العملاء.
                    </p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">الموافقة التلقائية لـ "الممتازين"</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">قبول طلبات الإرجاع تلقائياً إذا كان العميل ممتاز.</p>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                checked={settings.autoApproveExcellent}
                                onChange={(e) => handleChange('autoApproveExcellent', e.target.checked)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoApproveExcellent ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></label>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">الرفض التلقائي/مراجعة يدوية لـ "السيئين"</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">تحويل طلبات العملاء السيئين للمراجعة اليدوية دائماً (Risk Protection).</p>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                checked={settings.autoRejectBad}
                                onChange={(e) => handleChange('autoRejectBad', e.target.checked)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoRejectBad ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                    {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                    حفظ التغييرات
                </button>
            </div>
        </div>
    );
};

export default RatingSettingsManager;
