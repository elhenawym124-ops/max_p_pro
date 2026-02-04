import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import { useTheme } from '../../hooks/useTheme';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  ClipboardDocumentListIcon,
  BugAntIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface KanbanTask {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  order: number;
  dueDate: string | null;
  estimatedHours: number;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName: string | null;
  projectColor: string | null;
  tags: string[];
  commentsCount: number;
  subtasksCount: number;
  checklistsCount: number;
}

interface KanbanData {
  [key: string]: KanbanTask[];
}

const defaultColumns = [
  { key: 'BACKLOG', label: 'قائمة الانتظار', color: 'bg-gray-100 dark:bg-gray-700/50', headerColor: 'bg-gray-200 dark:bg-gray-700' },
  { key: 'TODO', label: 'للتنفيذ', color: 'bg-yellow-50 dark:bg-yellow-900/20', headerColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { key: 'IN_PROGRESS', label: 'قيد العمل', color: 'bg-blue-50 dark:bg-blue-900/20', headerColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { key: 'IN_REVIEW', label: 'مراجعة', color: 'bg-purple-50 dark:bg-purple-900/20', headerColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { key: 'TESTING', label: 'اختبار', color: 'bg-orange-50 dark:bg-orange-900/20', headerColor: 'bg-orange-100 dark:bg-orange-900/30' },
  { key: 'DONE', label: 'مكتمل', color: 'bg-green-50 dark:bg-green-900/20', headerColor: 'bg-green-100 dark:bg-green-900/30' },
];

const defaultPriorityColors: Record<string, string> = {
  CRITICAL: 'border-r-red-500',
  HIGH: 'border-r-orange-500',
  MEDIUM: 'border-r-yellow-500',
  LOW: 'border-r-green-500',
};

const typeIcons: Record<string, React.ReactNode> = {
  BUG: <BugAntIcon className="h-4 w-4 text-red-500" />,
  FEATURE: <SparklesIcon className="h-4 w-4 text-green-500" />,
  ENHANCEMENT: <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" />,
  DOCUMENTATION: <ClipboardDocumentListIcon className="h-4 w-4 text-purple-500" />,
  SECURITY: <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />,
  PERFORMANCE: <ArrowTrendingUpIcon className="h-4 w-4 text-yellow-500" />,
};

// No static priority colors here, we'll derive them from settings

const DevKanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [kanbanData, setKanbanData] = useState<KanbanData>({});
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    projectId: '',
    assigneeId: '',
    type: '',
    priority: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchKanbanData();
    fetchSettings();
  }, [filters.projectId, filters.assigneeId, filters.type, filters.priority]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/settings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.type) params.append('type', filters.type);
      if (filters.priority) params.append('priority', filters.priority);

      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/kanban?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setKanbanData(data.data);
      }
    } catch (err) {
      console.error('Error fetching kanban data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: KanbanTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Update locally first for instant feedback
    const oldStatus = draggedTask.status;
    setKanbanData(prev => {
      const newData = { ...prev };
      newData[oldStatus as keyof KanbanData] = newData[oldStatus as keyof KanbanData].filter(t => t.id !== draggedTask.id);
      newData[newStatus as keyof KanbanData] = [...newData[newStatus as keyof KanbanData], { ...draggedTask, status: newStatus }];
      return newData;
    });

    // Update on server
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${draggedTask.id}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!data.success) {
        // Revert on error
        fetchKanbanData();
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      fetchKanbanData();
    }

    setDraggedTask(null);
  };

  const filteredTasks = useCallback((tasks: KanbanTask[]) => {
    if (!filters.search) return tasks;
    const search = filters.search.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(search) ||
      task.projectName?.toLowerCase().includes(search) ||
      task.assigneeName?.toLowerCase().includes(search)
    );
  }, [filters.search]);

  const TaskCard: React.FC<{ task: KanbanTask }> = ({ task }) => {
    const priorityInfo = settings?.taskPriorities?.find((p: any) => p.value === task.priority);
    const borderStyle = priorityInfo ? { borderRightColor: priorityInfo.color, borderRightWidth: '4px' } : undefined;
    const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'DONE' : false;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => navigate(`/super-admin/dev-tasks/${task.id}`)}
        className={`
          bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer
          hover:shadow-md dark:hover:shadow-lg transition-all duration-200
          ${!priorityInfo ? (defaultPriorityColors[task.priority] + ' border-r-4' || 'border-r-gray-300 dark:border-r-gray-600') : ''}
          ${draggedTask?.id === task.id ? 'opacity-50' : ''}
        `}
        style={borderStyle}
      >
        {/* Type & Project */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {typeIcons[task.type]}
            {task.projectName && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.projectColor || '#6366f1' }}
                ></span>
                {task.projectName}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <EllipsisVerticalIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Title */}
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
          {task.title}
        </h4>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 dark:text-gray-500 text-xs">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {/* Assignee */}
            {task.assigneeName ? (
              task.assigneeAvatar ? (
                <img
                  src={task.assigneeAvatar}
                  alt={task.assigneeName}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium">
                  {task.assigneeName.charAt(0)}
                </div>
              )
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <CalendarDaysIcon className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Counts */}
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            {task.subtasksCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <ClipboardDocumentListIcon className="h-3 w-3" />
                {task.subtasksCount}
              </span>
            )}
            {task.commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <ChatBubbleLeftIcon className="h-3 w-3" />
                {task.commentsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📋 Kanban Board</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">اسحب المهام لتغيير حالتها</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="بحث..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
          >
            <FunnelIcon className="h-5 w-5" />
            فلترة
          </button>

          {/* Add Task */}
          <button
            onClick={() => navigate('/super-admin/dev-tasks/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5" />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">الكل</option>
              <option value="BUG">أخطاء</option>
              <option value="FEATURE">ميزات</option>
              <option value="ENHANCEMENT">تحسينات</option>
              <option value="DOCUMENTATION">توثيق</option>
              <option value="SECURITY">أمني</option>
              <option value="PERFORMANCE">أداء</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">الكل</option>
              <option value="CRITICAL">حرجة</option>
              <option value="HIGH">عالية</option>
              <option value="MEDIUM">متوسطة</option>
              <option value="LOW">منخفضة</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button
              onClick={() => setFilters({ projectId: '', assigneeId: '', type: '', priority: '', search: '' })}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {(settings?.taskStatuses || defaultColumns).map((column: any) => {
            const columnKey = column.value || column.key;
            const columnLabel = column.label;
            const columnTasks = filteredTasks(kanbanData[columnKey] || []);
            const isOver = dragOverColumn === columnKey;

            // Handle color from settings
            const bgColor = column.color ? undefined : column.color; // If it's a hex, we use style
            const style = column.color?.startsWith('#') ? { backgroundColor: column.color + '10', borderColor: column.color + '40' } : {};
            const headerStyle = column.color?.startsWith('#') ? { backgroundColor: column.color + '20' } : {};

            return (
              <div
                key={columnKey}
                onDragOver={(e) => handleDragOver(e, columnKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, columnKey)}
                className={`
                  w-80 flex-shrink-0 rounded-xl overflow-hidden flex flex-col
                  ${column.color?.startsWith('bg-') ? column.color : 'bg-gray-50/50 dark:bg-gray-700/30'} 
                  border-2 transition-colors duration-200
                  ${isOver ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent'}
                `}
                style={isOver ? {} : style}
              >
                {/* Column Header */}
                <div
                  className={`${column.headerColor || ''} px-4 py-3 flex items-center justify-between`}
                  style={headerStyle}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{columnLabel}</h3>
                    <span className="bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-sm font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/super-admin/dev-tasks/new?status=${columnKey}`)}
                    className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <p className="text-sm">لا توجد مهام</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DevKanbanBoard;



