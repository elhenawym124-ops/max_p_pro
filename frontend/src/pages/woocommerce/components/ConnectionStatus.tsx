import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Settings } from '../types';

interface ConnectionStatusProps {
    settings: Settings | null;
    loading: boolean;
    onSync: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ settings, loading, onSync }) => {
    if (!settings) return null;

    return (
        <div className={`mb-6 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 ${settings.hasCredentials
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
            <div className="flex items-center gap-3">
                {settings.hasCredentials ? (
                    <>
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800 dark:text-green-200">متصل بـ WooCommerce</p>
                            <p className="text-sm text-green-600 dark:text-green-400">{settings.storeUrl}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                        <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">غير متصل</p>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">يرجى إعداد بيانات الاتصال</p>
                        </div>
                    </>
                )}
            </div>

            {/* Sync Now Button */}
            {settings.hasCredentials && (
                <button
                    onClick={onSync}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                    {loading ? (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                        <ArrowPathIcon className="h-5 w-5" />
                    )}
                    مزامنة الآن
                </button>
            )}
        </div>
    );
};
