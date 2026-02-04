import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../hooks/useAuthSimple';

export interface FilterState {
    unreadOnly: boolean;
    assignedTo: 'all' | 'me' | 'unassigned';
    startDate: Date | null;
    endDate: Date | null;
}

interface FilterPanelProps {
    isOpen: boolean;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onClose: () => void;
    onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    filters,
    onFilterChange,
    onClose,
    onReset
}) => {
    const { user } = useAuth();

    if (!isOpen) return null;

    const handleChange = (key: keyof FilterState, value: any) => {
        onFilterChange({
            ...filters,
            [key]: value
        });
    };

    return (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">تصفية المحادثات</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Unread Only */}
                <div className="flex items-center gap-2 mt-6">
                    <input
                        type="checkbox"
                        id="unreadOnly"
                        checked={filters.unreadOnly}
                        onChange={(e) => handleChange('unreadOnly', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                    />
                    <label htmlFor="unreadOnly" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        غير مقروءة فقط
                    </label>
                </div>

                {/* Assignment */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">تعيين لـ</label>
                    <select
                        value={filters.assignedTo}
                        onChange={(e) => handleChange('assignedTo', e.target.value)}
                        className="w-full text-sm rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <option value="all">الكل</option>
                        <option value="me">محادثاتي ({user?.firstName})</option>
                        <option value="unassigned">غير معين</option>
                    </select>
                </div>

                {/* Date Range - Start */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">من تاريخ</label>
                    <DatePicker
                        selected={filters.startDate}
                        onChange={(date) => handleChange('startDate', date)}
                        className="w-full text-sm rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="اختر تاريخ البداية"
                        dateFormat="dd/MM/yyyy"
                        isClearable
                    />
                </div>

                {/* Date Range - End */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">إلى تاريخ</label>
                    <DatePicker
                        selected={filters.endDate}
                        onChange={(date) => handleChange('endDate', date)}
                        className="w-full text-sm rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="اختر تاريخ النهاية"
                        dateFormat="dd/MM/yyyy"
                        minDate={filters.startDate || undefined}
                        isClearable
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onReset}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-3 py-1"
                >
                    إعادة تعيين الفلاتر
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
