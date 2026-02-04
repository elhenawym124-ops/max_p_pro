import React, { useState } from 'react';
import {
    CheckCircleIcon,
    ArchiveBoxIcon,
    BellSlashIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface ConversationActionsBarProps {
    isPriority: boolean;
    onTogglePriority: () => void;
    onMarkDone: () => void;
    onSnooze?: () => void;
    onArchive?: () => void;
    onMute?: () => void;
    disabled?: boolean;
}

const ConversationActionsBar: React.FC<ConversationActionsBarProps> = ({
    isPriority,
    onTogglePriority,
    onMarkDone,
    onSnooze,
    onArchive,
    onMute,
    disabled = false
}) => {
    const [doneFlash, setDoneFlash] = useState(false);
    const [priorityFlash, setPriorityFlash] = useState(false);

    const handleMarkDone = () => {
        setDoneFlash(true);
        onMarkDone();
        setTimeout(() => setDoneFlash(false), 1000);
    };

    const handleTogglePriority = () => {
        setPriorityFlash(true);
        onTogglePriority();
        setTimeout(() => setPriorityFlash(false), 1000);
    };

    return (
        <div className="flex items-center gap-2">
            {/* Mark as Done */}
            <button
                onClick={handleMarkDone}
                disabled={disabled}
                className={`p-2 rounded-lg transition-all duration-300 disabled:opacity-50 ${
                    doneFlash 
                        ? 'bg-green-500 text-white scale-110 shadow-lg' 
                        : 'hover:bg-green-50 text-gray-600 hover:text-green-600'
                }`}
                title="تحديد كمنتهي"
            >
                {doneFlash ? (
                    <CheckCircleSolid className="w-5 h-5 animate-pulse" />
                ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                )}
            </button>

            {/* Toggle Priority/Star */}
            <button
                onClick={handleTogglePriority}
                disabled={disabled}
                className={`p-2 rounded-lg transition-all duration-300 disabled:opacity-50 ${
                    priorityFlash
                        ? 'bg-yellow-500 text-white scale-110 shadow-lg'
                        : isPriority
                            ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                            : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={isPriority ? 'إلغاء الأولوية' : 'تحديد كأولوية'}
            >
                <StarIconSolid className={`w-5 h-5 ${priorityFlash ? 'animate-pulse' : ''}`} />
            </button>

            {/* Snooze */}
            {onSnooze && (
                <button
                    onClick={onSnooze}
                    disabled={disabled}
                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    title="غفوة المحادثة"
                >
                    <ClockIcon className="w-5 h-5" />
                </button>
            )}

            {/* Archive (future) */}
            {onArchive && (
                <button
                    onClick={onArchive}
                    disabled={disabled}
                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    title="أرشفة"
                >
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
            )}

            {/* Mute (future) */}
            {onMute && (
                <button
                    onClick={onMute}
                    disabled={disabled}
                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    title="كتم"
                >
                    <BellSlashIcon className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default ConversationActionsBar;
