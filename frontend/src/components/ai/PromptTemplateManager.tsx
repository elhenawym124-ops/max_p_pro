import React, { useState, useEffect } from 'react';
import {
    PencilIcon,
    ArrowPathIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../services/companyAwareApi';

interface PromptTemplate {
    key: string;
    content: string;
    description?: string;
    category: string;
    variables?: string | object;
    isActive: boolean;
    isDefault?: boolean;
}

const PromptTemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [disableDefaultTemplates, setDisableDefaultTemplates] = useState(false);

    useEffect(() => {
        fetchTemplates();
        fetchSettings();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await companyAwareApi.get('/ai/templates');
            if (response.data.success) {
                setTemplates(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            // Fallback or alert
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await companyAwareApi.get('/ai/response-rules');
            if (response.data.success && response.data.data) {
                setDisableDefaultTemplates(response.data.data.disableDefaultTemplates || false);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleToggleDefaultTemplates = async (checked: boolean) => {
        try {
            setDisableDefaultTemplates(checked);
            const response = await companyAwareApi.put('/ai/response-rules', {
                disableDefaultTemplates: checked
            });
            if (response.data.success) {
                alert(checked ? '✅ تم تعطيل القوالب الافتراضية' : '✅ تم تفعيل القوالب الافتراضية');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            setDisableDefaultTemplates(!checked);
            alert('❌ خطأ في حفظ الإعدادات');
        }
    };

    const handleEdit = (template: PromptTemplate) => {
        setSelectedTemplate(template);
        setEditContent(template.content);
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;

        try {
            setSaving(true);
            const response = await companyAwareApi.post('/ai/templates', {
                key: selectedTemplate.key,
                content: editContent,
                category: selectedTemplate.category,
                description: selectedTemplate.description,
                isActive: selectedTemplate.isActive
            });

            if (response.data.success) {
                // Update local list
                setTemplates(prev => prev.map(t =>
                    t.key === selectedTemplate.key
                        ? { ...t, content: editContent, isDefault: false }
                        : t
                ));
                setSelectedTemplate(null);
                alert('تم حفظ القالب بنجاح ✅');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('خطأ في حفظ القالب');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async (key: string) => {
        if (!confirm('هل أنت متأكد من استعادة القالب الافتراضي؟')) return;

        try {
            setLoading(true);
            const response = await companyAwareApi.delete(`/ai/templates/${key}`);
            if (response.data.success) {
                await fetchTemplates(); // Reload to get default
                alert('تم استعادة القالب الافتراضي 🔄');
            }
        } catch (error) {
            console.error('Error resetting:', error);
            alert('خطأ في الاستعادة');
        } finally {
            setLoading(false);
        }
    };

    const getVariablesList = (template: PromptTemplate) => {
        // Parse variables if string
        // In our backend service we pass variables object to getTemplate
        // Here we might want to hardcode hints based on key, or use the `variables` DB field
        const commonVars = ['{{price}}', '{{governorate}}', '{{deliveryTime}}'];

        if (template.key === 'shipping_response') return ['{{price}}', '{{governorate}}', '{{deliveryTime}}'];
        if (template.key === 'post_product_info') return ['{{name}}', '{{price}}'];
        if (template.key === 'order_confirmation') return ['{{productName}}', '{{totalPrice}}', '{{orderNumber}}', '{{deliveryTime}}'];

        return commonVars;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">قوالب الردود الذكية</h2>
                <button
                    onClick={fetchTemplates}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition"
                    title="تحديث"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Advanced Settings - Disable Default Templates */}
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-start gap-3">
                <input
                    type="checkbox"
                    id="disableDefaultTemplates"
                    checked={disableDefaultTemplates}
                    onChange={(e) => handleToggleDefaultTemplates(e.target.checked)}
                    className="mt-1 w-4 h-4 text-yellow-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-yellow-500 cursor-pointer"
                />
                <div className="flex-1">
                    <label htmlFor="disableDefaultTemplates" className="font-medium text-gray-900 dark:text-white block cursor-pointer">
                        تعطيل القوالب الافتراضية (Disable Default Config)
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        عند التفعيل، سيتوقف النظام عن استخدام القوالب الافتراضية (Code-based Fallback) إذا لم يجد قالب مخصص في قاعدة البيانات.
                        <br />
                        <span className="text-xs text-yellow-700 font-semibold">
                            ⚠️ تنبيه: استخدم هذا الخيار فقط إذا كنت تريد التحكم الكامل في جميع الردود وتجنب أي ردود افتراضية من النظام.
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template List */}
                <div className="lg:col-span-1 border-l pl-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                    ) : (
                        templates.map(template => (
                            <div
                                key={template.key}
                                onClick={() => handleEdit(template)}
                                className={`p-3 rounded-md cursor-pointer border transition-colors ${selectedTemplate?.key === template.key
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-700 dark:text-gray-300 text-sm">{template.key}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{template.description || 'قالب مخصص'}</p>
                                    </div>
                                    {template.isDefault && (
                                        <span className="text-[10px] bg-gray-200 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">افتراضي</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Editor Area */}
                <div className="lg:col-span-2">
                    {selectedTemplate ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{selectedTemplate.key}</h3>
                                <div className="flex space-x-2 space-x-reverse">
                                    {!selectedTemplate.isDefault && (
                                        <button
                                            onClick={() => handleReset(selectedTemplate.key)}
                                            className="text-xs text-red-500 hover:text-red-700 px-3 py-1"
                                        >
                                            استعادة الافتراضي
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Variables Hint */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded text-sm text-blue-800 dark:text-blue-300">
                                <strong>المتغيرات المتاحة:</strong>{' '}
                                {getVariablesList(selectedTemplate).map(v => (
                                    <code key={v} className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded mx-1 text-xs border border-blue-200 cursor-pointer hover:bg-blue-100"
                                        onClick={() => setEditContent(prev => prev + v)}>
                                        {v}
                                    </code>
                                ))}
                            </div>

                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full h-64 p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dir-rtl dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                placeholder="اكتب القالب هنا..."
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="px-4 py-2 border rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? 'جاري الحفظ...' : (
                                        <>
                                            <CheckIcon className="w-4 h-4" />
                                            حفظ التغييرات
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg min-h-[300px]">
                            <PencilIcon className="w-12 h-12 mb-2 opacity-50" />
                            <p>اختر قالباً للتعديل</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptTemplateManager;
