import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  reporterName: string;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  releaseId: string | null;
  releaseVersion: string | null;
  dueDate: string | null;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  commentsCount: number;
  attachmentsCount: number;
  subtasksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import {
  TASK_TYPES,
  TASK_STATUSES,
  PRIORITY_CONFIG
} from '../../constants/taskConstants';


const DevTasksList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bulkAction, setBulkAction] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    type: searchParams.get('type') || '',
    projectId: searchParams.get('projectId') || '',
    assigneeId: searchParams.get('assigneeId') || '',
    component: searchParams.get('component') || '',
    releaseId: searchParams.get('releaseId') || '',
    dueDateFrom: searchParams.get('dueDateFrom') || '',
    dueDateTo: searchParams.get('dueDateTo') || '',
    tags: searchParams.get('tags') || '',
    dateType: 'dueDate', // dueDate, createdAt, updatedAt
  });

  // Pending filters for the sidebar (performance optimization)
  const [pendingFilters, setPendingFilters] = useState(filters);

  const [hideCompleted, setHideCompleted] = useState(true);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(() => {
    const saved = localStorage.getItem('devTasks_showMyTasksOnly');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('devTasks_showMyTasksOnly', String(showMyTasksOnly));
  }, [showMyTasksOnly]);

  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Sync pending filters when sidebar opens
  useEffect(() => {
    if (showFiltersSidebar) {
      setPendingFilters(filters);
    }
  }, [showFiltersSidebar]);

  useEffect(() => {
    fetchTasks();
    fetchSettings();
    fetchUserPermissions();
    fetchProjects();
    fetchTeamMembers();
    fetchReleases();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [pagination.page, pagination.limit, filters, sortBy, sortOrder, hideCompleted, showMyTasksOnly, currentMemberId]);

  const fetchUserPermissions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/user/permissions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserPermissions(data.data.permissions);
        if (data.data.memberId) {
          setCurrentMemberId(data.data.memberId);
        }
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

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

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/projects'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/team'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchReleases = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/releases'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReleases(data.data);
      }
    } catch (err) {
      console.error('Error fetching releases:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/dashboard'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams();
      //

      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.type) params.append('type', filters.type);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (showMyTasksOnly) {
        params.append('assigneeId', 'me');
      } else if (filters.assigneeId) {
        params.append('assigneeId', filters.assigneeId);
      }
      if (filters.component) params.append('component', filters.component);
      if (filters.releaseId) params.append('releaseId', filters.releaseId);
      if (filters.dateType) params.append('dateType', filters.dateType);
      if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
      if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
      if (filters.tags) params.append('tags', filters.tags);
      if (hideCompleted) params.append('excludeStatus', 'DONE');

      const response = await fetch(buildApiUrl(`super-admin/dev/tasks?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTasks();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePendingFilterChange = (key: string, value: string) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyPendingFilters = () => {
    setFilters(pendingFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFiltersSidebar(false);
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = pendingFilters.tags ? pendingFilters.tags.split(',') : [];
    if (!currentTags.includes(tag.trim())) {
      const newTags = [...currentTags, tag.trim()].join(',');
      handlePendingFilterChange('tags', newTags);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = pendingFilters.tags ? pendingFilters.tags.split(',') : [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove).join(',');
    handlePendingFilterChange('tags', newTags);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      priority: '',
      type: '',
      projectId: '',
      assigneeId: '',
      component: '',
      releaseId: '',
      dueDateFrom: '',
      dueDateTo: '',
      tags: '',
      dateType: 'dueDate'
    };
    setFilters(clearedFilters);
    setPendingFilters(clearedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleBulkAction = async () => {
    if (selectedTasks.length === 0 || !bulkAction) return;

    try {
      const token = localStorage.getItem('accessToken');

      if (bulkAction === 'delete') {
        if (!confirm(`هل أنت متأكد من حذف ${selectedTasks.length} مهمة؟`)) return;

        await Promise.all(
          selectedTasks.map(id =>
            fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );
      } else if (bulkAction.startsWith('status:')) {
        const status = bulkAction.split(':')[1];
        await Promise.all(
          selectedTasks.map(id =>
            fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status })
            })
          )
        );
      } else if (bulkAction.startsWith('assignee:')) {
        const assigneeId = bulkAction.split(':')[1];
        await Promise.all(
          selectedTasks.map(id =>
            fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ assigneeId })
            })
          )
        );
      }

      setSelectedTasks([]);
      setBulkAction('');
      fetchTasks();
    } catch (err) {
      console.error('Error performing bulk action:', err);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(
        buildApiUrl(`super-admin/dev/tasks/export?format=${format}&${params.toString()}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting tasks:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📋 قائمة المهام</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {pagination.total} مهمة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            تصدير CSV
          </button>
          <button
            onClick={() => navigate('/super-admin/dev-kanban')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <ViewColumnsIcon className="h-5 w-5" />
            Kanban
          </button>
          <button
            onClick={() => navigate('/super-admin/dev-tasks/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5" />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">المهام النشطة</p>
                <p className="text-2xl font-bold mt-1">{stats.overview?.totalTasks || 0}</p>
                <p className="text-blue-200 text-[10px] mt-0.5">غير المكتملة</p>
              </div>
              <ClipboardDocumentListIcon className="h-10 w-10 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs">قيد العمل</p>
                <p className="text-2xl font-bold mt-1">{stats.tasksByStatus?.IN_PROGRESS || 0}</p>
              </div>
              <ClockIcon className="h-10 w-10 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">مكتملة</p>
                <p className="text-2xl font-bold mt-1">{stats.tasksByStatus?.DONE || 0}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs">متأخرة</p>
                <p className="text-2xl font-bold mt-1">{stats.overview?.overdueTasks || 0}</p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-red-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">مشاريع نشطة</p>
                <p className="text-2xl font-bold mt-1">{stats.overview?.activeProjects || 0}</p>
              </div>
              <TagIcon className="h-10 w-10 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في المهام..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </form>

          {/* Quick Filters */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الحالات</option>
            {(settings?.taskStatuses || Object.entries(TASK_STATUSES).map(([key, value]) => ({ value: key, ...value }))).map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأولويات</option>
            {(settings?.taskPriorities || Object.entries(PRIORITY_CONFIG).map(([key, value]) => ({ value: key, ...value }))).map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأنواع</option>
            {Object.entries(TASK_TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm">إخفاء المكتملة</span>
          </label>

          <label className="flex items-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 bg-blue-50/50 dark:bg-blue-900/5 text-blue-700 dark:text-blue-300 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showMyTasksOnly}
              onChange={(e) => setShowMyTasksOnly(e.target.checked)}
              className="rounded border-blue-300 dark:border-blue-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">مهامي فقط</span>
          </label>

          <button
            onClick={() => setShowFiltersSidebar(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <FunnelIcon className="h-5 w-5" />
            فلاتر متقدمة
          </button>

          {(filters.status || filters.priority || filters.type || filters.search) && (
            <button
              onClick={clearFilters}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              مسح الفلاتر
            </button>
          )}
        </div>

      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTasks.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                {selectedTasks.length} مهمة محددة
              </span>
              <button
                onClick={() => setSelectedTasks([])}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                إلغاء التحديد
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="border border-indigo-300 dark:border-indigo-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">اختر إجراء...</option>
                <option value="delete">حذف المحدد</option>
                <optgroup label="تغيير الحالة">
                  <option value="status:TODO">للتنفيذ</option>
                  <option value="status:IN_PROGRESS">قيد العمل</option>
                  <option value="status:IN_REVIEW">مراجعة</option>
                  <option value="status:DONE">مكتمل</option>
                </optgroup>
                <optgroup label="تعيين مسؤول">
                  {teamMembers.map(member => (
                    <option key={member.id} value={`assignee:${member.userId}`}>{member.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                تنفيذ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('title')} className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    المهمة
                    {sortBy === 'title' && (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">النوع</th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    الحالة
                    {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('priority')} className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    الأولوية
                    {sortBy === 'priority' && (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">التقدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">المسؤول</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">المشروع</th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('dueDate')} className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    الاستحقاق
                    {sortBy === 'dueDate' && (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">لا توجد مهام</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">ابدأ بإنشاء مهمة جديدة لتتبع عمل فريقك</p>
                      <button
                        onClick={() => navigate('/super-admin/dev-tasks/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
                      >
                        <PlusIcon className="h-5 w-5" />
                        إنشاء مهمة جديدة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const typeInfo = TASK_TYPES[task.type] || TASK_TYPES['FEATURE'];

                  // Get status info from settings or default
                  const statusInfo = settings?.taskStatuses?.find((s: any) => s.value === task.status) || TASK_STATUSES[task.status] || TASK_STATUSES['BACKLOG'];

                  // Get priority info from settings or default
                  const priorityInfo = settings?.taskPriorities?.find((p: any) => p.value === task.priority) || PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['MEDIUM'];

                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/super-admin/dev-tasks/${task.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleSelectTask(task.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <Link
                            to={`/super-admin/dev-tasks/${task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-gray-900 dark:text-gray-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 block"
                          >
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-gray-400 dark:text-gray-500 text-xs">
                            {task.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ChatBubbleLeftIcon className="h-3 w-3" />
                                {task.commentsCount}
                              </span>
                            )}
                            {task.attachmentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <PaperClipIcon className="h-3 w-3" />
                                {task.attachmentsCount}
                              </span>
                            )}
                            {task.subtasksCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ClipboardDocumentListIcon className="h-3 w-3" />
                                {task.subtasksCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo?.bg || ''} ${typeInfo?.text || ''}`}>
                          {typeInfo?.icon}
                          {typeInfo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo?.bg || ''} ${statusInfo?.text || ''}`}>
                          {statusInfo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${priorityInfo?.color || ''}`}></span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{priorityInfo?.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{task.progress}%</span>
                            {task.estimatedHours > 0 && (
                              <span className="text-gray-500 dark:text-gray-500">
                                {task.actualHours}/{task.estimatedHours}h
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            {task.assigneeAvatar ? (
                              <img src={task.assigneeAvatar} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium">
                                {task.assigneeName.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">غير محدد</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.projectName ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.projectColor || '#6366f1' }}
                            ></span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{task.projectName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <span className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            <CalendarDaysIcon className="h-4 w-4" />
                            {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/super-admin/dev-tasks/${task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 block"
                            title="عرض"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          {/* 🔐 Show edit button only if user has canEdit permission */}
                          {userPermissions?.canEdit && (
                            <Link
                              to={`/super-admin/dev-tasks/${task.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 block"
                              title="تعديل"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                          )}
                          {/* 🔐 Show delete button only if user has canDelete permission */}
                          {userPermissions?.canDelete && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="حذف"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              عرض {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total}
            </div>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="10">10 / صفحة</option>
              <option value="20">20 / صفحة</option>
              <option value="50">50 / صفحة</option>
              <option value="100">100 / صفحة</option>
            </select>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                صفحة {pagination.page} من {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Sidebar */}
      {showFiltersSidebar && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowFiltersSidebar(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">فلاتر متقدمة</h2>
              <button
                onClick={() => setShowFiltersSidebar(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-6 space-y-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                  <select
                    value={pendingFilters.status}
                    onChange={(e) => handlePendingFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">كل الحالات</option>
                    {(settings?.taskStatuses || Object.entries(TASK_STATUSES).map(([key, value]) => ({ value: key, ...value }))).map((opt: any) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الأولوية</label>
                  <select
                    value={pendingFilters.priority}
                    onChange={(e) => handlePendingFilterChange('priority', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">كل الأولويات</option>
                    {(settings?.taskPriorities || Object.entries(PRIORITY_CONFIG).map(([key, value]) => ({ value: key, ...value }))).map((opt: any) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النوع</label>
                  <select
                    value={pendingFilters.type}
                    onChange={(e) => handlePendingFilterChange('type', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">كل الأنواع</option>
                    {Object.entries(TASK_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Project Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المشروع</label>
                  <select
                    value={pendingFilters.projectId}
                    onChange={(e) => handlePendingFilterChange('projectId', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">كل المشاريع</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المسؤول</label>
                  <select
                    value={pendingFilters.assigneeId}
                    onChange={(e) => handlePendingFilterChange('assigneeId', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">الكل</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                {/* Release Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الإصدار</label>
                  <select
                    value={pendingFilters.releaseId}
                    onChange={(e) => handlePendingFilterChange('releaseId', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">كل الإصدارات</option>
                    {releases.map(release => (
                      <option key={release.id} value={release.id}>v{release.version} - {release.name}</option>
                    ))}
                  </select>
                </div>

                {/* Component Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المكون</label>
                  <select
                    value={pendingFilters.component}
                    onChange={(e) => handlePendingFilterChange('component', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">الكل</option>
                    {/* Common Components List */}
                    {['Frontend', 'Backend', 'Database', 'API', 'AI System', 'WhatsApp', 'Facebook', 'Mobile App', 'Design', 'DevOps', 'QA'].map(comp => (
                      <option key={comp.toLowerCase()} value={comp.toLowerCase()}>{comp}</option>
                    ))}
                    {/* Dynamic Components from Settings if available */}
                    {settings?.components?.map((comp: string) => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ</label>
                  <div className="mb-2">
                    <select
                      value={pendingFilters.dateType}
                      onChange={(e) => handlePendingFilterChange('dateType', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-2"
                    >
                      <option value="dueDate">تاريخ الاستحقاق</option>
                      <option value="createdAt">تاريخ الإنشاء</option>
                      <option value="updatedAt">تاريخ التحديث</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من</label>
                      <input
                        type="date"
                        value={pendingFilters.dueDateFrom}
                        onChange={(e) => handlePendingFilterChange('dueDateFrom', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى</label>
                      <input
                        type="date"
                        value={pendingFilters.dueDateTo}
                        onChange={(e) => handlePendingFilterChange('dueDateTo', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags Filter (Pills UI) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوسوم</label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-500">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pendingFilters.tags && pendingFilters.tags.split(',').map((tag: string, idx: number) => (
                        tag.trim() && (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="hover:text-indigo-900 dark:hover:text-indigo-100"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="أضف وسماً واضغط Enter..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">اضغط Enter لإضافة الوسم</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      clearFilters();
                      setShowFiltersSidebar(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    مسح الكل
                  </button>
                  <button
                    onClick={applyPendingFilters}
                    className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
                  >
                    تطبيق الفلاتر
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTasksList;



