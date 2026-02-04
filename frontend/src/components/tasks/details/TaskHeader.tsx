import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlayIcon,
    StopIcon,
    PauseIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    ShareIcon,
    CheckIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { Task } from '../../../types/tasks';

interface TaskHeaderProps {
    task: Task;
    isTimerRunning: boolean;
    isTimerPaused?: boolean;
    elapsedSeconds: number;
    handleStartTimer: () => void;
    handleStopTimer: () => void;
    handlePauseTimer?: () => void;
    handleResumeTimer?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    isSmartTimeTrackingEnabled: boolean;
    canEdit: boolean;
    canDelete: boolean;
    settings?: any;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
    task,
    isTimerRunning,
    isTimerPaused = false,
    elapsedSeconds,
    handleStartTimer,
    handleStopTimer,
    handlePauseTimer,
    handleResumeTimer,
    onEdit,
    onDelete,
    onDuplicate,
    isSmartTimeTrackingEnabled,
    canEdit,
    canDelete,
    settings
}) => {
    const navigate = useNavigate();
    const [copiedLink, setCopiedLink] = useState(false);

    // Format seconds to HH:MM:SS
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/super-admin/dev-tasks')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                    <ArrowRightIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Navigation Buttons */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => task.nextTaskId && navigate(`/super-admin/dev-tasks/${task.nextTaskId}`)}
                        disabled={!task.nextTaskId}
                        className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="المهمة التالية"
                    >
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                    <button
                        onClick={() => task.previousTaskId && navigate(`/super-admin/dev-tasks/${task.previousTaskId}`)}
                        disabled={!task.previousTaskId}
                        className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="المهمة السابقة"
                    >
                        <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">
                            #{task.id.slice(0, 8)}
                        </span>
                        <span>/</span>
                        <span>{task.projectName || 'General'}</span>
                        {(settings?.taskDetailsVisibility?.showCreatedAt ?? true) && (
                            <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-gray-200 dark:border-gray-700">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                <span>
                                    {new Date(task.createdAt).toLocaleString('ar-EG', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-1 max-w-3xl">
                        {task.title}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Smart Time Tracking Buttons */}
                {isSmartTimeTrackingEnabled && (
                    <div className="flex items-center gap-2">
                        {!isTimerRunning ? (
                            <button
                                onClick={handleStartTimer}
                                className="flex items-center gap-3 px-5 py-3 rounded-xl font-bold shadow-md transition-all transform active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none"
                            >
                                <PlayIcon className="h-5 w-5" />
                                <span>ابدأ العمل</span>
                            </button>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-indigo-500 dark:border-indigo-400">
                                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{formatTime(elapsedSeconds)}</span>
                                    <span className={`w-2 h-2 rounded-full ${isTimerPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></span>
                                </div>
                                {isTimerPaused ? (
                                    <button
                                        onClick={handleResumeTimer}
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md transition-all transform active:scale-95 bg-green-600 text-white hover:bg-green-700"
                                        title="استئناف"
                                    >
                                        <PlayIcon className="h-5 w-5" />
                                        <span>استئناف</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePauseTimer}
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md transition-all transform active:scale-95 bg-yellow-600 text-white hover:bg-yellow-700"
                                        title="إيقاف مؤقت"
                                    >
                                        <PauseIcon className="h-5 w-5" />
                                        <span>إيقاف مؤقت</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleStopTimer}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md transition-all transform active:scale-95 bg-red-600 text-white hover:bg-red-700"
                                    title="إيقاف نهائي"
                                >
                                    <StopIcon className="h-5 w-5" />
                                    <span>إيقاف</span>
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>

                <button
                    onClick={copyLink}
                    className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors relative group"
                    title="نسخ الرابط"
                >
                    {copiedLink ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ShareIcon className="h-5 w-5" />}
                </button>

                <button
                    onClick={onDuplicate}
                    className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    title="تكرار المهمة"
                >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                </button>

                {canEdit && (
                    <button
                        onClick={onEdit}
                        className="p-3 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        title="تعديل"
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                )}

                {canDelete && (
                    <button
                        onClick={onDelete}
                        className="p-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="حذف"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default TaskHeader;
