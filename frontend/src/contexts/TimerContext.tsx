import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { envConfig } from '../config/environment';

interface TimerState {
    taskId: string | null;
    startTime: number | null; // Timestamp
    isRunning: boolean;
    isPaused: boolean;
    taskTitle: string | null;
    projectId: string | null;
    projectName: string | null;
}

interface TimerContextType {
    activeTimer: TimerState;
    elapsedSeconds: number;
    startTimer: (taskId: string, taskTitle: string, projectName?: string) => Promise<void>;
    stopTimer: (taskId: string) => Promise<void>;
    pauseTimer: (taskId: string) => Promise<void>;
    resumeTimer: (taskId: string) => Promise<void>;
    syncTimerState: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Helper to get base URL
const buildApiUrl = (endpoint: string) => {
    return `${envConfig.backendUrl}/api/v1/${endpoint.replace(/^\//, '')}`;
};

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeTimer, setActiveTimer] = useState<TimerState>({
        taskId: localStorage.getItem('timer_taskId'),
        startTime: localStorage.getItem('timer_startTime') ? parseInt(localStorage.getItem('timer_startTime')!) : null,
        isRunning: localStorage.getItem('timer_isRunning') === 'true',
        isPaused: localStorage.getItem('timer_isPaused') === 'true',
        taskTitle: localStorage.getItem('timer_taskTitle'),
        projectId: null,
        projectName: localStorage.getItem('timer_projectName')
    });

    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const checkActiveTimer = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Only Super Admins can access the dev timer
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            if (payload.role !== 'SUPER_ADMIN') return;
        } catch (e) {
            return;
        }

        try {
            const response = await fetch(buildApiUrl('super-admin/dev/timer/active'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const timerData = data.data;
                    setActiveTimer({
                        taskId: timerData.taskId,
                        startTime: new Date(timerData.startTime).getTime(),
                        isRunning: !timerData.isPaused,
                        isPaused: timerData.isPaused,
                        taskTitle: timerData.taskTitle,
                        projectId: null,
                        projectName: timerData.projectName
                    });
                } else {
                    setActiveTimer({
                        taskId: null,
                        startTime: null,
                        isRunning: false,
                        isPaused: false,
                        taskTitle: null,
                        projectId: null,
                        projectName: null
                    });
                }
            }
        } catch (err) {
            console.error('Failed to sync timer:', err);
        }
    }, []);

    // Check for active timer on mount (only once)
    useEffect(() => {
        checkActiveTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount to avoid infinite loops

    // Sync with localStorage (backup)
    useEffect(() => {
        if (activeTimer.taskId) {
            localStorage.setItem('timer_taskId', activeTimer.taskId);
            localStorage.setItem('timer_startTime', activeTimer.startTime?.toString() || '');
            localStorage.setItem('timer_isRunning', String(activeTimer.isRunning));
            localStorage.setItem('timer_isPaused', String(activeTimer.isPaused));
            localStorage.setItem('timer_taskTitle', activeTimer.taskTitle || '');
            localStorage.setItem('timer_projectName', activeTimer.projectName || '');
        } else {
            localStorage.removeItem('timer_taskId');
            localStorage.removeItem('timer_startTime');
            localStorage.removeItem('timer_isRunning');
            localStorage.removeItem('timer_isPaused');
            localStorage.removeItem('timer_taskTitle');
            localStorage.removeItem('timer_projectName');
        }
    }, [activeTimer]);

    // Tick effect - optimized with Page Visibility API
    useEffect(() => {
        // Early return if timer is not running
        if (!activeTimer.isRunning || activeTimer.isPaused || !activeTimer.startTime) {
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            // Don't update when tab is hidden to save resources
            if (document.hidden) return;

            const now = Date.now();
            const diff = Math.floor((now - activeTimer.startTime!) / 1000);
            setElapsedSeconds(diff > 0 ? diff : 0);
        };

        // Immediate update
        updateElapsed();

        // Update every second
        const interval = setInterval(updateElapsed, 1000);

        // Update when tab becomes visible again
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                updateElapsed();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeTimer.isRunning, activeTimer.isPaused, activeTimer.startTime]);

    const showToast = (message: string, type: 'success' | 'error') => {
        const event = new CustomEvent('show-toast', { detail: { message, type } });
        window.dispatchEvent(event);
        if (type === 'error') console.error(message);
    };

    const startTimer = useCallback(async (taskId: string, taskTitle: string, projectName?: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            // Role check
            try {
                const base64Url = token.split('.')[1];
                if (!base64Url) return;
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64));
                if (payload.role !== 'SUPER_ADMIN') {
                    showToast('غير مسموح لهذه العملية إلا للمشرفين', 'error');
                    return;
                }
            } catch (e) { return; }

            const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/start`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setActiveTimer({
                    taskId,
                    startTime: Date.now(),
                    isRunning: true,
                    isPaused: false,
                    taskTitle,
                    projectId: null,
                    projectName: projectName || null
                });
            } else {
                const data = await response.json();
                showToast(data.message || 'فشل بدء المؤقت', 'error');
            }
        } catch (err) {
            showToast('حدث خطأ في الاتصال', 'error');
        }
    }, []);

    const stopTimer = useCallback(async (taskId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/stop`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: '' })
            });

            if (response.ok) {
                // Determine if we should clear or fetch next
                // Optimistically clear first
                setActiveTimer({
                    taskId: null,
                    startTime: null,
                    isRunning: false,
                    isPaused: false,
                    taskTitle: null,
                    projectId: null,
                    projectName: null
                });
                setElapsedSeconds(0);

                // Then check if another timer exists (drain queue)
                await checkActiveTimer();
            } else {
                showToast('فشل إيقاف المؤقت', 'error');
            }
        } catch (err) {
            showToast('حدث خطأ في الاتصال', 'error');
        }
    }, [checkActiveTimer]);

    const pauseTimer = useCallback(async (taskId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/pause`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setActiveTimer(prev => ({ ...prev, isPaused: true }));
            }
        } catch (err) {
            showToast('حدث خطأ', 'error');
        }
    }, []);

    const resumeTimer = useCallback(async (taskId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/resume`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                // When resuming, we effectively reset the start time to now minus previously elapsed?
                // Actually, the simple backend logic starts a NEW log segment.
                // So for the UI to be consistent, we treat it as a new start time relative to this session.
                // However, this simple start time logic resets the counter to 0!
                // To accurately reflect TOTAL time for the task, we should probably fetch the total duration from backend.
                // For now, let's treat resume normally (starts counting from 0 for this session or continues?)
                // If we want "total elapsed", we need more complex logic.
                // Let's assume Resume starts a new segment, so user sees time for *current session*.

                setActiveTimer(prev => ({
                    ...prev,
                    isPaused: false,
                    startTime: Date.now() // Reset start time for new segment display 
                }));
            }
        } catch (err) {
            showToast('حدث خطأ', 'error');
        }
    }, []);

    const syncTimerState = useCallback(async () => {
        // Optional: Fetch current status from backend to handle multi-tab/device
        // Implement if needed for robustness
    }, []);

    return (
        <TimerContext.Provider value={{
            activeTimer,
            elapsedSeconds,
            startTimer,
            stopTimer,
            pauseTimer,
            resumeTimer,
            syncTimerState
        }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
};
