import React from 'react';
import { XMarkIcon, CheckCircleIcon, ArchiveBoxIcon, UserPlusIcon, TagIcon } from '@heroicons/react/24/outline';

interface BulkActionsBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onMarkAsDone?: () => void;
    onAssign?: () => void;
    onAddTags?: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onClearSelection,
    onMarkAsDone,
    onAssign,
    onAddTags
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <button
                    onClick={onClearSelection}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    {selectedCount} محدد
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onMarkAsDone}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>إنهاء</span>
                </button>
                <button
                    onClick={onAssign}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="تعيين للموظف"
                >
                    <UserPlusIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={onAddTags}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    title="تغيير التصنيفات"
                >
                    <TagIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default BulkActionsBar;
