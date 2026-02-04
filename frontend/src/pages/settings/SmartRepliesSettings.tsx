import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChatBubbleLeftRightIcon,
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

// ============================================
// TRANSLATIONS
// ============================================
const translations = {
    ar: {
        title: 'الردود التلقائية الذكية',
        subtitle: 'ردود فورية على الرسائل الشائعة',
        back: 'رجوع',
        enabled: 'مفعّل',
        disabled: 'معطّل',
        enableTitle: 'الردود التلقائية',
        enableDesc: 'رد فوري على التحيات والشكر والوداع',
        disabledDesc: 'جميع الرسائل تُعالج عادياً',
        templates: 'قوالب الردود',
        keywords: 'الكلمات المفتاحية',
        response: 'الرد',
        addTemplate: 'إضافة قالب جديد',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        saving: 'جاري الحفظ...',
        loading: 'جاري التحميل...',
        saveSuccess: 'تم الحفظ بنجاح',
        saveFailed: 'فشل الحفظ',
        newKeyword: 'كلمة جديدة...',
        newResponse: 'الرد التلقائي...',
        templateName: 'اسم القالب',
        greeting: 'التحيات',
        thanks: 'الشكر',
        confirmation: 'التأكيد',
        farewell: 'الوداع',
        custom: 'مخصص'
    },
    en: {
        title: 'Smart Auto-Replies',
        subtitle: 'Instant responses to common messages',
        back: 'Back',
        enabled: 'Enabled',
        disabled: 'Disabled',
        enableTitle: 'Auto-Replies',
        enableDesc: 'Instant response to greetings, thanks, and farewells',
        disabledDesc: 'All messages are processed normally',
        templates: 'Reply Templates',
        keywords: 'Keywords',
        response: 'Response',
        addTemplate: 'Add New Template',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        saving: 'Saving...',
        loading: 'Loading...',
        saveSuccess: 'Saved successfully',
        saveFailed: 'Save failed',
        newKeyword: 'New keyword...',
        newResponse: 'Auto response...',
        templateName: 'Template Name',
        greeting: 'Greetings',
        thanks: 'Thanks',
        confirmation: 'Confirmation',
        farewell: 'Farewell',
        custom: 'Custom'
    }
};

// ============================================
// TYPES
// ============================================
interface AutoReplyTemplate {
    id: string;
    name: string;
    type: 'greeting' | 'thanks' | 'confirmation' | 'farewell' | 'custom';
    keywords: string[];
    responses: string[];
    isDefault?: boolean;
}

interface Settings {
    enabled: boolean;
    templates: AutoReplyTemplate[];
}

// ============================================
// DEFAULT TEMPLATES
// ============================================
const defaultTemplates: AutoReplyTemplate[] = [
    {
        id: 'greeting',
        name: 'التحيات',
        type: 'greeting',
        keywords: ['سلام', 'السلام عليكم', 'أهلا', 'مرحبا', 'هلو', 'hi', 'hello'],
        responses: ['أهلاً وسهلاً! كيف أقدر أساعدك؟ 😊', 'مرحباً! عندك أي استفسار؟'],
        isDefault: true
    },
    {
        id: 'thanks',
        name: 'الشكر',
        type: 'thanks',
        keywords: ['شكرا', 'شكراً', 'مشكور', 'تسلم', 'thanks', 'thank you'],
        responses: ['العفو! لو محتاج أي حاجة تانية أنا هنا 😊', 'تحت أمرك دايماً! 🙏'],
        isDefault: true
    },
    {
        id: 'farewell',
        name: 'الوداع',
        type: 'farewell',
        keywords: ['مع السلامة', 'باي', 'bye', 'سلام'],
        responses: ['في أمان الله! نتشرف بخدمتك 👋', 'مع السلامة! 💬'],
        isDefault: true
    }
];

