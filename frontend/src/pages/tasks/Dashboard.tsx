import React, { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';

interface DashboardStats {
  tasks: {
    totalTasks: number;
    myTasks: number;
    tasksByStatus: {
      pending: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
    myTasksByStatus: {
      pending: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
    tasksByPriority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    overdueTasks: number;
    myOverdueTasks: number;
    completionRate: number;
    myCompletionRate: number;
  };
  projects: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    planningProjects: number;
    onHoldProjects: number;
    averageProgress: number;
    totalBudget: number;
    totalSpent: number;
  };
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    projectName: string;
    assignedToName: string;
    createdAt: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/dashboard-stats'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'IN_PROGRESS': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'LOW': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12">فشل في تحميل الإحصائيات</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <ChartBarIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          لوحة التحكم
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">نظرة عامة على المهام والمشاريع</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المهام</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.tasks.totalTasks}</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">مهامي: </span>
            <span className="text-sm font-semibold text-indigo-600">{stats.tasks.myTasks}</span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المهام المتأخرة</p>
              <p className="text-3xl font-bold text-red-600">{stats.tasks.overdueTasks}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">مهامي المتأخرة: </span>
            <span className="text-sm font-semibold text-red-600">{stats.tasks.myOverdueTasks}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل الإنجاز</p>
              <p className="text-3xl font-bold text-green-600">{stats.tasks.completionRate}%</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">معدلي: </span>
            <span className="text-sm font-semibold text-green-600">{stats.tasks.myCompletionRate}%</span>
          </div>
        </div>

        {/* Total Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المشاريع</p>
              <p className="text-3xl font-bold text-gray-900">{stats.projects.totalProjects}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <FolderIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">نشط: </span>
            <span className="text-sm font-semibold text-purple-600">{stats.projects.activeProjects}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tasks by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            المهام حسب الحالة
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">في الانتظار</span>
                <span className="font-semibold">{stats.tasks.tasksByStatus.pending}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByStatus.pending / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">قيد التنفيذ</span>
                <span className="font-semibold">{stats.tasks.tasksByStatus.inProgress}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByStatus.inProgress / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">مكتمل</span>
                <span className="font-semibold">{stats.tasks.tasksByStatus.completed}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByStatus.completed / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">ملغي</span>
                <span className="font-semibold">{stats.tasks.tasksByStatus.cancelled}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByStatus.cancelled / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-gray-600 mr-2" />
            المهام حسب الأولوية
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">عاجل</span>
                <span className="font-semibold">{stats.tasks.tasksByPriority.urgent}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByPriority.urgent / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">عالي</span>
                <span className="font-semibold">{stats.tasks.tasksByPriority.high}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByPriority.high / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">متوسط</span>
                <span className="font-semibold">{stats.tasks.tasksByPriority.medium}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByPriority.medium / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">منخفض</span>
                <span className="font-semibold">{stats.tasks.tasksByPriority.low}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(stats.tasks.tasksByPriority.low / stats.tasks.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FolderIcon className="h-5 w-5 text-gray-600 mr-2" />
            حالة المشاريع
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">نشط</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.projects.activeProjects}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">مكتمل</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.projects.completedProjects}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">تخطيط</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.projects.planningProjects}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">متوقف</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.projects.onHoldProjects}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">متوسط التقدم</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.projects.averageProgress}%</span>
            </div>
          </div>
        </div>

        {/* Budget Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            نظرة عامة على الميزانية
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الميزانية</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(stats.projects.totalBudget)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">المنفق</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatPrice(stats.projects.totalSpent)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">المتبقي</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatPrice(stats.projects.totalBudget - stats.projects.totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            آخر المهام
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المهمة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المشروع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المسؤول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الأولوية</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stats.recentTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {task.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {task.projectName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {task.assignedToName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status === 'PENDING' ? 'في الانتظار' :
                       task.status === 'IN_PROGRESS' ? 'قيد التنفيذ' :
                       task.status === 'COMPLETED' ? 'مكتمل' : 'ملغي'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'URGENT' ? 'عاجل' :
                       task.priority === 'HIGH' ? 'عالي' :
                       task.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

