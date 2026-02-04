import React, { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    ArrowPathIcon,
    CloudArrowDownIcon,
    CheckCircleIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { StatusBadge } from './shared/StatusBadge';
import { useWooCommerceStatus } from '../hooks/useWooCommerceStatus';
import { Settings } from '../types';

interface StatusMappingTabProps {
    settings: Settings | null;
    settingsForm: any;
    setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
    saveSettings: () => Promise<void>;
}

export const StatusMappingTab: React.FC<StatusMappingTabProps> = ({
    settings,
    settingsForm,
    setSettingsForm,
    saveSettings
}) => {
    const {
        wooStatuses,
        fetchingStatuses,
        localStatuses,
        statusSearch,
        setStatusSearch,
        fetchLocalStatuses,
        fetchWooStatuses,
        autoMapStatuses,
        defaultStatusMapping
    } = useWooCommerceStatus(settings, settingsForm, setSettingsForm);

    const customStatusRef = useRef<HTMLInputElement>(null);

    // Fetch local statuses on mount
    useEffect(() => {
        fetchLocalStatuses();
    }, [fetchLocalStatuses]);

    // Fetch woo statuses on mount/settings change
    useEffect(() => {
        if (settings?.hasCredentials) {
            fetchWooStatuses();
        }
    }, [settings?.hasCredentials]);

    const filteredStatuses = wooStatuses.filter(s =>
        s.name.toLowerCase().includes(statusSearch.toLowerCase()) ||
        s.slug.toLowerCase().includes(statusSearch.toLowerCase())
    );

    const handleStatusChange = (wooSlug: string, localStatus: string) => {
        setSettingsForm((prev: any) => ({
            ...prev,
            statusMapping: {
                ...prev.statusMapping,
                [wooSlug]: localStatus
            }
        }));
    };

    const handleAddCustomStatus = () => {
        const val = customStatusRef.current?.value?.trim();
        if (val && !settingsForm.statusMapping?.[val]) {
            const newMapping = { ...settingsForm.statusMapping };
            newMapping[val] = 'PROCESSING'; // Default
            setSettingsForm((prev: any) => ({ ...prev, statusMapping: newMapping }));
            toast.success(`تم إضافة الحالة "${val}"`);
            if (customStatusRef.current) customStatusRef.current.value = '';
        } else if (settingsForm.statusMapping?.[val]) {
            toast.error('هذه الحالة موجودة بالفعل');
        }
    };

    return (
        <div>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        ربط حالات الطلبات (Status Mapping)
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        تحديد الحالة المقابلة في النظام لكل حالة من حالات WooCommerce
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                        onClick={fetchWooStatuses}
                        disabled={fetchingStatuses}
                        className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 disabled:opacity-50 transition-all font-semibold shadow-sm active:scale-95"
                    >
                        {fetchingStatuses ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-500" />
                        ) : (
                            <CloudArrowDownIcon className="h-5 w-5 text-blue-500" />
                        )}
                        جلب الحالات
                    </button>
                    <button
                        onClick={() => setSettingsForm((prev: any) => ({ ...prev, statusMapping: defaultStatusMapping }))}
                        className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 transition-all font-semibold shadow-sm active:scale-95"
                    >
                        <ArrowPathIcon className="h-5 w-5 text-orange-500" />
                        الافتراضي
                    </button>
                    <button
                        onClick={autoMapStatuses}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:border-blue-500/30 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 transition-all font-bold shadow-sm active:scale-95"
                        title="اقتراح الربط تلقائياً بناءً على أسماء الحالات"
                    >
                        <span>🤖</span>
                        ربط تلقائي
                    </button>
                    <button
                        onClick={saveSettings}
                        className="w-full sm:flex-1 xl:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 font-bold"
                    >
                        <CheckCircleIcon className="h-5 w-5" />
                        حفظ الخريطة
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {/* شرح التلوين */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span>حالة مكتملة/ناجحة</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span>قيد التجهيز</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span>معلق/انتظار</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span>ملغي/فشل</span>
                    </div>
                </div>

                {/* البحث */}
                <div className="mb-6 relative">
                    <input
                        type="text"
                        placeholder="🔍 ابحث عن حالة..."
                        value={statusSearch}
                        onChange={(e) => setStatusSearch(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm font-bold text-gray-500 dark:text-gray-400">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">حالة WooCommerce</div>
                        <div className="col-span-1 flex justify-center">➡️</div>
                        <div className="col-span-5">الحالة في النظام</div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredStatuses.map((status, index) => {
                            const currentMapping = settingsForm.statusMapping?.[status.slug];
                            const isMapped = !!currentMapping;

                            // Dynamic border color based on mapping
                            let borderColor = 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
                            if (isMapped) {
                                if (currentMapping === 'DELIVERED') borderColor = 'border-l-4 border-l-green-500';
                                else if (currentMapping === 'PROCESSING') borderColor = 'border-l-4 border-l-blue-500';
                                else if (currentMapping === 'PENDING') borderColor = 'border-l-4 border-l-yellow-500';
                                else if (currentMapping === 'CANCELLED') borderColor = 'border-l-4 border-l-red-500';
                            }

                            return (
                                <div
                                    key={status.slug}
                                    className={`grid grid-cols-12 gap-4 items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-2 ${borderColor}`}
                                >
                                    <div className="col-span-1 text-gray-400 flex flex-col items-center">
                                        <span>{index + 1}</span>
                                        {status.isCustom && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mt-1">Custom</span>}
                                    </div>
                                    <div className="col-span-5">
                                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            {status.name}
                                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                                                {status.slug}
                                            </code>
                                        </div>
                                        {status.nameEn && (
                                            <div className="text-sm text-gray-500">{status.nameEn}</div>
                                        )}
                                    </div>
                                    <div className="col-span-1 flex justify-center text-gray-300">
                                        ➡️
                                    </div>
                                    <div className="col-span-5">
                                        <select
                                            value={settingsForm.statusMapping?.[status.slug] || ''}
                                            onChange={(e) => handleStatusChange(status.slug, e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                                        >
                                            <option value="">-- اختر الحالة المقابلة --</option>
                                            {localStatuses.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Custom Status Logic */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <PlusIcon className="h-4 w-4" />
                            إضافة حالة مخصصة
                        </h3>
                        <div className="flex gap-4 items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                            <div className="flex-1">
                                <input
                                    ref={customStatusRef}
                                    type="text"
                                    placeholder="مثال: driver-assigned"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCustomStatus();
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1.5">
                                    أدخل الاسم البرمجي (slug) للحالة في WooCommerce
                                </p>
                            </div>
                            <button
                                onClick={handleAddCustomStatus}
                                className="px-6 py-3 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>

                    {/* Mappings View */}
                    <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الخريطة الحالية:</h3>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(settingsForm.statusMapping || {}).map(([key, val]) => (
                                    <span key={key} className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded flex items-center gap-1">
                                        <span className="text-gray-500">{key}</span>
                                        <span className="text-gray-300">→</span>
                                        <StatusBadge status={val as string} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
