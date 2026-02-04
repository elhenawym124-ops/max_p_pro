import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import {
  Clock,
  Users,
  CheckCircle,
  TrendingUp,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Timer,
  DollarSign
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface DashboardStats {
  totalHours: number;
  billableHours: number;
  activeMembers: number;
  totalMembers: number;
  tasksCompleted: number;
  avgTimePerTask: number;
  runningTimers: RunningTimer[];
}

interface RunningTimer {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  taskId: string;
  taskTitle: string;
  taskType: string;
  startTime: string;
  elapsedMinutes: number;
}

interface TimeLog {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  projectColor: string | null;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  startTime: string;
  endTime: string;
  duration: number;
  durationHours: string;
  description: string | null;
  isBillable: boolean;
}

interface MemberPerformance {
  memberId: string;
  userId: string;
  name: string;
  avatar: string | null;
  department: string | null;
  totalHours: string;
  billableHours: string;
  tasksCompleted: number;
  avgTaskDuration: string;
  efficiencyScore: number;
  timeLogCount: number;
}

const TimeTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformance[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData(false);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange, customStartDate, customEndDate, autoRefresh]);

  const fetchAllData = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const params: any = { dateRange };
      if (dateRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const [statsRes, logsRes, performanceRes] = await Promise.all([
        apiClient.get('super-admin/time-tracking/dashboard', { params }),
        apiClient.get('super-admin/time-tracking/logs', { params: { ...params, limit: 20 } }),
        apiClient.get('super-admin/time-tracking/members', { params })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (logsRes.data.success) setTimeLogs(logsRes.data.data);
      if (performanceRes.data.success) setMemberPerformance(performanceRes.data.data);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params: any = { dateRange, format };
      if (dateRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const response = await apiClient.get('super-admin/time-tracking/export', {
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const formatDuration = (minutes: number): string => {
    const days = Math.floor(minutes / 1440); // 1440 minutes in a day
    const remainingMinutes = minutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'يوم' : 'أيام'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} ${mins === 1 ? 'دقيقة' : 'دقائق'}`);

    return parts.join(' و ');
  };

  const getTaskTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      BUG: 'bg-red-100 text-red-700',
      FEATURE: 'bg-blue-100 text-blue-700',
      ENHANCEMENT: 'bg-green-100 text-green-700',
      HOTFIX: 'bg-orange-100 text-orange-700',
      SECURITY: 'bg-purple-100 text-purple-700',
      REFACTOR: 'bg-yellow-100 text-yellow-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 w-full min-h-screen transition-colors ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Clock className="w-8 h-8 text-blue-600" />
              تتبع الوقت والإنتاجية
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              تحديث تلقائي
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Filter className="w-4 h-4" />
              فلاتر
            </button>

            <div className="relative">
              <button
                onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              <div
                id="export-menu"
                className={`hidden absolute left-0 mt-2 w-48 rounded-lg shadow-lg border z-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
              >
                <button
                  onClick={() => handleExport('csv')}
                  className={`w-full px-4 py-2 text-right rounded-t-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                >
                  تصدير CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className={`w-full px-4 py-2 text-right rounded-b-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                >
                  تصدير JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className={`p-4 rounded-lg shadow-sm border mb-4 transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  الفترة الزمنية
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">آخر 30 يوم</option>
                  <option value="custom">نطاق مخصص</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-100'
              }`}>
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {stats?.totalHours.toFixed(1)}h
            </span>
          </div>
          <h3 className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>إجمالي ساعات العمل</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            قابل للفوترة: {stats?.billableHours.toFixed(1)}h
          </p>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/50' : 'bg-green-100'
              }`}>
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {stats?.activeMembers}/{stats?.totalMembers}
            </span>
          </div>
          <h3 className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>الأعضاء النشطون</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            يعملون الآن: {stats?.runningTimers.length || 0}
          </p>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'
              }`}>
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {stats?.tasksCompleted}
            </span>
          </div>
          <h3 className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>المهام المكتملة</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            في الفترة المحددة
          </p>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-orange-900/50' : 'bg-orange-100'
              }`}>
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {stats?.avgTimePerTask.toFixed(1)}h
            </span>
          </div>
          <h3 className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>متوسط وقت المهمة</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            لكل مهمة مكتملة
          </p>
        </div>
      </div>

      {/* Live Activity */}
      {stats?.runningTimers && stats.runningTimers.length > 0 && (
        <div className={`p-6 rounded-lg shadow-sm border mb-6 transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
            }`}>
            <Activity className="w-5 h-5 text-green-600" />
            النشاط الحي
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
              }`}>
              {stats.runningTimers.length} يعملون الآن
            </span>
          </h2>

          <div className="space-y-3">
            {stats.runningTimers.map((timer) => (
              <div
                key={timer.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${isDark
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-50 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {timer.memberAvatar ? (
                      <img
                        src={timer.memberAvatar}
                        alt={timer.memberName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-900' : 'bg-blue-100'
                        }`}>
                        <span className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-600'
                          }`}>
                          {timer.memberName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>

                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>{timer.memberName}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>{timer.taskTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(timer.taskType)}`}>
                    {timer.taskType}
                  </span>
                  <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    <Timer className="w-4 h-4" />
                    <span className="font-mono font-medium">
                      {formatDuration(timer.elapsedMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Time Logs */}
        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
            }`}>
            <Calendar className="w-5 h-5 text-blue-600" />
            سجلات الوقت الأخيرة
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {timeLogs.length > 0 ? (
              timeLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border rounded-lg transition-colors cursor-pointer ${isDark
                    ? 'border-gray-700 hover:bg-gray-700'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  onClick={() => navigate(`/super-admin/dev-tasks/${log.taskId}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>{log.taskTitle}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>{log.memberName}</p>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>{formatDuration(log.duration)}</p>
                      {log.isBillable && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          <DollarSign className="w-3 h-3 ml-1" />
                          قابل للفوترة
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                    <span className={`px-2 py-0.5 rounded ${getTaskTypeColor(log.taskType)}`}>
                      {log.taskType}
                    </span>
                    {log.projectName && (
                      <span className="px-2 py-0.5 rounded bg-gray-100">
                        {log.projectName}
                      </span>
                    )}
                    <span>
                      {new Date(log.startTime).toLocaleString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-500'
                }`}>لا توجد سجلات في هذه الفترة</p>
            )}
          </div>
        </div>

        {/* Team Performance */}
        <div className={`p-6 rounded-lg shadow-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
            }`}>
            <BarChart3 className="w-5 h-5 text-purple-600" />
            أداء الفريق
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {memberPerformance.length > 0 ? (
              memberPerformance.map((member, index) => (
                <div
                  key={member.memberId}
                  className={`p-3 border rounded-lg transition-colors ${isDark
                    ? 'border-gray-700 hover:bg-gray-700'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'
                        }`}>#{index + 1}</span>
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-purple-900' : 'bg-purple-100'
                          }`}>
                          <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-600'
                            }`}>
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'
                          }`}>{member.name}</p>
                        {member.department && (
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'
                            }`}>{member.department}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>{member.totalHours}h</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'
                        }`}>{member.tasksCompleted} مهام</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className={`flex-1 rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((parseFloat(member.totalHours) / 8) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      كفاءة: {member.efficiencyScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد بيانات في هذه الفترة</p>
            )}
          </div>
        </div>
      </div>

      {/* View Analytics Button */}
      <div className="text-center">
        <button
          onClick={() => navigate('/super-admin/time-tracking/analytics')}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 mx-auto"
        >
          <PieChart className="w-5 h-5" />
          عرض التحليلات المتقدمة والرسوم البيانية
        </button>
      </div>
    </div>
  );
};

export default TimeTrackingDashboard;

