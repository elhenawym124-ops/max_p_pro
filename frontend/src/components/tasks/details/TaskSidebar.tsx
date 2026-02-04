import React from 'react';
import {
    ChevronDownIcon,
    CheckIcon,
    UserIcon,
    ClockIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    TagIcon,
    SparklesIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { Task } from '../../../types/tasks';
import {
    TASK_TYPES,
    TASK_STATUSES,
    PRIORITY_COLORS,
    PRIORITY_CONFIG
} from '../../../constants/taskConstants';


interface TaskSidebarProps {
    task: Task;
    settings: any;
    userPermissions: any;
    statusDropdownOpen: boolean;
    setStatusDropdownOpen: (open: boolean) => void;
    handleUpdateStatus: (status: string) => void;
    teamMembers?: any[];
    handleUpdateAssignee?: (assigneeId: string) => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({
    task,
    settings,
    userPermissions,
    statusDropdownOpen,
    setStatusDropdownOpen,
    handleUpdateStatus,
    teamMembers = [],
    handleUpdateAssignee
}) => {
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = React.useState(false);

    // Helper to fallback to default config if settings missing
    const getTypeInfo = (type: string) => {
        return TASK_TYPES[type] || TASK_TYPES['FEATURE'];
    };

    const getStatusInfo = (status: string) => {
        const fromSettings = settings?.taskStatuses?.find((s: any) => s.value === status);
        if (fromSettings) return fromSettings;
        return TASK_STATUSES[status] || TASK_STATUSES['BACKLOG'];
    };

    const getPriorityInfo = (priority: string) => {
        // Priority config in constants is map, settings might be array
        // Let's rely on mapping mainly
        return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['MEDIUM'];
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

    // Get status options (merged settings + defaults)
    const statusOptions = settings?.taskStatuses || Object.entries(TASK_STATUSES).map(([value, config]) => ({ value, ...config }));

    return (
        <div className="space-y-6">
            {/* Status & Priority Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    تفاصيل الحالة
                </h3>

                {/* Status */}
                <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">الحالة</label>
                    {userPermissions?.canChangeStatus ? (
                        <div className="relative">
                            <button
                                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${getStatusInfo(task.status).bg} border-gray-200 dark:border-gray-700 ${getStatusInfo(task.status).text}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{getStatusInfo(task.status).label}</span>
                                </div>
                                <ChevronDownIcon className="h-4 w-4" />
                            </button>
                            {statusDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                    {statusOptions.map((config: any) => (
                                        <button
                                            key={config.value}
                                            onClick={() => handleUpdateStatus(config.value)}
                                            className={`w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-between ${task.status === config.value ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''}`}
                                        >
                                            <span className={config.text}>{config.label}</span>
                                            {task.status === config.value && <CheckIcon className="h-4 w-4 text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`px-3 py-2 rounded-lg text-center font-medium ${getStatusInfo(task.status).bg} ${getStatusInfo(task.status).text}`}>
                            {getStatusInfo(task.status).label}
                        </div>
                    )}
                </div>

                {/* Priority */}
                <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">الأولوية</label>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`}></span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getPriorityInfo(task.priority).label}
                        </span>
                    </div>
                </div>

                {/* Type */}
                <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">النوع</label>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full ${getTypeInfo(task.type).bg} ${getTypeInfo(task.type).text}`}>
                        {getTypeInfo(task.type).icon}
                        {getTypeInfo(task.type).label}
                    </div>
                </div>
            </div>

            {/* People Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    فريق العمل
                </h3>

                <div className="space-y-4">
                    {/* Assignee */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">المسؤول</label>
                        {userPermissions?.canAssign && teamMembers.length > 0 ? (
                            <div className="relative">
                                <button
                                    onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                                    className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        {task.assigneeName ? (
                                            <>
                                                {task.assigneeAvatar ? (
                                                    <img src={task.assigneeAvatar} alt="" className="w-8 h-8 rounded-full ring-2 ring-indigo-50 dark:ring-gray-700" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                                        {task.assigneeName.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{task.assigneeName}</p>
                                                    <p className="text-[10px] text-gray-500">مطور</p>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400 flex items-center gap-1 italic"><UserIcon className="w-4 h-4" /> غير معين</span>
                                        )}
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                </button>

                                {assigneeDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto p-1">
                                        <button
                                            onClick={() => {
                                                handleUpdateAssignee?.('unassigned');
                                                setAssigneeDropdownOpen(false);
                                            }}
                                            className="w-full text-right px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs text-red-600 dark:text-red-400 rounded-md flex items-center justify-between mb-1"
                                        >
                                            إلغاء التعيين
                                        </button>
                                        {teamMembers.map((member) => (
                                            <button
                                                key={member.id}
                                                onClick={() => {
                                                    handleUpdateAssignee?.(member.userId || member.id);
                                                    setAssigneeDropdownOpen(false);
                                                }}
                                                className={`w-full text-right px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-between rounded-md mb-0.5 ${task.assigneeId === (member.userId || member.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {member.avatar ? (
                                                        <img src={member.avatar} alt="" className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                                            {member.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className="truncate max-w-[120px]">{member.name}</span>
                                                </div>
                                                {task.assigneeId === (member.userId || member.id) && <CheckIcon className="h-3.5 w-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-1">
                                {task.assigneeName ? (
                                    <>
                                        {task.assigneeAvatar ? (
                                            <img src={task.assigneeAvatar} alt="" className="w-10 h-10 rounded-full ring-2 ring-indigo-50 dark:ring-gray-700" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base">
                                                {task.assigneeName.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{task.assigneeName}</p>
                                            <p className="text-xs text-gray-500">مطور</p>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400 flex items-center gap-1 italic"><UserIcon className="w-4 h-4" /> غير معين</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reporter */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">المبلغ</label>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-xs ring-2 ring-gray-50 dark:ring-gray-800">
                                {task.reporterName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.reporterName}</p>
                                <p className="text-xs text-gray-500">إدارة</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project & Dates Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div className="space-y-4">
                    {/* Project */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">المشروع</label>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: task.projectColor || '#6366f1' }}></span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.projectName || 'عام'}</span>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                <ClockIcon className="w-3.5 h-3.5" /> تاريخ البدء
                            </label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                {task.startDate ? new Date(task.startDate).toLocaleDateString('ar-EG') : '-'}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                <CalendarDaysIcon className="w-3.5 h-3.5" /> تاريخ الاستحقاق
                            </label>
                            <p className={`text-sm font-mono font-medium ${isOverdue ? 'text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded w-fit' : 'text-gray-700 dark:text-gray-300'}`}>
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-EG') : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time & Progress Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">تقدم العمل</label>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{task.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000 shadow-sm"
                        style={{ width: `${task.progress || 0}%` }}
                    ></div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><ClockIcon className="w-3 h-3" />مقدر</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{task.estimatedHours || 0}h</p>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 flex items-center justify-center gap-1"><CheckCircleIcon className="w-3 h-3" />فعلي</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300">{Math.round((task.actualHours || 0) * 10) / 10}h</p>
                    </div>
                </div>

                {/* Time Warnings */}
                {task.estimatedHours && task.estimatedHours > 0 && task.status !== 'DONE' && (
                    <>
                        {task.actualHours && task.actualHours >= task.estimatedHours * 0.9 && task.actualHours < task.estimatedHours && (
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">اقتربت من الوقت المقدر</p>
                                        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                                            متبقي {Math.round((task.estimatedHours - task.actualHours) * 10) / 10}h فقط
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {task.actualHours && task.actualHours >= task.estimatedHours && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-600 dark:text-red-400 text-lg">🚨</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-red-800 dark:text-red-200">تجاوزت الوقت المقدر!</p>
                                        <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                                            زيادة {Math.round((task.actualHours - task.estimatedHours) * 10) / 10}h عن المقدر
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* XP Earned - Show only if task is completed and has XP */}
            {task.status === 'DONE' && (task as any).xpEarned && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-yellow-900 dark:text-yellow-100 uppercase tracking-wider flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4" /> نقاط الخبرة
                        </h3>
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg mb-2">
                            <span className="text-2xl font-black text-white">{(task as any).xpEarned}</span>
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                            نقطة مكتسبة عند الإكمال
                        </p>
                    </div>
                </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <TagIcon className="w-4 h-4" /> التصنيفات
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-default border border-gray-200 dark:border-gray-600">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Related Links */}
            {(settings?.taskDetailsVisibility?.showRelatedLinks ?? true) && task.relatedLinks && task.relatedLinks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> الروابط المرتبطة
                    </h3>
                    <div className="space-y-3">
                        {task.relatedLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all border border-indigo-100/50 dark:border-indigo-900/30 group"
                            >
                                <div className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{link.title}</p>
                                    <p className="text-[10px] text-gray-500 truncate dir-ltr">{link.url}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskSidebar;
