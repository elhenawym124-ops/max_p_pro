import React, { useState } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ConversationStatus } from '../../../types/inbox.types';

interface StatusDropdownProps {
    currentStatus: ConversationStatus;
    onStatusChange: (status: ConversationStatus) => void;
    disabled?: boolean;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
    currentStatus,
    onStatusChange,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const statuses: Array<{ value: ConversationStatus; label: string; color: string; icon: string }> = [
        { value: 'open', label: 'مفتوح', color: 'blue', icon: '🔵' },
        { value: 'pending', label: 'قيد المعالجة', color: 'yellow', icon: '🟡' },
        { value: 'resolved', label: 'محلول', color: 'green', icon: '🟢' },
        { value: 'done', label: 'منتهي', color: 'gray', icon: '✅' },
    ];

    const currentStatusObj = statuses.find(s => s.value === currentStatus) || statuses[0];

    const handleSelect = (status: ConversationStatus) => {
        onStatusChange(status);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
          ${currentStatusObj.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                        currentStatusObj.color === 'yellow' ? 'bg-yellow-50 text-yellow-700' :
                            currentStatusObj.color === 'green' ? 'bg-green-50 text-green-700' :
                                'bg-gray-50 text-gray-700'}
        `}
            >
                <span>{currentStatusObj.icon}</span>
                <span>{currentStatusObj.label}</span>
                <ChevronDownIcon className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="py-1">
                            {statuses.map(status => (
                                <button
                                    key={status.value}
                                    onClick={() => handleSelect(status.value)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                >
                                    <span>{status.icon}</span>
                                    <span className="flex-1 text-right">{status.label}</span>
                                    {status.value === currentStatus && (
                                        <CheckIcon className="w-4 h-4 text-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StatusDropdown;
