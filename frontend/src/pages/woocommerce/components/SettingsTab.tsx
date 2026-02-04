import React from 'react';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon,
    KeyIcon,
    BoltIcon
} from '@heroicons/react/24/outline';
import { Settings } from '../types';

interface SettingsTabProps {
    settings: Settings | null;
    settingsForm: any;
    setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
    saveSettings: () => Promise<void>;
    testConnection: () => Promise<void>;
    setupWebhooks: (url?: string) => Promise<void>;
    testingConnection: boolean;
    ngrokUrl: string;
    setNgrokUrl: (url: string) => void;
    loading: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    settings,
    settingsForm,
    setSettingsForm,
    saveSettings,
    testConnection,
    setupWebhooks,
    testingConnection,
    ngrokUrl,
    setNgrokUrl,
    loading
}) => {
    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                إعدادات الربط
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                {/* بيانات الاتصال */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <GlobeAltIcon className="h-5 w-5 text-blue-500" />
                        بيانات المتجر
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                رابط المتجر (Store URL)
                            </label>
                            <input
                                type="text"
                                value={settingsForm.storeUrl}
                                onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, storeUrl: e.target.value }))}
                                placeholder="https://example.com"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                مفتاح العميل (Consumer Key)
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={settingsForm.consumerKey}
                                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, consumerKey: e.target.value }))}
                                    placeholder={settings?.hasCredentials ? '••••••••••••••••' : 'ck_...'}
                                    className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                                    dir="ltr"
                                />
                                <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                الرمز السري (Consumer Secret)
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={settingsForm.consumerSecret}
                                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, consumerSecret: e.target.value }))}
                                    placeholder={settings?.hasCredentials ? '••••••••••••••••' : 'cs_...'}
                                    className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                                    dir="ltr"
                                />
                                <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={testConnection}
                            disabled={testingConnection}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {testingConnection ? (
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                                <BoltIcon className="h-5 w-5" />
                            )}
                            اختبار الاتصال
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ArrowPathIcon className="h-5 w-5 text-purple-500" />
                        إعدادات المزامنة
                    </h3>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <span className="block font-medium text-gray-900 dark:text-white">تفعيل المزامنة التلقائية</span>
                                <span className="text-sm text-gray-500">مزامنة الطلبات تلقائياً في الخلفية</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={settingsForm.syncEnabled}
                                onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, syncEnabled: e.target.checked }))}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    اتجاه المزامنة
                                </label>
                                <select
                                    value={settingsForm.syncDirection}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSettingsForm((prev: any) => ({
                                            ...prev,
                                            syncDirection: val,
                                            autoImport: val === 'import_only' || val === 'both',
                                            autoExport: val === 'export_only' || val === 'both'
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="import_only">استيراد فقط (WooCommerce ← النظام)</option>
                                    <option value="export_only">تصدير فقط (النظام ← WooCommerce)</option>
                                    <option value="both">اتجاهين (WooCommerce ↔ النظام)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الفاصل الزمني (دقيقة)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="1440"
                                    value={settingsForm.syncInterval}
                                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Webhook Settings */}
                        <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        ⚡ Webhooks (تحديث فوري)
                                    </h4>
                                    <p className="text-sm text-gray-500">استقبال التحديثات فور حدوثها في المتجر</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.webhookEnabled}
                                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, webhookEnabled: e.target.checked }))}
                                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                />
                            </div>

                            {settingsForm.webhookEnabled && (
                                <div className="space-y-4">
                                    {window.location.hostname === 'localhost' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Ngrok URL (للاختبار المحلي)
                                            </label>
                                            <input
                                                type="text"
                                                value={ngrokUrl}
                                                onChange={(e) => setNgrokUrl(e.target.value)}
                                                placeholder="https://your-ngrok-url.ngrok-free.app"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                                                dir="ltr"
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setupWebhooks()}
                                        disabled={loading}
                                        className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        إعادة تثبيت Webhooks
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex justify-end">
                    <button
                        onClick={saveSettings}
                        disabled={loading}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all font-bold"
                    >
                        {loading ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                            <CheckCircleIcon className="h-5 w-5" />
                        )}
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );
};