// ============================================
// COMPONENT
// ============================================
const SmartRepliesSettings: React.FC = () => {
    const navigate = useNavigate();
    const [lang] = useState<'ar' | 'en'>('ar');
    const t = translations[lang];

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        enabled: true,
        templates: defaultTemplates
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<AutoReplyTemplate | null>(null);
    const [newKeyword, setNewKeyword] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/ai/rule-responses');
            if (response.data.success && response.data.data) {
                const data = response.data.data;
                setSettings({
                    enabled: data.enableRuleResponses !== false,
                    templates: data.customRuleResponses?.templates || defaultTemplates
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            // Use defaults on error
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiClient.put('/ai/rule-responses', {
                enableRuleResponses: settings.enabled,
                customRuleResponses: {
                    templates: settings.templates
                }
            });
            toast.success(t.saveSuccess);
        } catch (error) {
            toast.error(t.saveFailed);
        } finally {
            setSaving(false);
        }
    };

    const handleEditStart = (template: AutoReplyTemplate) => {
        setEditingId(template.id);
        setEditingTemplate({ ...template });
    };

    const handleEditSave = () => {
        if (!editingTemplate) return;
        setSettings(prev => ({
            ...prev,
            templates: prev.templates.map(t =>
                t.id === editingId ? editingTemplate : t
            )
        }));
        setEditingId(null);
        setEditingTemplate(null);
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditingTemplate(null);
    };

    const handleDelete = (id: string) => {
        setSettings(prev => ({
            ...prev,
            templates: prev.templates.filter(t => t.id !== id)
        }));
    };

    const handleAddTemplate = () => {
        const newTemplate: AutoReplyTemplate = {
            id: `custom_${Date.now()}`,
            name: t.custom,
            type: 'custom',
            keywords: [],
            responses: []
        };
        setSettings(prev => ({
            ...prev,
            templates: [...prev.templates, newTemplate]
        }));
        handleEditStart(newTemplate);
    };

    const handleAddKeyword = () => {
        if (!newKeyword.trim() || !editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            keywords: [...editingTemplate.keywords, newKeyword.trim()]
        });
        setNewKeyword('');
    };

    const handleRemoveKeyword = (index: number) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            keywords: editingTemplate.keywords.filter((_, i) => i !== index)
        });
    };

    const handleResponseChange = (index: number, value: string) => {
        if (!editingTemplate) return;
        const newResponses = [...editingTemplate.responses];
        newResponses[index] = value;
        setEditingTemplate({ ...editingTemplate, responses: newResponses });
    };

    const handleAddResponse = () => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            responses: [...editingTemplate.responses, '']
        });
    };

    const handleRemoveResponse = (index: number) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            responses: editingTemplate.responses.filter((_, i) => i !== index)
        });
    };

    // ============================================
    // RENDER
    // ============================================
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeftIcon className="h-5 w-5 ml-2" />
                    {t.back}
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
                    {t.title}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{t.subtitle}</p>
            </div>

            <div className="space-y-6">
                {/* Toggle Card */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 transition-colors ${settings.enabled
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${settings.enabled
                                    ? 'bg-green-100 dark:bg-green-900'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                <SparklesIcon className={`h-6 w-6 ${settings.enabled
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                    }`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {t.enableTitle}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {settings.enabled ? t.enableDesc : t.disabledDesc}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                {/* Templates Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.templates}</h2>
                        <button
                            onClick={handleAddTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <PlusIcon className="h-4 w-4" />
                            {t.addTemplate}
                        </button>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {settings.templates.map(template => (
                            <div key={template.id} className="p-4">
                                {editingId === template.id && editingTemplate ? (
                                    // Edit Mode
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={editingTemplate.name}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder={t.templateName}
                                        />

                                        {/* Keywords */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.keywords}</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {editingTemplate.keywords.map((kw, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                                                        {kw}
                                                        <button onClick={() => handleRemoveKeyword(idx)} className="hover:text-red-500">
                                                            <XMarkIcon className="h-4 w-4" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newKeyword}
                                                    onChange={(e) => setNewKeyword(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    placeholder={t.newKeyword}
                                                />
                                                <button onClick={handleAddKeyword} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                                                    <PlusIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Responses */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.response}</label>
                                            <div className="space-y-2">
                                                {editingTemplate.responses.map((resp, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={resp}
                                                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                            placeholder={t.newResponse}
                                                        />
                                                        <button onClick={() => handleRemoveResponse(idx)} className="p-2 text-red-500 hover:text-red-700">
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={handleAddResponse} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                                    <PlusIcon className="h-4 w-4" /> {t.response}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleEditSave} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                                                <CheckIcon className="h-4 w-4" /> {t.save}
                                            </button>
                                            <button onClick={handleEditCancel} className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500">
                                                <XMarkIcon className="h-4 w-4" /> {t.cancel}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {template.keywords.slice(0, 5).map((kw, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                                        {kw}
                                                    </span>
                                                ))}
                                                {template.keywords.length > 5 && (
                                                    <span className="px-2 py-0.5 text-gray-500 dark:text-gray-500 text-xs">
                                                        +{template.keywords.length - 5}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                                                {template.responses[0]}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEditStart(template)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            {!template.isDefault && (
                                                <button onClick={() => handleDelete(template.id)} className="p-2 text-gray-500 hover:text-red-600">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                    >
                        {saving ? t.saving : t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartRepliesSettings;

