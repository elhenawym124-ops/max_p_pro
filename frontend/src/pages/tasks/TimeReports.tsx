import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  ClockIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  UserGroupIcon,
  FolderIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  description: string;
  createdAt: string;
}

interface UserTimeStats {
  userId: string;
  userName: string;
  totalMinutes: number;
  tasksCount: number;
}

interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  tasksCount: number;
}

interface DailyStats {
  date: string;
  totalMinutes: number;
  entriesCount: number;
}

const TimeReports: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'entries' | 'users' | 'projects' | 'daily'>('entries');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchTimeEntries();
    fetchUsers();
    fetchProjects();
  }, [dateRange, selectedUser, selectedProject]);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      let url = `tasks/time-entries?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      if (selectedUser) url += `&userId=${selectedUser}`;
      if (selectedProject) url += `&projectId=${selectedProject}`;

      const response = await fetch(buildApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setTimeEntries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
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
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  
  const userStats: UserTimeStats[] = Object.values(
    timeEntries.reduce((acc, entry) => {
      if (!acc[entry.userId]) {
        acc[entry.userId] = {
          userId: entry.userId,
          userName: entry.userName,
          totalMinutes: 0,
          tasksCount: 0
        };
      }
      acc[entry.userId]!.totalMinutes += entry.duration || 0;
      acc[entry.userId]!.tasksCount += 1;
      return acc;
    }, {} as Record<string, UserTimeStats>)
  ).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const projectStats: ProjectTimeStats[] = Object.values(
    timeEntries.reduce((acc, entry) => {
      const projectId = entry.projectName || 'no-project';
      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          projectName: entry.projectName || 'بدون مشروع',
          totalMinutes: 0,
          tasksCount: 0
        };
      }
      acc[projectId].totalMinutes += entry.duration || 0;
      acc[projectId].tasksCount += 1;
      return acc;
    }, {} as Record<string, ProjectTimeStats>)
  ).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const dailyStats: DailyStats[] = Object.values(
    timeEntries.reduce((acc, entry) => {
      const date = entry.startTime?.split('T')[0] || '';
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalMinutes: 0,
          entriesCount: 0
        };
      }
      acc[date].totalMinutes += entry.duration || 0;
      acc[date].entriesCount += 1;
      return acc;
    }, {} as Record<string, DailyStats>)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToCSV = () => {
    const headers = ['المهمة', 'المشروع', 'المستخدم', 'تاريخ البدء', 'وقت البدء', 'المدة (دقائق)', 'الوصف'];
    const rows = timeEntries.map(entry => [
      entry.taskTitle,
      entry.projectName || 'غير محدد',
      entry.userName,
      formatDate(entry.startTime),
      formatTime(entry.startTime),
      entry.duration?.toString() || '0',
      entry.description || ''
    ]);
    
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `time_report_${dateRange.startDate}_${dateRange.endDate}.csv`;
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/tasks"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 dark:text-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 ml-2" />
              العودة
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <ClockIcon className="h-7 w-7 text-indigo-600 ml-2" />
              تقارير الوقت
            </h1>
          </div>
          
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5 ml-2" />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400 ml-2" />
          <span className="font-medium text-gray-700 dark:text-gray-300">الفلاتر</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المستخدم</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المستخدمين</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المشروع</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المشاريع</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الوقت</p>
              <p className="text-2xl font-bold text-indigo-600">{formatDuration(totalMinutes)}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-indigo-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">عدد السجلات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{timeEntries.length}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">المستخدمين النشطين</p>
              <p className="text-2xl font-bold text-green-600">{userStats.length}</p>
            </div>
            <UserGroupIcon className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">المشاريع النشطة</p>
              <p className="text-2xl font-bold text-blue-600">{projectStats.length}</p>
            </div>
            <FolderIcon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700-200">
          <nav className="flex -mb-px">
            {[
              { id: 'entries', label: 'سجلات الوقت', icon: ClockIcon },
              { id: 'users', label: 'حسب المستخدم', icon: UserGroupIcon },
              { id: 'projects', label: 'حسب المشروع', icon: FolderIcon },
              { id: 'daily', label: 'حسب اليوم', icon: CalendarIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:border-gray-700-300'
                }`}
              >
                <tab.icon className="h-5 w-5 ml-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Entries Tab */}
          {activeTab === 'entries' && (
            <div className="overflow-x-auto">
              {timeEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد سجلات وقت في هذه الفترة</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المهمة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المشروع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المستخدم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">التاريخ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الوقت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المدة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الوصف</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                    {timeEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/tasks/${entry.taskId}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            {entry.taskTitle}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.projectName || 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {entry.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(entry.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(entry.startTime)}
                          {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded">
                            {formatDuration(entry.duration || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {entry.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {userStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                userStats.map((stat, index) => (
                  <div key={stat.userId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold ml-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{stat.userName}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-indigo-600">{formatDuration(stat.totalMinutes)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">({stat.tasksCount} سجل)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(stat.totalMinutes / totalMinutes) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {projectStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                projectStats.map((stat, index) => (
                  <div key={stat.projectId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold ml-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{stat.projectName}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-green-600">{formatDuration(stat.totalMinutes)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">({stat.tasksCount} سجل)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(stat.totalMinutes / totalMinutes) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Daily Tab */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              {dailyStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                dailyStats.map(stat => (
                  <div key={stat.date} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 ml-2" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(stat.date)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-blue-600">{formatDuration(stat.totalMinutes)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">({stat.entriesCount} سجل)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((stat.totalMinutes / 480) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                      {stat.totalMinutes >= 480 ? '8+ ساعات' : `${((stat.totalMinutes / 480) * 100).toFixed(0)}% من يوم العمل`}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeReports;

