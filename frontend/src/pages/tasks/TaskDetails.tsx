import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  UserCircleIcon,
  PaperClipIcon,
  PlusIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  EyeIcon,
  FolderIcon,
  LinkIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import TaskChecklist from '../../components/tasks/TaskChecklist';
import TaskDependencies from '../../components/tasks/TaskDependencies';
import MentionInput, { renderWithMentions } from '../../components/tasks/MentionInput';

interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  progress: number;
  dueDate: string | null;
  startDate: string | null;
  completedDate: string | null;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  color: string | null;
  project: { id: string; name: string } | null;
  assignedUser: { id: string; firstName: string; lastName: string; avatar?: string };
  createdByUser: { id: string; firstName: string; lastName: string; avatar?: string };
  parentTask: { id: string; title: string } | null;
  subtasks: any[];
  comments: any[];
  attachments: any[];
  timeEntries: any[];
  activities: any[];
  watchersList: any[];
  totalTimeMinutes: number;
  totalTimeHours: number;
  createdAt: string;
  updatedAt: string;
}

const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subtasks' | 'checklists' | 'dependencies' | 'comments' | 'time' | 'activity' | 'attachments'>('subtasks');
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState({ title: '', description: '' });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showManualTimeForm, setShowManualTimeForm] = useState(false);
  const [manualTimeEntry, setManualTimeEntry] = useState({ hours: 0, minutes: 0, description: '' });
  const [uploading, setUploading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowStatusDropdown(false);
        setShowPriorityDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
      fetchRunningTimer();
      fetchUsers();
    }
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}/details`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/company-users'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const startTimer = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}/time-tracking/start`), {
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
        alert(data.error);
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
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setRunningTimer(null);
        fetchTaskDetails();
        alert(data.message);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}/comments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      const data = await response.json();
      if (data.success) {
        setNewComment('');
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const createSubtask = async () => {
    if (!newSubtask.title.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}/subtasks`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSubtask)
      });

      const data = await response.json();
      if (data.success) {
        setNewSubtask({ title: '', description: '' });
        setShowSubtaskForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  // تعديل تعليق
  const updateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editCommentContent })
      });

      const data = await response.json();
      if (data.success) {
        setEditingComment(null);
        setEditCommentContent('');
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // حذف تعليق
  const deleteComment = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // إضافة وقت يدوي
  const addManualTime = async () => {
    const totalMinutes = (manualTimeEntry.hours * 60) + manualTimeEntry.minutes;
    if (totalMinutes <= 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const now = new Date();
      const startTime = new Date(now.getTime() - totalMinutes * 60000);

      const response = await fetch(buildApiUrl(`tasks/${id}/time-entries`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          duration: totalMinutes,
          description: manualTimeEntry.description
        })
      });

      const data = await response.json();
      if (data.success) {
        setManualTimeEntry({ hours: 0, minutes: 0, description: '' });
        setShowManualTimeForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error adding manual time:', error);
    }
  };

  const updateSubtaskStatus = async (subtaskId: string, status: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${subtaskId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error updating subtask status:', error);
    }
  };

  const toggleWatcher = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const userId = localStorage.getItem('userId');
      const isWatching = task?.watchersList.some((w: any) => w.id === userId);

      if (isWatching) {
        await fetch(buildApiUrl(`tasks/${id}/watchers/${userId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch(buildApiUrl(`tasks/${id}/watchers`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        });
      }
      fetchTaskDetails();
    } catch (error) {
      console.error('Error toggling watcher:', error);
    }
  };

  // تحديث المهمة السريع
  const updateTask = async (updates: any) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      } else {
        alert(data.error || 'فشل في تحديث المهمة');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // تغيير الحالة مباشرة
  const changeStatus = async (newStatus: string) => {
    await updateTask({ status: newStatus });
  };

  // تغيير الأولوية مباشرة
  const changePriority = async (newPriority: string) => {
    await updateTask({ priority: newPriority });
  };

  // تغيير المسؤول
  const changeAssignee = async (newAssignee: string) => {
    await updateTask({ assignedTo: newAssignee });
  };

  // تحديث التقدم
  const updateProgress = async (newProgress: number) => {
    await updateTask({ progress: newProgress });
  };

  // حذف المهمة
  const deleteTask = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        navigate('/tasks');
      } else {
        alert(data.error || 'فشل في حذف المهمة');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // رفع مرفق
  const uploadAttachment = async (file: File) => {
    try {
      setUploading(true);
      const token = localStorage.getItem('accessToken');
      
      // رفع الملف أولاً
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(buildApiUrl('upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadResponse.json();
      if (uploadData.success) {
        // إضافة المرفق للمهمة
        await fetch(buildApiUrl(`tasks/${id}/attachments`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: uploadData.fileName,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            filePath: uploadData.filePath
          })
        });
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
    } finally {
      setUploading(false);
    }
  };

  // حذف مرفق
  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/attachments/${attachmentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'IN_PROGRESS': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'في الانتظار';
      case 'IN_PROGRESS': return 'قيد التنفيذ';
      case 'COMPLETED': return 'مكتمل';
      case 'CANCELLED': return 'ملغي';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'LOW': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'عاجل';
      case 'HIGH': return 'عالي';
      case 'MEDIUM': return 'متوسط';
      case 'LOW': return 'منخفض';
      default: return priority;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">المهمة غير موجودة</p>
        <Link to="/tasks" className="text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">
          العودة للمهام
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/tasks"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeftIcon className="h-5 w-5 ml-2" />
              العودة
            </Link>
            {task.parentTask && (
              <Link
                to={`/tasks/${task.parentTask.id}`}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ← {task.parentTask.title}
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* Timer Button */}
            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <button
                onClick={runningTimer?.taskId === task.id ? stopTimer : startTimer}
                disabled={runningTimer && runningTimer.taskId !== task.id}
                className={`inline-flex items-center px-4 py-2 rounded-md ${
                  runningTimer?.taskId === task.id
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : runningTimer
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {runningTimer?.taskId === task.id ? (
                  <>
                    <StopIcon className="h-5 w-5 ml-2" />
                    إيقاف المؤقت
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5 ml-2" />
                    بدء المؤقت
                  </>
                )}
              </button>
            )}

            {/* Watch Button */}
            <button
              onClick={toggleWatcher}
              className={`inline-flex items-center px-4 py-2 rounded-md border ${
                task.watchersList.some((w: any) => w.id === localStorage.getItem('userId'))
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <EyeIcon className="h-5 w-5 ml-2" />
              {task.watchersList.some((w: any) => w.id === localStorage.getItem('userId'))
                ? 'متابَع'
                : 'متابعة'}
            </button>

            <Link
              to={`/tasks?edit=${task.id}`}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              <PencilIcon className="h-5 w-5 ml-2" />
              تعديل
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{task.title}</h1>
                <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
                  {/* Status Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPriorityDropdown(false); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)} cursor-pointer hover:opacity-80`}
                    >
                      {getStatusText(task.status)} ▼
                    </button>
                    {showStatusDropdown && (
                      <div                       className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[140px]">
                        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
                          <button
                            key={status}
                            onClick={() => { changeStatus(status); setShowStatusDropdown(false); }}
                            className={`block w-full text-right px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 ${task.status === status ? 'bg-gray-50 dark:bg-gray-900 font-medium' : ''}`}
                          >
                            {getStatusText(status)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Priority Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowStatusDropdown(false); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)} cursor-pointer hover:opacity-80`}
                    >
                      {getPriorityText(task.priority)} ▼
                    </button>
                    {showPriorityDropdown && (
                      <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[120px]">
                        {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                          <button
                            key={priority}
                            onClick={() => { changePriority(priority); setShowPriorityDropdown(false); }}
                            className={`block w-full text-right px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 ${task.priority === priority ? 'bg-gray-50 dark:bg-gray-900 font-medium' : ''}`}
                          >
                            {getPriorityText(priority)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {task.project && (
                    <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FolderIcon className="h-4 w-4 ml-1" />
                      {task.project.name}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                    deleteTask();
                  }
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                title="حذف المهمة"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Progress with Edit */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">التقدم</span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={task.progress}
                    onChange={(e) => updateProgress(parseInt(e.target.value))}
                    className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-medium w-10">{task.progress}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Assignee Change */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">المسؤول:</span>
              <select
                value={task.assignedUser?.id || ''}
                onChange={(e) => changeAssignee(e.target.value)}
                className="border border-gray-200 dark:border-gray-700-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">الوصف</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{task.description || 'لا يوجد وصف'}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="border-b border-gray-200 dark:border-gray-700-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'subtasks', label: 'المهام الفرعية', count: task.subtasks.length },
                  { id: 'checklists', label: 'قوائم التحقق', count: 0, icon: ListBulletIcon },
                  { id: 'dependencies', label: 'التبعيات', count: 0, icon: LinkIcon },
                  { id: 'comments', label: 'التعليقات', count: task.comments.length },
                  { id: 'time', label: 'سجل الوقت', count: task.timeEntries.length },
                  { id: 'attachments', label: 'المرفقات', count: task.attachments.length },
                  { id: 'activity', label: 'النشاطات', count: task.activities.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="mr-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Subtasks Tab */}
              {activeTab === 'subtasks' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">المهام الفرعية</h3>
                    <button
                      onClick={() => setShowSubtaskForm(!showSubtaskForm)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 ml-1" />
                      إضافة مهمة فرعية
                    </button>
                  </div>

                  {showSubtaskForm && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                      <input
                        type="text"
                        placeholder="عنوان المهمة الفرعية"
                        value={newSubtask.title}
                        onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <textarea
                        placeholder="الوصف (اختياري)"
                        value={newSubtask.description}
                        onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <button
                          onClick={() => setShowSubtaskForm(false)}
                          className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={createSubtask}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {task.subtasks.map((subtask: any) => (
                      <div
                        key={subtask.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center">
                          <button
                            onClick={() => updateSubtaskStatus(
                              subtask.id,
                              subtask.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
                            )}
                            className={`w-5 h-5 rounded border-2 ml-3 flex items-center justify-center ${
                              subtask.status === 'COMPLETED'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-200 dark:border-gray-700-300 hover:border-indigo-500'
                            }`}
                          >
                            {subtask.status === 'COMPLETED' && <CheckIcon className="h-3 w-3" />}
                          </button>
                          <div>
                            <Link
                              to={`/tasks/${subtask.id}`}
                              className={`font-medium ${
                                subtask.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                              } hover:text-indigo-600`}
                            >
                              {subtask.title}
                            </Link>
                            {subtask.assignedUser && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {subtask.assignedUser.firstName} {subtask.assignedUser.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(subtask.status)}`}>
                          {getStatusText(subtask.status)}
                        </span>
                      </div>
                    ))}
                    {task.subtasks.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد مهام فرعية</p>
                    )}
                  </div>
                </div>
              )}

              {/* Checklists Tab */}
              {activeTab === 'checklists' && id && (
                <TaskChecklist 
                  taskId={id} 
                  onUpdate={fetchTaskDetails}
                />
              )}

              {/* Dependencies Tab */}
              {activeTab === 'dependencies' && id && (
                <TaskDependencies 
                  taskId={id} 
                  onUpdate={fetchTaskDetails}
                />
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div>
                  <div className="mb-4">
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      placeholder="أضف تعليقاً... استخدم @ للإشارة لشخص"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        إرسال
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {task.comments.map((comment: any) => (
                      <div key={comment.id} className="border-b border-gray-200 dark:border-gray-700-100 pb-4">
                        <div className="flex items-start">
                          {comment.user?.avatar ? (
                            <img src={comment.user.avatar} alt="" className="h-8 w-8 rounded-full ml-3" />
                          ) : (
                            <UserCircleIcon className="h-8 w-8 text-gray-400 ml-3" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {comment.user?.firstName} {comment.user?.lastName}
                              </span>
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.createdAt).toLocaleString('ar-EG')}
                                  {comment.isEdited && ' (معدّل)'}
                                </span>
                                {comment.userId === localStorage.getItem('userId') && (
                                  <div className="flex space-x-1 space-x-reverse">
                                    <button
                                      onClick={() => {
                                        setEditingComment(comment.id);
                                        setEditCommentContent(comment.content);
                                      }}
                                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                      title="تعديل"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteComment(comment.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                      title="حذف"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingComment === comment.id ? (
                              <div className="mt-2">
                                <textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  rows={2}
                                />
                                <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                                  <button
                                    onClick={() => {
                                      setEditingComment(null);
                                      setEditCommentContent('');
                                    }}
                                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    onClick={() => updateComment(comment.id)}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                  >
                                    حفظ
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{renderWithMentions(comment.content)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {task.comments.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد تعليقات</p>
                    )}
                  </div>
                </div>
              )}

              {/* Time Entries Tab */}
              {activeTab === 'time' && (
                <div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">إجمالي الوقت المسجل</p>
                        <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                          {formatDuration(task.totalTimeMinutes)}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-600 dark:text-gray-400">الوقت المقدر</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.estimatedHours} ساعة</p>
                      </div>
                    </div>
                  </div>

                  {/* زر إضافة وقت يدوي */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowManualTimeForm(!showManualTimeForm)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 ml-1" />
                      إضافة وقت يدوي
                    </button>
                  </div>

                  {/* فورم إضافة الوقت اليدوي */}
                  {showManualTimeForm && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ساعات</label>
                          <input
                            type="number"
                            min="0"
                            value={manualTimeEntry.hours}
                            onChange={(e) => setManualTimeEntry({ ...manualTimeEntry, hours: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">دقائق</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={manualTimeEntry.minutes}
                            onChange={(e) => setManualTimeEntry({ ...manualTimeEntry, minutes: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">الوصف (اختياري)</label>
                        <input
                          type="text"
                          value={manualTimeEntry.description}
                          onChange={(e) => setManualTimeEntry({ ...manualTimeEntry, description: e.target.value })}
                          placeholder="ماذا عملت؟"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <button
                          onClick={() => setShowManualTimeForm(false)}
                          className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={addManualTime}
                          disabled={manualTimeEntry.hours === 0 && manualTimeEntry.minutes === 0}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {task.timeEntries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center">
                          <ClockIcon className="h-5 w-5 text-gray-400 ml-3" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(entry.duration)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.user?.firstName} {entry.user?.lastName} • 
                              {new Date(entry.startTime).toLocaleString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
                        )}
                      </div>
                    ))}
                    {task.timeEntries.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد سجلات وقت</p>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div>
                  {/* Upload Button */}
                  <div className="mb-4">
                    <label className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
                      <PaperClipIcon className="h-5 w-5 ml-2" />
                      {uploading ? 'جاري الرفع...' : 'رفع مرفق'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAttachment(file);
                        }}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {task.attachments.map((attachment: any) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center">
                          <PaperClipIcon className="h-5 w-5 text-gray-400 ml-3" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{attachment.originalName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(attachment.fileSize / 1024).toFixed(1)} KB • 
                              {attachment.user?.firstName} {attachment.user?.lastName} • 
                              {new Date(attachment.createdAt).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <a
                            href={attachment.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            title="تحميل"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          {attachment.userId === localStorage.getItem('userId') && (
                            <button
                              onClick={() => deleteAttachment(attachment.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="حذف"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {task.attachments.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد مرفقات</p>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {task.activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start">
                      {activity.user?.avatar ? (
                        <img src={activity.user.avatar} alt="" className="h-6 w-6 rounded-full ml-3" />
                      ) : (
                        <UserCircleIcon className="h-6 w-6 text-gray-400 ml-3" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {activity.user?.firstName} {activity.user?.lastName}
                          </span>
                          {' '}
                          {activity.description || activity.action}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(activity.createdAt).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {task.activities.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد نشاطات</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">معلومات المهمة</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">المسؤول</p>
                <div className="flex items-center mt-1">
                  {task.assignedUser?.avatar ? (
                    <img src={task.assignedUser.avatar} alt="" className="h-6 w-6 rounded-full ml-2" />
                  ) : (
                    <UserCircleIcon className="h-6 w-6 text-gray-400 ml-2" />
                  )}
                  <span className="text-gray-900 dark:text-gray-100">
                    {task.assignedUser?.firstName} {task.assignedUser?.lastName}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">منشئ المهمة</p>
                <div className="flex items-center mt-1">
                  {task.createdByUser?.avatar ? (
                    <img src={task.createdByUser.avatar} alt="" className="h-6 w-6 rounded-full ml-2" />
                  ) : (
                    <UserCircleIcon className="h-6 w-6 text-gray-400 ml-2" />
                  )}
                  <span className="text-gray-900 dark:text-gray-100">
                    {task.createdByUser?.firstName} {task.createdByUser?.lastName}
                  </span>
                </div>
              </div>

              {task.dueDate && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الاستحقاق</p>
                  <p className={`mt-1 flex items-center ${
                    new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                      ? 'text-red-600'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    <CalendarIcon className="h-4 w-4 ml-2" />
                    {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">الوقت المقدر</p>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{task.estimatedHours} ساعة</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">الوقت الفعلي</p>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{task.totalTimeHours} ساعة</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الإنشاء</p>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {new Date(task.createdAt).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          </div>

          {/* Watchers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">المتابعون ({task.watchersList.length})</h3>
            <div className="flex flex-wrap gap-2">
              {task.watchersList.map((watcher: any) => (
                <div
                  key={watcher.id}
                  className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                >
                  {watcher.avatar ? (
                    <img src={watcher.avatar} alt="" className="h-5 w-5 rounded-full ml-1" />
                  ) : (
                    <UserCircleIcon className="h-5 w-5 text-gray-400 ml-1" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {watcher.firstName}
                  </span>
                </div>
              ))}
              {task.watchersList.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">لا يوجد متابعون</p>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">العلامات</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPage;

