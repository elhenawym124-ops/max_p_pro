import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardDocumentListIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { Task } from '../../../types/tasks';
import { TASK_STATUSES } from '../../../constants/taskConstants';

interface TaskSubtasksProps {
    task: Task;
    onAddSubtask: () => void;
    onRequestTesting?: () => void;
    settings?: any;
}

const TaskSubtasks: React.FC<TaskSubtasksProps> = ({ task, onAddSubtask, onRequestTesting, settings }) => {
    const navigate = useNavigate();

    const getStatusInfo = (status: string) => {
        const fromSettings = settings?.taskStatuses?.find((s: any) => s.value === status);
        if (fromSettings) return fromSettings;
        return TASK_STATUSES[status] || TASK_STATUSES['BACKLOG'];
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">المهام الفرعية</h4>
                <div className="flex gap-2">
                    {onRequestTesting && (
                        <button
                            onClick={onRequestTesting}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-95"
                        >
                            <PlusIcon className="h-5 w-5" />
                            طلب اختبار
                        </button>
                    )}
                    <button
                        onClick={onAddSubtask}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" />
                        إضافة مهمة
                    </button>
                </div>
            </div>
            {task.subtasks?.map((subtask) => {
                const statusInfo = getStatusInfo(subtask.status);
                const bgClass = statusInfo?.bg || 'bg-gray-400';
                const textClass = statusInfo?.text || 'text-gray-700';
                const label = statusInfo?.label || subtask.status;

                return (
                    <div key={subtask.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${bgClass}`}></div>

                            <button onClick={() => navigate(`/super-admin/dev-tasks/${subtask.id}`)} className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                                {subtask.title}
                            </button>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full shadow-sm ${bgClass} ${textClass}`}>
                            {label}
                        </span>
                    </div>
                )
            })}
            {(!task.subtasks || task.subtasks.length === 0) && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>لا توجد مهام فرعية</p>
                </div>
            )}
        </div>
    );
};

export default TaskSubtasks;
