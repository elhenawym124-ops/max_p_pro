import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  ViewColumnsIcon,
  PlusIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  UserCircleIcon,
  CalendarIcon,
  ArrowLeftIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedUser: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  dueDate: string | null;
  subtasksCount: number;
  completedSubtasks: number;
  commentsCount: number;
  attachmentsCount: number;
  color?: string;
  projectId?: string;
}

interface KanbanData {
  PENDING: Task[];
  IN_PROGRESS: Task[];
  COMPLETED: Task[];
  CANCELLED: Task[];
}

interface Project {
  id: string;
  name: string;
}

const KanbanBoard: React.FC = () => {
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    PENDING: [],
    IN_PROGRESS: [],
    COMPLETED: [],
    CANCELLED: []
  });
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [runningTimer, setRunningTimer] = useState<any>(null);

  const columns = [
    { id: 'PENDING', title: 'في الانتظار', color: 'bg-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { id: 'IN_PROGRESS', title: 'قيد التنفيذ', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'COMPLETED', title: 'مكتمل', color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { id: 'CANCELLED', title: 'ملغي', color: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' }
  ];

  useEffect(() => {
    fetchKanbanTasks();
    fetchProjects();
    fetchRunningTimer();
  }, [selectedProject]);

  const fetchKanbanTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      let url = 'tasks/kanban';
      if (selectedProject) {
        url += `?projectId=${selectedProject}`;
      }

      const response = await fetch(buildApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setKanbanData(data.data);
      }
    } catch (error) {
      console.error('Error fetching kanban tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('projects'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchRunningTimer = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/running-timer'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.data) {
        setRunningTimer(data.data);
      }
    } catch (error) {
      console.error('Error fetching running timer:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${draggedTask.id}/order`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newStatus,
          newOrder: kanbanData[newStatus as keyof KanbanData].length
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setKanbanData(prev => {
          const oldStatus = draggedTask.status as keyof KanbanData;
          const newKanban = { ...prev };
          
          // Remove from old column
          newKanban[oldStatus] = prev[oldStatus].filter(t => t.id !== draggedTask.id);
          
          // Add to new column
          const updatedTask = { ...draggedTask, status: newStatus };
          newKanban[newStatus as keyof KanbanData] = [...prev[newStatus as keyof KanbanData], updatedTask];
          
          return newKanban;
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }

    setDraggedTask(null);
  };

  const startTimer = async (taskId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/time-tracking/start`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      if (data.success) {
        setRunningTimer(data.data);
      } else {
        alert(data.error || 'فشل في بدء المؤقت');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!runningTimer) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/time-tracking/${runningTimer.id}/stop`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRunningTimer(null);
        alert(data.message);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-l-red-500';
      case 'HIGH': return 'border-l-orange-500';
      case 'MEDIUM': return 'border-l-yellow-500';
      case 'LOW': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      LOW: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    };
    const labels: Record<string, string> = {
      URGENT: 'عاجل',
      HIGH: 'عالي',
      MEDIUM: 'متوسط',
      LOW: 'منخفض'
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[priority] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/tasks"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeftIcon className="h-5 w-5 ml-2" />
              العودة للقائمة
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <ViewColumnsIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 ml-2" />
              لوحة Kanban
            </h1>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Running Timer */}
            {runningTimer && (
              <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-lg">
                <ClockIcon className="h-5 w-5 ml-2 animate-pulse" />
                <span className="text-sm font-medium ml-2">{runningTimer.task?.title}</span>
                <button
                  onClick={stopTimer}
                  className="mr-2 p-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded"
                >
                  <StopIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Project Filter */}
            <div className="flex items-center">
              <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">جميع المشاريع</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <Link
              to="/tasks"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              مهمة جديدة
            </Link>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-100 dark:bg-gray-900">
        <div className="flex space-x-4 space-x-reverse h-full min-w-max">
          {columns.map(column => (
            <div
              key={column.id}
              className="w-80 flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`p-4 rounded-t-lg ${column.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${column.color} ml-2`}></div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{column.title}</h3>
                  </div>
                  <span className="bg-white dark:bg-gray-700 px-2 py-1 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300">
                    {kanbanData[column.id as keyof KanbanData].length}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                {kanbanData[column.id as keyof KanbanData].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 ${getPriorityColor(task.priority)} p-4 cursor-move hover:shadow-md transition-shadow ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Task Title */}
                    <Link
                      to={`/tasks/${task.id}`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 block mb-2"
                    >
                      {task.title}
                    </Link>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Priority & Due Date */}
                    <div className="flex items-center justify-between mb-3">
                      {getPriorityBadge(task.priority)}
                      {task.dueDate && (
                        <span className={`text-xs flex items-center ${isOverdue(task.dueDate) ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CalendarIcon className="h-3 w-3 ml-1" />
                          {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>

                    {/* Subtasks Progress */}
                    {task.subtasksCount > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>المهام الفرعية</span>
                          <span>{task.completedSubtasks}/{task.subtasksCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${(task.completedSubtasks / task.subtasksCount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      {/* Assigned User */}
                      <div className="flex items-center">
                        {task.assignedUser?.avatar ? (
                          <img
                            src={task.assignedUser.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <UserCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                          {task.assignedUser?.firstName}
                        </span>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {task.commentsCount > 0 && (
                          <span className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                            <ChatBubbleLeftIcon className="h-4 w-4 ml-1" />
                            {task.commentsCount}
                          </span>
                        )}
                        {task.attachmentsCount > 0 && (
                          <span className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                            <PaperClipIcon className="h-4 w-4 ml-1" />
                            {task.attachmentsCount}
                          </span>
                        )}
                        {/* Timer Button */}
                        {column.id !== 'COMPLETED' && column.id !== 'CANCELLED' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (runningTimer?.taskId === task.id) {
                                stopTimer();
                              } else if (!runningTimer) {
                                startTimer(task.id);
                              }
                            }}
                            className={`p-1 rounded ${
                              runningTimer?.taskId === task.id
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                            title={runningTimer?.taskId === task.id ? 'إيقاف المؤقت' : 'بدء المؤقت'}
                          >
                            {runningTimer?.taskId === task.id ? (
                              <StopIcon className="h-4 w-4" />
                            ) : (
                              <PlayIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {kanbanData[column.id as keyof KanbanData].length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">لا توجد مهام</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
