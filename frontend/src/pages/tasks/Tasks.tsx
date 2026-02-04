import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  UserIcon,
  CalendarIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import RecurringTaskForm from '../../components/tasks/RecurringTaskForm';

interface TaskCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  taskCount: number;
  isActive: boolean;
}

interface Task {
  id: string;
  projectId: string;
  projectName: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  budget: number;
  spentBudget: number;
  progress: number;
  managerId: string;
  managerName: string;
  teamMembers: string[];
  tags: string[];
  createdAt: string;
}

const Tasks: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'categories'>('tasks');
  const [filters, setFilters] = useState({
    projectId: '',
    categoryId: '',
    status: '',
    priority: '',
    assignedTo: '',
    dueDateFrom: '',
    dueDateTo: '',
  });
  const [taskFilter, setTaskFilter] = useState<'all' | 'my-tasks' | 'assigned-by-me'>('all');
  const [hideCompleted, setHideCompleted] = useState(true); // إخفاء المهام المكتملة افتراضياً

  // New features states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'createdAt' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Users state
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; name?: string }[]>([]);

  // Project modals
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Edit states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);

  // Categories states
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  // Filter sidebar state
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    startDate: '',
    endDate: '',
    budget: 0,
    managerId: '',
    teamMembers: [] as string[],
    tags: [] as string[],
  });

  const [newTask, setNewTask] = useState({
    projectId: '',
    categoryId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    type: 'general',
    assignedTo: '1',
    assignedToName: 'أحمد المدير',
    createdBy: '1',
    createdByName: 'أحمد المدير',
    dueDate: '',
    estimatedHours: 0,
    tags: [] as string[],
  });

  // Recurring task state
  const [recurringConfig, setRecurringConfig] = useState({
    enabled: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: 1,
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    endType: 'never' as 'never' | 'date' | 'count',
    endDate: '',
    endCount: 10,
  });

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
    fetchCategories();
    fetchTemplates();
  }, [filters, taskFilter]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/templates'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const applyTemplate = (template: any) => {
    setNewTask({
      ...newTask,
      title: template.title,
      description: template.description || '',
      priority: template.priority || 'medium',
      estimatedHours: template.estimatedHours || 0,
      tags: template.tags || [],
    });
    setShowTemplateSelector(false);
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) return;

      const response = await fetch(buildApiUrl('tasks/company-users'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
        // Set default assignedTo to first user if available
        if (data.data && data.data.length > 0 && !newTask.assignedTo) {
          setNewTask(prev => ({
            ...prev,
            assignedTo: data.data[0].id,
            assignedToName: data.data[0].name
          }));
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(buildApiUrl('tasks/categories/list'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const createCategory = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!newCategory.name.trim()) {
        alert('اسم القسم مطلوب');
        return;
      }

      const response = await fetch(buildApiUrl('tasks/categories'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCategory),
      });

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        setShowCategoryModal(false);
        setNewCategory({ name: '', description: '', color: '#6366f1' });
        alert('تم إنشاء القسم بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء القسم');
      }
    } catch (error) {
      alert('فشل في إنشاء القسم');
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/categories/${editingCategory.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        setEditingCategory(null);
        alert('تم تحديث القسم بنجاح');
      } else {
        alert(data.error || 'فشل في تحديث القسم');
      }
    } catch (error) {
      alert('فشل في تحديث القسم');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/categories/${categoryId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        alert('تم حذف القسم بنجاح');
      } else {
        alert(data.error || 'فشل في حذف القسم');
      }
    } catch (error) {
      alert('فشل في حذف القسم');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      let url = 'tasks';

      // Use different endpoint based on filter
      if (taskFilter === 'my-tasks') {
        url = 'tasks/my-tasks';
      } else if (taskFilter === 'assigned-by-me') {
        url = 'tasks/assigned-by-me';
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const queryString = queryParams.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(buildApiUrl(fullUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) return;

      const response = await fetch(buildApiUrl('projects'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const createTask = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        alert('يجب تسجيل الدخول أولاً');
        return;
      }

      const url = buildApiUrl('tasks');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTask),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || data.error || `فشل في إنشاء المهمة (${response.status})`);
        return;
      }

      if (data.success) {
        fetchTasks();
        setShowCreateTaskModal(false);
        setNewTask({
          projectId: '',
          categoryId: '',
          title: '',
          description: '',
          priority: 'medium',
          type: 'general',
          assignedTo: '',
          assignedToName: '',
          createdBy: '1',
          createdByName: 'أحمد المدير',
          dueDate: '',
          estimatedHours: 0,
          tags: [],
        });
        alert('تم إنشاء المهمة بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء المهمة');
      }
    } catch (error) {
      alert('فشل في إنشاء المهمة');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string, progress?: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, progress }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.data);
        }
        alert('تم تحديث حالة المهمة بنجاح');
      }
    } catch (error) {
      alert('فشل في تحديث حالة المهمة');
    }
  };

  // Create Project
  const createProject = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowCreateProjectModal(false);
        setNewProject({
          name: '',
          description: '',
          priority: 'medium',
          startDate: '',
          endDate: '',
          budget: 0,
          managerId: '',
          teamMembers: [],
          tags: [],
        });
        alert('تم إنشاء المشروع بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء المشروع');
      }
    } catch (error) {
      alert('فشل في إنشاء المشروع');
    }
  };

  // Update Task
  const updateTask = async () => {
    if (!editingTask) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${editingTask.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTask),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowEditTaskModal(false);
        setEditingTask(null);
        alert('تم تحديث المهمة بنجاح');
      } else {
        alert(data.error || 'فشل في تحديث المهمة');
      }
    } catch (error) {
      alert('فشل في تحديث المهمة');
    }
  };

  // Delete Task
  const deleteTask = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowTaskModal(false);
        setSelectedTask(null);
        alert('تم حذف المهمة بنجاح');
      } else {
        alert(data.error || 'فشل في حذف المهمة');
      }
    } catch (error) {
      alert('فشل في حذف المهمة');
    }
  };

  // Update Project
  const updateProject = async () => {
    if (!editingProject) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`projects/${editingProject.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProject),
      });

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowEditProjectModal(false);
        setEditingProject(null);
        alert('تم تحديث المشروع بنجاح');
      } else {
        alert(data.error || 'فشل في تحديث المشروع');
      }
    } catch (error) {
      alert('فشل في تحديث المشروع');
    }
  };

  // Delete Project
  const deleteProject = async (projectId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشروع؟')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`projects/${projectId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowProjectModal(false);
        setSelectedProject(null);
        alert('تم حذف المشروع بنجاح');
      } else {
        alert(data.error || 'فشل في حذف المشروع');
      }
    } catch (error) {
      alert('فشل في حذف المشروع');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'عاجل';
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return priority;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'completed';
  };

  // Priority order for sorting
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
  const statusOrder = { pending: 1, in_progress: 2, completed: 3, cancelled: 4 };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => {
      // Hide completed tasks filter (unless status filter is specifically set to completed)
      const taskStatus = task.status?.toLowerCase();
      if (hideCompleted && !filters.status && (taskStatus === 'completed' || taskStatus === 'cancelled')) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) &&
          !task.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Existing filters
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.categoryId && task.categoryId !== filters.categoryId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignedTo && task.assignedTo !== filters.assignedTo) return false;
      // Date range filter
      if (filters.dueDateFrom && task.dueDate && new Date(task.dueDate) < new Date(filters.dueDateFrom)) return false;
      if (filters.dueDateTo && task.dueDate && new Date(task.dueDate) > new Date(filters.dueDateTo)) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate || '9999-12-31').getTime() - new Date(b.dueDate || '9999-12-31').getTime();
          break;
        case 'priority':
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'status':
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'ar');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = filteredAndSortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats (case-insensitive)
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status?.toLowerCase() === 'pending').length,
    inProgress: tasks.filter(t => t.status?.toLowerCase() === 'in_progress').length,
    completed: tasks.filter(t => t.status?.toLowerCase() === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate, t.status)).length,
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedTasks.length === paginatedTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedTasks.map(t => t.id));
    }
  };

  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;

    const token = localStorage.getItem('accessToken');
    for (const taskId of selectedTasks) {
      await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    fetchTasks();
    setSelectedTasks([]);
    alert(`تم تحديث ${selectedTasks.length} مهمة`);
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedTasks.length} مهمة؟`)) return;

    const token = localStorage.getItem('accessToken');
    for (const taskId of selectedTasks) {
      await fetch(buildApiUrl(`tasks/${taskId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    fetchTasks();
    setSelectedTasks([]);
    alert(`تم حذف ${selectedTasks.length} مهمة`);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['العنوان', 'الوصف', 'المشروع', 'المسؤول', 'الحالة', 'الأولوية', 'التقدم', 'تاريخ الاستحقاق'];
    const rows = filteredAndSortedTasks.map(task => [
      task.title,
      task.description,
      task.projectName,
      task.assignedToName,
      getStatusText(task.status),
      getPriorityText(task.priority),
      `${task.progress}%`,
      task.dueDate ? formatDate(task.dueDate) : 'غير محدد'
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              إدارة المهام والمشاريع
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">تنظيم ومتابعة المهام والمشاريع</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link
              to="/tasks/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 flex-1 md:flex-none"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              لوحة التحكم
            </Link>
            <Link
              to="/tasks/kanban"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 md:flex-none"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              عرض Kanban
            </Link>
            <Link
              to="/tasks/notifications"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 md:flex-none"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              الإشعارات
            </Link>
            <Link
              to="/tasks/calendar"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 md:flex-none"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              التقويم
            </Link>
            <Link
              to="/tasks/time-reports"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 md:flex-none"
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              تقارير الوقت
            </Link>
            <Link
              to="/tasks/templates"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 md:flex-none"
            >
              <FolderIcon className="h-5 w-5 mr-2" />
              القوالب
            </Link>
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              مهمة جديدة
            </button>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              مشروع جديد
            </button>
          </div>
        </div>
      </div>













      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المهام</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{taskStats.total}</p>
            </div>
            <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">في الانتظار</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{taskStats.pending}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400 dark:text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">قيد التنفيذ</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</p>
            </div>
            <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">مكتملة</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">{taskStats.completed}</p>
            </div>
            <CheckIcon className="h-10 w-10 text-green-400 dark:text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">متأخرة</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">{taskStats.overdue}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 text-red-400 dark:text-red-500" />
          </div>
        </div>
      </div >

      {/* Tabs */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 space-x-reverse px-4">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'tasks'
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                المهام ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'projects'
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                المشاريع ({projects.length})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'categories'
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                الأقسام ({categories.length})
              </button>
            </nav>
          </div>
        </div>
      </div>

      {
        activeTab === 'tasks' && (
          <>
            {/* Search and Actions Bar */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بحث في المهام..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Sort */}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="createdAt">تاريخ الإنشاء</option>
                    <option value="dueDate">تاريخ الاستحقاق</option>
                    <option value="priority">الأولوية</option>
                    <option value="status">الحالة</option>
                    <option value="title">العنوان</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilterSidebar(true)}
                  className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${Object.values(filters).some(v => v)
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                >
                  <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  الفلاتر
                  {Object.values(filters).filter(v => v).length > 0 && (
                    <span className="mr-2 bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                      {Object.values(filters).filter(v => v).length}
                    </span>
                  )}
                </button>

                {/* Export */}
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تصدير CSV
                </button>
              </div>

              {/* Task Filter Tabs */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-4 space-x-reverse">
                  <button
                    onClick={() => setTaskFilter('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${taskFilter === 'all'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    جميع المهام
                  </button>
                  <button
                    onClick={() => setTaskFilter('my-tasks')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${taskFilter === 'my-tasks'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    مهامي
                  </button>
                  <button
                    onClick={() => setTaskFilter('assigned-by-me')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${taskFilter === 'assigned-by-me'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    المهام التي أنشأتها
                  </button>
                </div>

                {/* Hide Completed Toggle */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">إخفاء المهام المكتملة</span>
                    <input
                      type="checkbox"
                      checked={hideCompleted}
                      onChange={(e) => setHideCompleted(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700"
                    />
                  </label>
                  {hideCompleted && taskStats.completed > 0 && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      {taskStats.completed} مكتملة مخفية
                    </span>
                  )}
                  {!hideCompleted && taskStats.completed > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (يتم عرض {taskStats.completed} مكتملة)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedTasks.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-700 dark:text-indigo-300">
                    تم تحديد {selectedTasks.length} مهمة
                  </span>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      onClick={() => handleBulkStatusChange('in_progress')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      بدء التنفيذ
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange('completed')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      إكمال
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      حذف
                    </button>
                    <button
                      onClick={() => setSelectedTasks([])}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {Object.values(filters).some(v => v) && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">الفلاتر النشطة:</span>
                    {filters.projectId && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        المشروع: {projects.find(p => p.id === filters.projectId)?.name}
                        <button onClick={() => setFilters({ ...filters, projectId: '' })} className="mr-1 hover:text-indigo-900 dark:hover:text-indigo-200">×</button>
                      </span>
                    )}
                    {filters.categoryId && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        القسم: {categories.find(c => c.id === filters.categoryId)?.name}
                        <button onClick={() => setFilters({ ...filters, categoryId: '' })} className="mr-1 hover:text-indigo-900">×</button>
                      </span>
                    )}
                    {filters.status && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        الحالة: {filters.status === 'pending' ? 'في الانتظار' : filters.status === 'in_progress' ? 'قيد التنفيذ' : filters.status === 'completed' ? 'مكتمل' : 'ملغي'}
                        <button onClick={() => setFilters({ ...filters, status: '' })} className="mr-1 hover:text-indigo-900">×</button>
                      </span>
                    )}
                    {filters.priority && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        الأولوية: {filters.priority === 'urgent' ? 'عاجل' : filters.priority === 'high' ? 'عالي' : filters.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        <button onClick={() => setFilters({ ...filters, priority: '' })} className="mr-1 hover:text-indigo-900">×</button>
                      </span>
                    )}
                    {filters.assignedTo && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        المسؤول: {users.find(u => u.id === filters.assignedTo)?.firstName}
                        <button onClick={() => setFilters({ ...filters, assignedTo: '' })} className="mr-1 hover:text-indigo-900">×</button>
                      </span>
                    )}
                    {(filters.dueDateFrom || filters.dueDateTo) && (
                      <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
                        التاريخ: {filters.dueDateFrom || '...'} - {filters.dueDateTo || '...'}
                        <button onClick={() => setFilters({ ...filters, dueDateFrom: '', dueDateTo: '' })} className="mr-1 hover:text-indigo-900">×</button>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setFilters({ projectId: '', categoryId: '', status: '', priority: '', assignedTo: '', dueDateFrom: '', dueDateTo: '' }); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                  >
                    مسح الكل
                  </button>
                </div>
              </div>
            )}

            {/* Tasks List - Responsive Layout */}
            <div className="space-y-4">

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 mb-4">
                {paginatedTasks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">لا توجد مهام</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم العثور على مهام تطابق المعايير المحددة.</p>
                  </div>
                )}
                {paginatedTasks.map((task) => (
                  <div key={task.id} className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-r-4 ${task.priority === 'urgent' ? 'border-red-500' :
                    task.priority === 'high' ? 'border-orange-500' :
                      task.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
                    } ${isOverdue(task.dueDate, task.status) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => handleSelectTask(task.id)}
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700 mr-2"
                          />
                        </div>
                        <Link to={`/tasks/${task.id}`} className="block">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1 hover:text-indigo-600 dark:hover:text-indigo-400">{task.title}</h3>
                        </Link>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center">
                        <FolderIcon className="h-4 w-4 ml-1" />
                        <span className="truncate">{task.projectName}</span>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 ml-1" />
                        <span className="truncate">{task.assignedToName}</span>
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 ml-1" />
                        <span className={isOverdue(task.dueDate, task.status) ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                          {task.dueDate ? formatDate(task.dueDate) : 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium ml-1">التقدم:</span>
                        <span>{task.progress}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
                      <div className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-3">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full"
                        title="عرض"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowEditTaskModal(true);
                        }}
                        className="p-2 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-full"
                        title="تعديل"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                        title="حذف"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          بدء
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          إكمال
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                {/* Results info */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    عرض {paginatedTasks.length} من {filteredAndSortedTasks.length} مهمة
                    {searchQuery && ` (بحث: "${searchQuery}")`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTasks.length === paginatedTasks.length && paginatedTasks.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700"
                          />
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          المهمة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المشروع
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المسؤول
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الأولوية
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          التقدم
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          تاريخ الاستحقاق
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedTasks.map((task) => (
                        <tr key={task.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isOverdue(task.dueDate, task.status) ? 'bg-red-50 dark:bg-red-900/20' : ''} ${selectedTasks.includes(task.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => handleSelectTask(task.id)}
                              className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link to={`/tasks/${task.id}`} className="block hover:text-indigo-600">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                                {task.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {task.description?.substring(0, 50)}...
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              <FolderIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                              {task.projectName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              <UserIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                              {task.assignedToName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                              <span className="mr-1">{getStatusText(task.status)}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityText(task.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
                                {task.progress}%
                              </div>
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {task.dueDate ?
                                formatDate(task.dueDate) :
                                'غير محدد'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2 space-x-reverse">
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowTaskModal(true);
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                title="عرض"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setShowEditTaskModal(true);
                                }}
                                className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-900 dark:hover:text-yellow-400"
                                title="تعديل"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                title="حذف"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  بدء
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  إكمال
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedTasks.length === 0 && (
                  <div className="text-center py-12">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">لا توجد مهام</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم العثور على مهام تطابق المعايير المحددة.</p>
                  </div>
                )}
              </div>   {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    صفحة {currentPage} من {totalPages}
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      الأولى
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      السابق
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 border rounded-md text-sm ${currentPage === pageNum
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      التالي
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      الأخيرة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      }

      {
        activeTab === 'projects' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{project.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      project.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        project.status === 'planning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                      {project.status === 'active' ? 'نشط' :
                        project.status === 'completed' ? 'مكتمل' :
                          project.status === 'planning' ? 'تخطيط' : 'متوقف'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">التقدم:</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>المدير:</span>
                      <span>{project.managerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الميزانية:</span>
                      <span>{formatPrice(project.budget || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المنفق:</span>
                      <span>{formatPrice(project.spentBudget || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تاريخ الانتهاء:</span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {project.tags && Array.isArray(project.tags) && project.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Project Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2 space-x-reverse">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowProjectModal(true);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      title="عرض"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(project);
                        setShowEditProjectModal(true);
                      }}
                      className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-900 dark:hover:text-yellow-400"
                      title="تعديل"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      title="حذف"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-12">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">لا توجد مشاريع</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم إنشاء أي مشاريع بعد.</p>
              </div>
            )}
          </div>
        )
      }

      {/* Categories Tab */}
      {
        activeTab === 'categories' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">أقسام المهام</h3>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                قسم جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{category.name}</h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {category.taskCount} مهمة
                    </span>
                  </div>

                  {category.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{category.description}</p>
                  )}

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-900 dark:hover:text-yellow-400"
                      title="تعديل"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      title="حذف"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">لا توجد أقسام</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم إنشاء أي أقسام بعد.</p>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  إنشاء قسم
                </button>
              </div>
            )}
          </div>
        )
      }

      {/* Create Category Modal */}
      {
        showCategoryModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">إنشاء قسم جديد</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القسم *</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: إعلانات، برمجة، تصوير..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="وصف القسم (اختياري)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-2">
                      {['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-8 h-8 rounded-full border-2 ${newCategory.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={createCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  إنشاء القسم
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Category Modal */}
      {
        editingCategory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">تعديل القسم</h3>
                <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم *</label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <textarea
                    value={editingCategory.description || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="color"
                      value={editingCategory.color}
                      onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-2">
                      {['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map(color => (
                        <button
                          key={color}
                          onClick={() => setEditingCategory({ ...editingCategory, color })}
                          className={`w-8 h-8 rounded-full border-2 ${editingCategory.color === color ? 'border-gray-900' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Create Task Modal */}
      {
        showCreateTaskModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">إنشاء مهمة جديدة</h3>
                <div className="flex items-center space-x-2 space-x-reverse">
                  {/* Template Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                      className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 ml-1" />
                      من قالب
                    </button>
                    {showTemplateSelector && templates.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-48 overflow-y-auto">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">{template.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowCreateTaskModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="عنوان المهمة"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف *</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="وصف المهمة"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المشروع</label>
                    <select
                      value={newTask.projectId}
                      onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">بدون مشروع</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <select
                      value={newTask.categoryId}
                      onChange={(e) => setNewTask({ ...newTask, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">بدون قسم</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">منخفض</option>
                      <option value="medium">متوسط</option>
                      <option value="high">عالي</option>
                      <option value="urgent">عاجل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المسؤول</label>
                    <select
                      value={newTask.assignedTo}
                      onChange={(e) => {
                        const selectedUser = users.find(u => u.id === e.target.value);
                        setNewTask({
                          ...newTask,
                          assignedTo: e.target.value,
                          assignedToName: selectedUser ? (selectedUser.name || `${selectedUser.firstName} ${selectedUser.lastName}`) : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">اختر مستخدم</option>
                      {users.length > 0 ? users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || `${user.firstName} ${user.lastName}`}
                        </option>
                      )) : (
                        <option value="">لا يوجد مستخدمين</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الساعات المقدرة</label>
                  <input
                    type="number"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>

                {/* Recurring Task Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <ArrowPathIcon className="h-5 w-5 ml-2 text-indigo-600" />
                      مهمة متكررة
                    </label>
                    <button
                      type="button"
                      onClick={() => setRecurringConfig({ ...recurringConfig, enabled: !recurringConfig.enabled })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${recurringConfig.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${recurringConfig.enabled ? '-translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  {recurringConfig.enabled && (
                    <RecurringTaskForm
                      value={recurringConfig}
                      onChange={setRecurringConfig}
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={createTask}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  إنشاء المهمة
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Task Details Modal */}
      {
        showTaskModal && selectedTask && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">تفاصيل المهمة</h3>
                  <Link
                    to={`/tasks/${selectedTask.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
                  >
                    فتح الصفحة الكاملة ←
                  </Link>
                </div>
                <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedTask.title}</h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedTask.description}</p>
                </div>

                {/* Quick Controls */}
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-3">تحكم سريع</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Status */}
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الحالة</label>
                      <select
                        value={selectedTask.status?.toLowerCase()}
                        onChange={async (e) => {
                          await updateTaskStatus(selectedTask.id, e.target.value);
                          setSelectedTask({ ...selectedTask, status: e.target.value as any });
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pending">في الانتظار</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">الأولوية</label>
                      <select
                        value={selectedTask.priority?.toLowerCase()}
                        onChange={async (e) => {
                          const token = localStorage.getItem('accessToken');
                          await fetch(buildApiUrl(`tasks/${selectedTask.id}`), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ priority: e.target.value }),
                          });
                          setSelectedTask({ ...selectedTask, priority: e.target.value as any });
                          fetchTasks();
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="low">منخفض</option>
                        <option value="medium">متوسط</option>
                        <option value="high">عالي</option>
                        <option value="urgent">عاجل</option>
                      </select>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">المسؤول</label>
                      <select
                        value={selectedTask.assignedTo}
                        onChange={async (e) => {
                          const token = localStorage.getItem('accessToken');
                          const user = users.find(u => u.id === e.target.value);
                          await fetch(buildApiUrl(`tasks/${selectedTask.id}`), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ assignedTo: e.target.value }),
                          });
                          setSelectedTask({
                            ...selectedTask,
                            assignedTo: e.target.value,
                            assignedToName: user ? `${user.firstName} ${user.lastName}` : ''
                          });
                          fetchTasks();
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">اختر مسؤول</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Progress */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">التقدم: {selectedTask.progress}%</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={selectedTask.progress}
                          onChange={async (e) => {
                            const newProgress = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setSelectedTask({ ...selectedTask, progress: newProgress });
                          }}
                          onBlur={async () => {
                            const token = localStorage.getItem('accessToken');
                            await fetch(buildApiUrl(`tasks/${selectedTask.id}`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ progress: selectedTask.progress }),
                            });
                            fetchTasks();
                          }}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="text-sm text-gray-500 dark:text-gray-400">المشروع</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedTask.projectName}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="text-sm text-gray-500 dark:text-gray-400">المسؤول</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedTask.assignedToName}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="text-sm text-gray-500 dark:text-gray-400">الحالة</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الأولوية</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      {getPriorityText(selectedTask.priority)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">التقدم</span>
                      <div className="flex items-center mt-1">
                      <span className="font-medium mr-2 text-gray-900 dark:text-gray-100">{selectedTask.progress}%</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full" style={{ width: `${selectedTask.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="text-sm text-gray-500 dark:text-gray-400">تاريخ الاستحقاق</span>
                    <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'غير محدد'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الساعات المقدرة</span>
                    <p className="font-medium">{selectedTask.estimatedHours} ساعة</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الساعات الفعلية</span>
                    <p className="font-medium">{selectedTask.actualHours} ساعة</p>
                  </div>
                </div>

                {selectedTask.tags && Array.isArray(selectedTask.tags) && selectedTask.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">الوسوم</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => deleteTask(selectedTask.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  حذف المهمة
                </button>
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => {
                      setEditingTask(selectedTask);
                      setShowTaskModal(false);
                      setShowEditTaskModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    تعديل
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Task Modal */}
      {
        showEditTaskModal && editingTask && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">تعديل المهمة</h3>
                <button onClick={() => setShowEditTaskModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان *</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف *</label>
                  <textarea
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as 'pending' | 'in_progress' | 'completed' | 'cancelled' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="pending">في الانتظار</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                    <select
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">منخفض</option>
                      <option value="medium">متوسط</option>
                      <option value="high">عالي</option>
                      <option value="urgent">عاجل</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التقدم (%)</label>
                    <input
                      type="number"
                      value={editingTask.progress}
                      onChange={(e) => setEditingTask({ ...editingTask, progress: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={editingTask.dueDate ? editingTask.dueDate.split('T')[0] : ''}
                      onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الساعات المقدرة</label>
                    <input
                      type="number"
                      value={editingTask.estimatedHours}
                      onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الساعات الفعلية</label>
                    <input
                      type="number"
                      value={editingTask.actualHours}
                      onChange={(e) => setEditingTask({ ...editingTask, actualHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowEditTaskModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateTask}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Create Project Modal */}
      {
        showCreateProjectModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">إنشاء مشروع جديد</h3>
                <button onClick={() => setShowCreateProjectModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المشروع *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اسم المشروع"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف *</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="وصف المشروع"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">منخفض</option>
                      <option value="medium">متوسط</option>
                      <option value="high">عالي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الميزانية</label>
                    <input
                      type="number"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({ ...newProject, budget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مدير المشروع</label>
                  <select
                    value={newProject.managerId}
                    onChange={(e) => setNewProject({ ...newProject, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر المدير</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={createProject}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  إنشاء المشروع
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Project Details Modal */}
      {
        showProjectModal && selectedProject && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">تفاصيل المشروع</h3>
                <button onClick={() => setShowProjectModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedProject.name}</h4>
                  <p className="text-gray-600 mt-2">{selectedProject.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الحالة</span>
                    <span className={`block mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedProject.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedProject.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        selectedProject.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {selectedProject.status === 'active' ? 'نشط' :
                        selectedProject.status === 'completed' ? 'مكتمل' :
                          selectedProject.status === 'planning' ? 'تخطيط' : 'متوقف'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الأولوية</span>
                    <span className={`block mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedProject.priority)}`}>
                      {getPriorityText(selectedProject.priority)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">المدير</span>
                    <p className="font-medium">{selectedProject.managerName}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">التقدم</span>
                    <div className="flex items-center mt-1">
                      <span className="font-medium mr-2">{selectedProject.progress}%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${selectedProject.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">الميزانية</span>
                    <p className="font-medium">{formatPrice(selectedProject.budget || 0)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">المنفق</span>
                    <p className="font-medium">{formatPrice(selectedProject.spentBudget || 0)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">تاريخ البدء</span>
                    <p className="font-medium">{selectedProject.startDate ? formatDate(selectedProject.startDate) : 'غير محدد'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-500">تاريخ الانتهاء</span>
                    <p className="font-medium">{selectedProject.endDate ? formatDate(selectedProject.endDate) : 'غير محدد'}</p>
                  </div>
                </div>

                {selectedProject.tags && Array.isArray(selectedProject.tags) && selectedProject.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">الوسوم</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedProject.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => deleteProject(selectedProject.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  حذف المشروع
                </button>
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => setShowProjectModal(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setShowProjectModal(false);
                      setShowEditProjectModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    تعديل
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Project Modal */}
      {
        showEditProjectModal && editingProject && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">تعديل المشروع</h3>
                <button onClick={() => setShowEditProjectModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المشروع *</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف *</label>
                  <textarea
                    value={editingProject.description}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                    <select
                      value={editingProject.status}
                      onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as 'planning' | 'active' | 'completed' | 'on_hold' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="planning">تخطيط</option>
                      <option value="active">نشط</option>
                      <option value="completed">مكتمل</option>
                      <option value="on_hold">متوقف</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                    <select
                      value={editingProject.priority}
                      onChange={(e) => setEditingProject({ ...editingProject, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">منخفض</option>
                      <option value="medium">متوسط</option>
                      <option value="high">عالي</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الميزانية</label>
                    <input
                      type="number"
                      value={editingProject.budget}
                      onChange={(e) => setEditingProject({ ...editingProject, budget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المنفق</label>
                    <input
                      type="number"
                      value={editingProject.spentBudget}
                      onChange={(e) => setEditingProject({ ...editingProject, spentBudget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                    <input
                      type="date"
                      value={editingProject.startDate ? editingProject.startDate.split('T')[0] : ''}
                      onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={editingProject.endDate ? editingProject.endDate.split('T')[0] : ''}
                      onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التقدم (%)</label>
                  <input
                    type="number"
                    value={editingProject.progress}
                    onChange={(e) => setEditingProject({ ...editingProject, progress: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowEditProjectModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateProject}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Filter Sidebar */}
      {
        showFilterSidebar && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setShowFilterSidebar(false)}
            />

            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <svg className="h-5 w-5 ml-2 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  فلترة المهام
                </h2>
                <button
                  onClick={() => setShowFilterSidebar(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="p-6 space-y-6">
                {/* Project Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المشروع
                  </label>
                  <select
                    value={filters.projectId}
                    onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">جميع المشاريع</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القسم
                  </label>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">جميع الأقسام</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: '', label: 'جميع الحالات', color: 'gray' },
                      { value: 'pending', label: 'في الانتظار', color: 'yellow' },
                      { value: 'in_progress', label: 'قيد التنفيذ', color: 'blue' },
                      { value: 'completed', label: 'مكتمل', color: 'green' },
                      { value: 'cancelled', label: 'ملغي', color: 'red' },
                    ].map((status) => (
                      <label key={status.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={filters.status === status.value}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700"
                        />
                        <span className={`mr-2 text-sm ${filters.status === status.value ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                          {status.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الأولوية
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: '', label: 'جميع الأولويات' },
                      { value: 'urgent', label: 'عاجل', color: 'bg-red-100 text-red-800' },
                      { value: 'high', label: 'عالي', color: 'bg-orange-100 text-orange-800' },
                      { value: 'medium', label: 'متوسط', color: 'bg-yellow-100 text-yellow-800' },
                      { value: 'low', label: 'منخفض', color: 'bg-green-100 text-green-800' },
                    ].map((priority) => (
                      <label key={priority.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={priority.value}
                          checked={filters.priority === priority.value}
                          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className={`mr-2 text-sm px-2 py-0.5 rounded ${priority.color || ''} ${filters.priority === priority.value ? 'font-medium' : ''}`}>
                          {priority.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Assigned To Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المسؤول
                  </label>
                  <select
                    value={filters.assignedTo}
                    onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">جميع المسؤولين</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || `${user.firstName} ${user.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الاستحقاق
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من</label>
                      <input
                        type="date"
                        value={filters.dueDateFrom}
                        onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى</label>
                      <input
                        type="date"
                        value={filters.dueDateTo}
                        onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setFilters({ projectId: '', categoryId: '', status: '', priority: '', assignedTo: '', dueDateFrom: '', dueDateTo: '' });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                >
                  إعادة تعيين
                </button>
                <button
                  onClick={() => setShowFilterSidebar(false)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  تطبيق الفلاتر
                </button>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
};

export default Tasks;

