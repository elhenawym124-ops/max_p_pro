import React from 'react';
import {
    BugAntIcon,
    SparklesIcon,
    WrenchScrewdriverIcon,
    TagIcon,
    ClipboardDocumentListIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

export const TASK_TYPES: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    BUG: { label: 'خطأ', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <BugAntIcon className="w-3.5 h-3.5" /> },
    FEATURE: { label: 'ميزة', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <SparklesIcon className="w-3.5 h-3.5" /> },
    ENHANCEMENT: { label: 'تحسين', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> },
    MARKETING: { label: 'تسويق', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', icon: <TagIcon className="w-3.5 h-3.5" /> },
    DOCUMENTATION: { label: 'توثيق', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> },
    SECURITY: { label: 'أمني', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" /> },
    PERFORMANCE: { label: 'أداء', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: <ClockIcon className="w-3.5 h-3.5" /> },
    TESTING: { label: 'اختبار', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
    REFACTOR: { label: 'إعادة هيكلة', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', icon: <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> },
    MAINTENANCE: { label: 'صيانة', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> },
    HOTFIX: { label: 'إصلاح عاجل', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" /> },
};

export const TASK_STATUSES: Record<string, { label: string; bg: string; text: string }> = {
    BACKLOG: { label: 'قائمة الانتظار', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    TODO: { label: 'للتنفيذ', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    IN_PROGRESS: { label: 'قيد العمل', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    IN_REVIEW: { label: 'مراجعة', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
    TESTING: { label: 'اختبار', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
    DONE: { label: 'مكتمل', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    CANCELLED: { label: 'ملغي', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

export const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500',
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: 'حرجة', color: 'bg-red-500' },
    HIGH: { label: 'عالية', color: 'bg-orange-500' },
    MEDIUM: { label: 'متوسطة', color: 'bg-yellow-500' },
    LOW: { label: 'منخفضة', color: 'bg-green-500' },
};

// Form Options
export const TYPE_OPTIONS = Object.entries(TASK_TYPES).map(([value, config]) => ({
    value,
    label: config.label,
    color: `${config.bg} ${config.text}`
}));

export const STATUS_OPTIONS = Object.entries(TASK_STATUSES).map(([value, config]) => ({
    value,
    label: config.label,
    color: config.bg
}));

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
    color: config.color
}));
