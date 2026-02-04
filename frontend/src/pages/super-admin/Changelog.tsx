import React, { useState, useMemo } from 'react';
import {
    SparklesIcon,
    BugAntIcon,
    WrenchScrewdriverIcon,
    FunnelIcon,
    CalendarIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
import { changelog, ChangelogEntry } from '../../data/changelog';

type FilterType = 'all' | 'feature' | 'fix' | 'improvement';

const Changelog: React.FC = () => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChangelog = useMemo(() => {
        let result = changelog;

        if (filter !== 'all') {
            result = result.filter(entry => entry.type === filter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                entry.titleAr.toLowerCase().includes(query) ||
                entry.descriptionAr.toLowerCase().includes(query) ||
                entry.version.includes(query)
            );
        }

        return result;
    }, [filter, searchQuery]);

    const getTypeIcon = (type: ChangelogEntry['type']) => {
        switch (type) {
            case 'feature':
                return <SparklesIcon className="h-5 w-5 text-green-500" />;
            case 'fix':
                return <BugAntIcon className="h-5 w-5 text-red-500" />;
            case 'improvement':
                return <WrenchScrewdriverIcon className="h-5 w-5 text-blue-500" />;
        }
    };

    const getTypeBadge = (type: ChangelogEntry['type']) => {
        const styles = {
            feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            fix: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };

        const labels = {
            feature: '✨ ميزة جديدة',
            fix: '🐛 إصلاح',
            improvement: '🔧 تحسين',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>
                {labels[type]}
            </span>
        );
    };

    const stats = useMemo(() => ({
        total: changelog.length,
        features: changelog.filter(e => e.type === 'feature').length,
        fixes: changelog.filter(e => e.type === 'fix').length,
        improvements: changelog.filter(e => e.type === 'improvement').length,
    }), []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    📋 سجل التغييرات
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    تتبع جميع التحديثات والإصلاحات والميزات الجديدة
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">إجمالي التحديثات</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
                    </div>
                </div>
                <div
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all ${filter === 'feature' ? 'border-green-500' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                    onClick={() => setFilter(filter === 'feature' ? 'all' : 'feature')}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5" /> ميزات جديدة
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.features}</span>
                    </div>
                </div>
                <div
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all ${filter === 'fix' ? 'border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                        }`}
                    onClick={() => setFilter(filter === 'fix' ? 'all' : 'fix')}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-2">
                            <BugAntIcon className="h-5 w-5" /> إصلاحات
                        </span>
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.fixes}</span>
                    </div>
                </div>
                <div
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all ${filter === 'improvement' ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    onClick={() => setFilter(filter === 'improvement' ? 'all' : 'improvement')}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-5 w-5" /> تحسينات
                        </span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.improvements}</span>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="بحث في التحديثات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="h-5 w-5 text-gray-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterType)}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">جميع التحديثات</option>
                            <option value="feature">✨ ميزات جديدة</option>
                            <option value="fix">🐛 إصلاحات</option>
                            <option value="improvement">🔧 تحسينات</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Changelog List */}
            <div className="space-y-4">
                {filteredChangelog.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">لا توجد تحديثات مطابقة للبحث</p>
                    </div>
                ) : (
                    filteredChangelog.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {getTypeIcon(entry.type)}
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {entry.titleAr}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getTypeBadge(entry.type)}
                                </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {entry.descriptionAr}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                <span className="flex items-center gap-1">
                                    <TagIcon className="h-4 w-4" />
                                    v{entry.version}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    {new Date(entry.date).toLocaleDateString('ar-EG', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer note */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-500">
                <p>لإضافة تحديثات جديدة، قم بتعديل ملف <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">src/data/changelog.ts</code></p>
            </div>
        </div>
    );
};

export default Changelog;
