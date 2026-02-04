import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BoltIcon,
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface RuleResponsesSettings {
    enableRuleResponses: boolean;
    responseLocale: string;
    customRuleResponses: {
        greeting?: string[];
        thanks?: string[];
        confirmation?: string[];
        farewell?: string[];
    } | null;
    defaults?: {
        greeting: Record<string, string[]>;
        thanks: Record<string, string[]>;
        confirmation: Record<string, string[]>;
        farewell: Record<string, string[]>;
    };
    locales?: string[];
    intents?: string[];
}

const LOCALE_NAMES: Record<string, string> = {
    ar_eg: '🇪🇬 مصري',
    ar_gulf: '🇸🇦 خليجي',
    formal: '📝 رسمي'
};

const INTENT_NAMES: Record<string, string> = {
    greeting: '👋 التحيات',
    thanks: '🙏 الشكر',
    confirmation: '✅ التأكيدات',
    farewell: '👋 الوداع'
};

const RuleResponsesSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<RuleResponsesSettings>({
        enableRuleResponses: true,
        responseLocale: 'ar_eg',
        customRuleResponses: null
    });
    const [newResponse, setNewResponse] = useState<Record<string, string>>({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/ai/rule-responses');
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (error: any) {
            console.error('Error loading rule responses:', error);
            toast.error('فشل تحميل إعدادات الردود السريعة');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await apiClient.put('/ai/rule-responses', {
                enableRuleResponses: settings.enableRuleResponses,
                responseLocale: settings.responseLocale,
                customRuleResponses: settings.customRuleResponses
            });

            if (response.data.success) {
                toast.success('تم حفظ الإعدادات بنجاح');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'فشل حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const addCustomResponse = (intent: string) => {
        const text = newResponse[intent]?.trim();
        if (!text) return;

        setSettings(prev => {
            const newCustom = { ...prev.customRuleResponses } || {};
            if (!newCustom[intent as keyof typeof newCustom]) {
                (newCustom as any)[intent] = [];
            }
            (newCustom as any)[intent].push(text);
            return { ...prev, customRuleResponses: newCustom };
        });
        setNewResponse(prev => ({ ...prev, [intent]: '' }));
    };

    const removeCustomResponse = (intent: string, index: number) => {
        setSettings(prev => {
            const newCustom = { ...prev.customRuleResponses };
            if (newCustom && (newCustom as any)[intent]) {
                (newCustom as any)[intent].splice(index, 1);
                if ((newCustom as any)[intent].length === 0) {
                    delete (newCustom as any)[intent];
                }
            }
            return { ...prev, customRuleResponses: Object.keys(newCustom || {}).length > 0 ? newCustom : null };
        });
    };

    const getDefaultResponses = (intent: string): string[] => {
        if (!settings.defaults || !settings.defaults[intent as keyof typeof settings.defaults]) {
            return [];
        }
        return settings.defaults[intent as keyof typeof settings.defaults][settings.responseLocale] || [];
    };

    const getCustomResponses = (intent: string): string[] => {
        if (!settings.customRuleResponses) return [];
        return (settings.customRuleResponses as any)[intent] || [];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">جاري التحميل...</p>
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
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeftIcon className="h-5 w-5 ml-2" />
                    العودة للإعدادات
                </button>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <BoltIcon className="h-8 w-8 text-yellow-500 ml-3" />
                    الردود السريعة (Rule-based)
                </h1>
                <p className="mt-2 text-gray-600">
                    ردود فورية للتحيات والشكر بدون استخدام AI - توفير في الـ Tokens
                </p>
            </div>

            <div className="bg-white shadow rounded-lg p-6 space-y-6">
                {/* Toggle Section */}
                <div className={`p-4 rounded-lg border-2 ${settings.enableRuleResponses
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {settings.enableRuleResponses ? (
                                <CheckCircleIcon className="h-6 w-6 text-green-600 ml-2" />
                            ) : (
                                <XCircleIcon className="h-6 w-6 text-gray-400 ml-2" />
                            )}
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    {settings.enableRuleResponses ? 'الردود السريعة مفعّلة' : 'الردود السريعة معطّلة'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {settings.enableRuleResponses
                                        ? 'النظام يرد تلقائياً على التحيات والشكر بدون AI'
                                        : 'جميع الرسائل تذهب للـ AI'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enableRuleResponses}
                                onChange={(e) => setSettings({ ...settings, enableRuleResponses: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                {/* Locale Selection */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🌍 اللهجة</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {(settings.locales || ['ar_eg', 'ar_gulf', 'formal']).map(locale => (
                            <button
                                key={locale}
                                onClick={() => setSettings({ ...settings, responseLocale: locale })}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${settings.responseLocale === locale
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-xl">{LOCALE_NAMES[locale] || locale}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Responses by Intent */}
                {(settings.intents || ['greeting', 'thanks', 'confirmation', 'farewell']).map(intent => (
                    <div key={intent} className="border-t pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {INTENT_NAMES[intent] || intent}
                        </h3>

                        {/* Default Responses */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">الردود الافتراضية:</p>
                            <div className="space-y-2">
                                {getDefaultResponses(intent).map((response, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg text-gray-700 text-sm">
                                        {response}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom Responses */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">الردود المخصصة:</p>
                            <div className="space-y-2">
                                {getCustomResponses(intent).map((response, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="flex-1 bg-indigo-50 p-3 rounded-lg text-indigo-700 text-sm">
                                            {response}
                                        </div>
                                        <button
                                            onClick={() => removeCustomResponse(intent, idx)}
                                            className="p-2 text-red-500 hover:text-red-700"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add New Response */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newResponse[intent] || ''}
                                onChange={(e) => setNewResponse({ ...newResponse, [intent]: e.target.value })}
                                placeholder="أضف رد مخصص..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                onKeyPress={(e) => e.key === 'Enter' && addCustomResponse(intent)}
                            />
                            <button
                                onClick={() => addCustomResponse(intent)}
                                disabled={!newResponse[intent]?.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RuleResponsesSettings;

