import React from 'react';
import { Search, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { InboxTab } from '../../../types/inbox.types';
import { useTranslation } from 'react-i18next';

interface InboxTabsProps {
    activeTab: InboxTab;
    onTabChange: (tab: InboxTab) => void;
    counts: {
        all: number;
        unreplied: number;
        done: number;
        main: number;
        general: number;
        requests: number;
        spam: number;
    };
    onSearch: (query: string) => void;
    onToggleFilters: () => void;
    onShowStats?: () => void;
}

const InboxTabs: React.FC<InboxTabsProps> = ({ activeTab, onTabChange, counts, onSearch, onToggleFilters, onShowStats }) => {
    const { t } = useTranslation();

    const tabs = [
        { id: 'all' as InboxTab, label: t('inbox.tabs.all'), icon: '💬', count: counts.all },
        { id: 'unreplied' as InboxTab, label: t('inbox.tabs.unreplied'), icon: '⚠️', count: counts.unreplied },
        { id: 'done' as InboxTab, label: t('inbox.tabs.done'), icon: '✅', count: counts.done },
        { id: 'main' as InboxTab, label: t('inbox.tabs.main'), icon: '⭐', count: counts.main },
        { id: 'general' as InboxTab, label: t('inbox.tabs.general'), icon: '📋', count: counts.general },
        { id: 'requests' as InboxTab, label: t('inbox.tabs.requests'), icon: '🔔', count: counts.requests },
        { id: 'spam' as InboxTab, label: t('inbox.tabs.spam'), icon: '🚫', count: counts.spam },
    ];

    return (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between px-4">
                <div className="flex space-x-1 space-x-reverse">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                }
            `}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.count > 0 && tab.id !== 'all' && (
                                <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }
              `}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search, Filter, and Stats buttons */}
                <div className="flex items-center gap-3">
                    {/* Stats Button */}
                    {onShowStats && (
                        <button
                            onClick={onShowStats}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                            title={t('inbox.statistics')}
                        >
                            <BarChart3 className="w-5 h-5" />
                        </button>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('inbox.searchPlaceholder')}
                            onChange={(e) => onSearch(e.target.value)}
                            className="pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    {/* Filters Toggle */}
                    <button
                        onClick={onToggleFilters}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title={t('inbox.advancedFilters')}
                    >
                        <SlidersHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InboxTabs;

