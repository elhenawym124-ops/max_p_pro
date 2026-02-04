import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { buildApiUrl } from '../utils/urlHelper';

const ActiveUsersMonitor = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stoppingTimer, setStoppingTimer] = useState(null);

  const themeColors = {
    bg: isDark ? 'bg-slate-800' : 'bg-white',
    border: isDark ? 'border-slate-700' : 'border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    subText: isDark ? 'text-gray-400' : 'text-gray-600',
    mutedBg: isDark ? 'bg-slate-700/50' : 'bg-gray-50',
    hoverBg: isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
  };

  // Combined effect with Page Visibility API for better performance
  useEffect(() => {
    if (!isOpen) return;

    // Fetch immediately when opened
    fetchActiveUsers();

    // Handle visibility changes - pause updates when tab is hidden
    const handleVisibilityChange = () => {
      if (!document.hidden && isOpen) {
        fetchActiveUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Update current time every second (only when visible)
    const timerInterval = setInterval(() => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    }, 1000);

    // Refresh data every 30 seconds (only when visible)
    const refreshInterval = setInterval(() => {
      if (!document.hidden && isOpen) {
        fetchActiveUsers();
      }
    }, 30000);

    // Cleanup function
    return () => {
      clearInterval(timerInterval);
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]); // Only re-run when isOpen changes

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('admin/active-users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Silently fail on 401 - user not authenticated yet
        if (response.status === 401) {
          setActiveUsers([]);
          setLoading(false);
          return;
        }
        throw new Error('فشل في جلب البيانات');
      }

      const result = await response.json();
      setActiveUsers(result.data?.activeUsers || []);
    } catch (err) {
      // Only show error if it's not a network/auth issue
      if (err.message !== 'فشل في جلب البيانات') {
        setError(err.message);
      }
      setActiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateLiveDuration = (startTime) => {
    const start = new Date(startTime);
    const duration = Math.floor((currentTime - start) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: 'text-red-600 bg-red-100',
      HIGH: 'text-orange-600 bg-orange-100',
      MEDIUM: 'text-yellow-600 bg-yellow-100',
      LOW: 'text-blue-600 bg-blue-100'
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      TODO: 'text-gray-600 bg-gray-100',
      IN_PROGRESS: 'text-blue-600 bg-blue-100',
      IN_REVIEW: 'text-purple-600 bg-purple-100',
      DONE: 'text-green-600 bg-green-100',
      BLOCKED: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const handleTaskClick = async (taskId, entryId) => {
    try {
      setStoppingTimer(entryId);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/stop`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onClose();
        navigate(`/super-admin/dev-tasks/${taskId}`);
      } else {
        console.error('Failed to stop timer');
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
    } finally {
      setStoppingTimer(null);
    }
  };

  const handleStopTimerOnly = async (taskId, entryId) => {
    try {
      setStoppingTimer(entryId);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      if (!token) return;

      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/stop`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: '' })
      });

      if (response.ok) {
        // Refresh list instead of navigating
        fetchActiveUsers();
      } else {
        console.error('Failed to stop timer');
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
    } finally {
      setStoppingTimer(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className={`${themeColors.bg} rounded-2xl shadow-2xl border ${themeColors.border} w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${themeColors.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${themeColors.text}`}>
                المستخدمون النشطون
              </h2>
              <p className={`text-sm ${themeColors.subText}`}>
                {activeUsers.length} مستخدم يعمل الآن
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchActiveUsers}
              disabled={loading}
              className={`p-2 ${themeColors.hoverBg} rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="تحديث"
            >
              <ArrowPathIcon className={`h-5 w-5 ${themeColors.text} ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 ${themeColors.hoverBg} rounded-lg transition-colors`}
            >
              <XMarkIcon className={`h-5 w-5 ${themeColors.text}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-6">
          {loading && activeUsers.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : activeUsers.length === 0 ? (
            <div className={`${themeColors.mutedBg} rounded-lg p-12 text-center`}>
              <ClockIcon className={`h-16 w-16 mx-auto mb-4 ${themeColors.subText} opacity-50`} />
              <p className={`text-lg ${themeColors.text}`}>لا يوجد مستخدمون نشطون حالياً</p>
              <p className={`text-sm ${themeColors.subText} mt-2`}>سيظهر هنا المستخدمون الذين يشغلون التيمر</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeUsers.map((entry) => (
                <div
                  key={entry.id}
                  className={`${themeColors.mutedBg} rounded-xl p-5 border ${themeColors.border} transition-all relative group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className="relative">
                        {entry.user.avatar ? (
                          <img
                            src={entry.user.avatar}
                            alt={entry.user.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${themeColors.text} truncate`}>
                          {entry.user.name}
                        </h3>
                        <p className={`text-sm ${themeColors.subText} truncate`}>
                          {entry.user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <BriefcaseIcon className={`h-4 w-4 ${themeColors.subText}`} />
                          <span className={`text-xs ${themeColors.subText} capitalize`}>
                            {entry.user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="text-left">
                      <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-lg">
                        <ClockIcon className="h-5 w-5 text-green-600" />
                        <span className="text-xl font-mono font-bold text-green-600 tabular-nums">
                          {calculateLiveDuration(entry.startTime)}
                        </span>
                      </div>
                      <p className={`text-xs ${themeColors.subText} mt-1 text-center`}>
                        منذ {new Date(entry.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Task Info */}
                  <div className={`mt-4 pt-4 border-t ${themeColors.border}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${themeColors.text} mb-2`}>
                          {entry.task.title}
                        </p>
                        {entry.description && (
                          <p className={`text-xs ${themeColors.subText} line-clamp-2`}>
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(entry.task.priority)}`}>
                          {entry.task.priority}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(entry.task.status)}`}>
                          {entry.task.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopTimerOnly(entry.task.id, entry.id);
                        }}
                        disabled={stoppingTimer === entry.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${stoppingTimer === entry.id
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm border border-red-200'
                          }`}
                      >
                        {stoppingTimer === entry.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                            <span>جاري الإيقاف...</span>
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="h-4 w-4" />
                            <span>إيقاف التايمر</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/super-admin/dev-tasks/${entry.task.id}`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        <span>فتح المهمة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersMonitor;
