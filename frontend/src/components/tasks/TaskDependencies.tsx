import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  LinkIcon,
  PlusIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface Dependency {
  id: string;
  dependsOnTaskId: string;
  dependsOnTask: Task;
  type: 'blocks' | 'blocked_by' | 'related';
}

interface TaskDependenciesProps {
  taskId: string;
  dependencies?: string[];
  onUpdate?: () => void;
}

const TaskDependencies: React.FC<TaskDependenciesProps> = ({ taskId, onUpdate }) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<Dependency[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<Dependency[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'blocked_by' | 'related'>('blocked_by');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllTasks();
    fetchDependencies();
  }, [taskId]);

  const fetchAllTasks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // Exclude current task from the list
        setAllTasks(data.data.filter((t: Task) => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/dependencies`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTaskDependencies(data.data?.blocks || []);
        setBlockedByTasks(data.data?.blockedBy || []);
      }
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const addDependency = async () => {
    if (!selectedTaskId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/dependencies`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dependsOnId: selectedTaskId,
          type: dependencyType
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchDependencies();
        setShowAddModal(false);
        setSelectedTaskId('');
        onUpdate?.();
      } else {
        alert(data.error || 'فشل في إضافة التبعية');
      }
    } catch (error) {
      console.error('Error adding dependency:', error);
      alert('فشل في إضافة التبعية');
    } finally {
      setLoading(false);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذه التبعية؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/dependencies/${dependencyId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchDependencies();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error removing dependency:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'مكتمل';
      case 'in_progress': return 'قيد التنفيذ';
      case 'pending': return 'في الانتظار';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const filteredTasks = allTasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !taskDependencies.some(d => d.dependsOnTaskId === task.id) &&
    !blockedByTasks.some(d => d.dependsOnTaskId === task.id)
  );

  const hasBlockingIssues = blockedByTasks.some(
    d => d.dependsOnTask?.status?.toLowerCase() !== 'completed'
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <LinkIcon className="h-5 w-5 text-indigo-600 ml-2" />
          تبعيات المهمة
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 ml-1" />
          إضافة تبعية
        </button>
      </div>

      {hasBlockingIssues && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center text-yellow-800">
            <ExclamationTriangleIcon className="h-5 w-5 ml-2" />
            <span className="text-sm font-medium">هذه المهمة محظورة بمهام أخرى غير مكتملة</span>
          </div>
        </div>
      )}

      {/* Blocked By Section */}
      {blockedByTasks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <ArrowLeftIcon className="h-4 w-4 ml-1 text-red-500" />
            محظورة بـ (يجب إكمالها أولاً)
          </h4>
          <div className="space-y-2">
            {blockedByTasks.map(dep => (
              <div
                key={dep.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  dep.dependsOnTask?.status?.toLowerCase() === 'completed'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center">
                  {getStatusIcon(dep.dependsOnTask?.status)}
                  <Link
                    to={`/tasks/${dep.dependsOnTaskId}`}
                    className="mr-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {dep.dependsOnTask?.title}
                  </Link>
                  <span className="text-xs text-gray-500 mr-2">
                    ({getStatusText(dep.dependsOnTask?.status)})
                  </span>
                </div>
                <button
                  onClick={() => removeDependency(dep.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocks Section */}
      {taskDependencies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <ArrowRightIcon className="h-4 w-4 ml-1 text-blue-500" />
            تحظر (تنتظر إكمال هذه المهمة)
          </h4>
          <div className="space-y-2">
            {taskDependencies.map(dep => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 border-blue-200"
              >
                <div className="flex items-center">
                  {getStatusIcon(dep.dependsOnTask?.status)}
                  <Link
                    to={`/tasks/${dep.dependsOnTaskId}`}
                    className="mr-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {dep.dependsOnTask?.title}
                  </Link>
                  <span className="text-xs text-gray-500 mr-2">
                    ({getStatusText(dep.dependsOnTask?.status)})
                  </span>
                </div>
                <button
                  onClick={() => removeDependency(dep.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {taskDependencies.length === 0 && blockedByTasks.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد تبعيات لهذه المهمة</p>
        </div>
      )}

      {/* Add Dependency Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">إضافة تبعية</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع التبعية</label>
                <select
                  value={dependencyType}
                  onChange={(e) => setDependencyType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="blocked_by">محظورة بـ (يجب إكمال المهمة المحددة أولاً)</option>
                  <option value="blocks">تحظر (المهمة المحددة تنتظر إكمال هذه المهمة)</option>
                  <option value="related">مرتبطة بـ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث عن مهمة</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بعنوان المهمة..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر المهمة</label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                  {filteredTasks.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      لا توجد مهام متاحة
                    </div>
                  ) : (
                    filteredTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full text-right p-3 border-b last:border-b-0 hover:bg-gray-50 ${
                          selectedTaskId === task.id ? 'bg-indigo-50 border-indigo-200' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {getStatusIcon(task.status)}
                          <span className="mr-2 text-sm font-medium text-gray-900">{task.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">{getStatusText(task.status)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={addDependency}
                disabled={!selectedTaskId || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDependencies;
