import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import { useTimer } from '../../contexts/TimerContext';
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  FolderIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ActiveTimerTask {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  memberName: string;
  memberId: string;
  startTime: string;
  duration: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
}

const ActiveTimers: React.FC = () => {
  const navigate = useNavigate();
  const { activeTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const [timers, setTimers] = useState<ActiveTimerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    fetchActiveTimers();
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchActiveTimers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTimers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/timer/all-active'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setTimers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching active timers:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatElapsedTime = (startTime: string, isPaused: boolean) => {
    if (isPaused) return '⏸️ متوقف مؤقتاً';
    
    const start = new Date(startTime).getTime();
    const elapsed = Math.floor((currentTime - start) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من إيقاف هذا المؤقت؟')) return;
    
    try {
      await stopTimer(taskId);
      fetchActiveTimers();
    } catch (err) {
      console.error('Error stopping timer:', err);
    }
  };

  const handlePauseTimer = async (taskId: string) => {
    try {
      await pauseTimer(taskId);
      fetchActiveTimers();
    } catch (err) {
      console.error('Error pausing timer:', err);
    }
  };

  const handleResumeTimer = async (taskId: string) => {
    try {
      await resumeTimer(taskId);
      fetchActiveTimers();
    } catch (err) {
      console.error('Error resuming timer:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700',
      URGENT: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700',
      HIGH: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700',
      MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700',
      LOW: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700'
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      IN_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status as keyof typeof colors] || colors.TODO;
  };

  const getTotalActiveTime = () => {
    return timers.reduce((total, timer) => {
      if (!timer.isPaused) {
        const elapsed = Math.floor((currentTime - new Date(timer.startTime).getTime()) / 60000);
        return total + elapsed;
      }
      return total + timer.duration;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ClockIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            المؤقتات النشطة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {timers.length} مؤقت نشط حالياً
          </p>
        </div>
        <button
          onClick={fetchActiveTimers}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5" />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">مؤقتات نشطة</p>
              <p className="text-2xl font-bold mt-1">{timers.filter(t => !t.isPaused).length}</p>
            </div>
            <PlayIcon className="h-10 w-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs">متوقفة مؤقتاً</p>
              <p className="text-2xl font-bold mt-1">{timers.filter(t => t.isPaused).length}</p>
            </div>
            <PauseIcon className="h-10 w-10 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs">إجمالي الوقت</p>
              <p className="text-2xl font-bold mt-1">{getTotalActiveTime()} د</p>
            </div>
            <ClockIcon className="h-10 w-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs">أعضاء نشطون</p>
              <p className="text-2xl font-bold mt-1">{new Set(timers.map(t => t.memberId)).size}</p>
            </div>
            <UserIcon className="h-10 w-10 text-green-200" />
          </div>
        </div>
      </div>

      {/* Active Timers List */}
      {timers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ClockIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            لا توجد مؤقتات نشطة
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            جميع المهام متوقفة حالياً
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {timers.map((timer) => {
            const isMyTimer = activeTimer.taskId === timer.taskId;
            
            return (
              <div
                key={timer.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                  isMyTimer
                    ? 'border-indigo-500 dark:border-indigo-400 shadow-md'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isMyTimer && (
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded">
                          مؤقتك
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(timer.taskPriority)}`}>
                        {timer.taskPriority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(timer.taskStatus)}`}>
                        {timer.taskStatus}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                    >
                      {timer.taskTitle}
                    </h3>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <UserIcon className="h-4 w-4" />
                    <span>{timer.memberName}</span>
                  </div>
                  {timer.projectName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FolderIcon className="h-4 w-4" />
                      <span>{timer.projectName}</span>
                    </div>
                  )}
                </div>

                {/* Timer Display */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الوقت المنقضي</p>
                      <p className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                        {formatElapsedTime(timer.startTime, timer.isPaused)}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      timer.isPaused
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-green-100 dark:bg-green-900/30 animate-pulse'
                    }`}>
                      {timer.isPaused ? (
                        <PauseIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <PlayIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {timer.isPaused ? (
                    <button
                      onClick={() => handleResumeTimer(timer.taskId)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                    >
                      <PlayIcon className="h-4 w-4" />
                      استئناف
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseTimer(timer.taskId)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
                    >
                      <PauseIcon className="h-4 w-4" />
                      إيقاف مؤقت
                    </button>
                  )}
                  <button
                    onClick={() => handleStopTimer(timer.taskId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                  >
                    <StopIcon className="h-4 w-4" />
                    إيقاف
                  </button>
                  <button
                    onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    عرض
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveTimers;
