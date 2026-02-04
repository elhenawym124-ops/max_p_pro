import React from 'react';
import { Box, Typography, IconButton, alpha, Tooltip } from '@mui/material';
import { PlayArrow, Pause, Stop } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../../contexts/TimerContext';
import { useTheme } from '../../hooks/useTheme';

const GlobalTimer: React.FC = () => {
    const { activeTimer, elapsedSeconds, stopTimer, pauseTimer, resumeTimer } = useTimer();
    const navigate = useNavigate();
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    if (!activeTimer.taskId) return null;

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const bgColor = isDark ? alpha('#3b82f6', 0.1) : alpha('#3b82f6', 0.05);
    const borderColor = isDark ? alpha('#3b82f6', 0.2) : alpha('#3b82f6', 0.1);
    const textColor = isDark ? '#60a5fa' : '#2563eb';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: bgColor,
                border: '1px solid',
                borderColor: borderColor,
                borderRadius: '50px',
                px: 2,
                py: 0.5,
                transition: 'all 0.2s',
                '&:hover': {
                    borderColor: alpha(textColor, 0.4),
                    bgcolor: alpha(textColor, 0.15)
                }
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    minWidth: '80px'
                }}
                onClick={() => navigate(`/super-admin/dev-tasks/${activeTimer.taskId}`)}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        lineHeight: 1,
                        color: textColor,
                        textAlign: 'center'
                    }}
                >
                    {formatTime(elapsedSeconds)}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '0.65rem',
                        color: alpha(textColor, 0.8),
                        fontWeight: 600,
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                    }}
                >
                    {activeTimer.taskTitle || 'مهمة قيد التنفيذ'}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRight: '1px solid', borderColor: alpha(textColor, 0.2), pr: 1, mr: 0.5 }}>
                {activeTimer.isPaused ? (
                    <Tooltip title="استئناف">
                        <IconButton
                            size="small"
                            onClick={() => resumeTimer(activeTimer.taskId!)}
                            sx={{ color: textColor, p: 0.5 }}
                        >
                            <PlayArrow sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Tooltip title="إيقاف مؤقت">
                        <IconButton
                            size="small"
                            onClick={() => pauseTimer(activeTimer.taskId!)}
                            sx={{ color: textColor, p: 0.5 }}
                        >
                            <Pause sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title="إنهاء المهمة">
                    <IconButton
                        size="small"
                        onClick={() => stopTimer(activeTimer.taskId!)}
                        sx={{ color: '#ef4444', p: 0.5 }}
                    >
                        <Stop sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default GlobalTimer;
