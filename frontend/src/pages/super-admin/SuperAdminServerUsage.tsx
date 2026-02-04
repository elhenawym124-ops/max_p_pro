import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Stack,
    alpha,
    useTheme as useMuiTheme,
    IconButton,
    LinearProgress,
    Paper,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Storage as StorageIcon,
    Refresh as RefreshIcon,
    PieChart as PieChartIcon,
    InfoOutlined as InfoIcon,
    Dns as DnsIcon,
    CloudQueue as CloudIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    SettingsSuggest as SystemIcon,
    BarChart as BarChartIcon,
    Image as ImageIcon,
    Videocam as VideoIcon,
    Audiotrack as AudioIcon,
    Description as DocIcon,
    MoreHoriz as OtherIcon
} from '@mui/icons-material';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/apiClient';

const formatSize = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface DiskStats {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    breakdown: {
        images: number;
        videos: number;
        audio: number;
        documents: number;
        other: number;
    };
    platform: string;
    timestamp: string;
}

const SuperAdminServerUsage = () => {
    const muiTheme = useMuiTheme();
    const isDark = muiTheme.palette.mode === 'dark';

    const [stats, setStats] = useState<DiskStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/super-admin/server-usage');

            if (response.status === 200 && response.data.success) {
                setStats(response.data.data);
            } else {
                setError(response.data.message || 'فشل في جلب إحصائيات السيرفر');
            }
        } catch (err: any) {
            console.error('Error fetching server usage:', err);
            setError('حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (percent: number) => {
        if (percent < 60) return muiTheme.palette.success.main;
        if (percent < 80) return muiTheme.palette.warning.main;
        if (percent < 90) return '#f97316'; // Orange
        return muiTheme.palette.error.main;
    };

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                    <CircularProgress size={60} thickness={4} />
                </motion.div>
            </Box>
        );
    }

    const chartData = stats ? [
        { name: 'المساحة المستخدمة', value: stats.used, color: getStatusColor(stats.usagePercent) },
        { name: 'المساحة الفارغة', value: stats.free, color: isDark ? alpha('#fff', 0.1) : '#f1f5f9' }
    ] : [];

    const breakdownData = stats?.breakdown ? [
        { name: 'الصور', value: stats.breakdown.images, color: '#3b82f6', icon: <ImageIcon /> },
        { name: 'الفيديوهات', value: stats.breakdown.videos, color: '#ef4444', icon: <VideoIcon /> },
        { name: 'الصوتيات', value: stats.breakdown.audio, color: '#8b5cf6', icon: <AudioIcon /> },
        { name: 'المستندات', value: stats.breakdown.documents, color: '#fbbf24', icon: <DocIcon /> },
        { name: 'أخرى / النظام', value: stats.breakdown.other, color: '#94a3b8', icon: <OtherIcon /> }
    ] : [];

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
        })
    };

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            direction: 'rtl',
            minHeight: '100%',
            background: isDark
                ? 'radial-gradient(circle at top right, rgba(30, 41, 59, 0.5), transparent), radial-gradient(circle at bottom left, rgba(15, 23, 42, 0.5), transparent)'
                : 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent)'
        }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h3" sx={{
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                    }}>
                        تحليل استهلاك القرص
                    </Typography>
                    <Typography variant="body1" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                        مراقبة حية وتفصيلية لموارد التخزين
                    </Typography>
                </Box>
                <Tooltip title="تحديث البيانات">
                    <IconButton
                        onClick={fetchStats}
                        sx={{
                            p: 2,
                            bgcolor: isDark ? alpha('#3b82f6', 0.1) : alpha('#3b82f6', 0.05),
                            color: '#3b82f6',
                            border: '1px solid',
                            borderColor: alpha('#3b82f6', 0.2),
                            '&:hover': {
                                bgcolor: '#3b82f6',
                                color: '#fff',
                                transform: 'rotate(180deg)',
                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                            }
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Alert
                        severity="error"
                        variant="filled"
                        sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                    >
                        {error}
                    </Alert>
                </motion.div>
            )}

            {stats && (
                <Grid container spacing={3}>
                    {/* Main Overwiew Component */}
                    <Grid item xs={12} lg={4}>
                        <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
                            <Card sx={{
                                height: '100%',
                                borderRadius: 5,
                                border: '1px solid',
                                borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                                bgcolor: isDark ? alpha('#1e293b', 0.6) : '#fff',
                                backdropFilter: 'blur(20px)',
                                boxShadow: isDark ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 10px 30px -10px rgba(0,0,0,0.05)',
                                overflow: 'hidden'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <PieChartIcon sx={{ color: '#3b82f6' }} /> نظرة عامة
                                        </Typography>
                                    </Stack>

                                    <Box sx={{ height: 280, width: '100%', position: 'relative' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    stroke="none"
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Center Content */}
                                        <Box sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                            width: '100%'
                                        }}>
                                            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                                                <Typography variant="h3" sx={{
                                                    fontWeight: 900,
                                                    color: getStatusColor(stats.usagePercent),
                                                    lineHeight: 1
                                                }}>
                                                    {stats.usagePercent}%
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontWeight: 600, display: 'block', mt: 0.5 }}>نسبة الاستهلاك</Typography>
                                            </motion.div>
                                        </Box>
                                    </Box>

                                    <Stack direction="row" spacing={3} justifyContent="center" mt={3}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatSize(stats.used)}</Typography>
                                            <Typography variant="caption" color="text.secondary">المستخدم</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem sx={{ height: 40 }} />
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#10b981' }}>{formatSize(stats.free)}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ color: '#10b981' }}>المتاح</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    {/* Detailed Breakdown Component */}
                    <Grid item xs={12} lg={8}>
                        <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
                            <Card sx={{
                                height: '100%',
                                borderRadius: 5,
                                border: '1px solid',
                                borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                                bgcolor: isDark ? alpha('#1e293b', 0.6) : '#fff',
                                backdropFilter: 'blur(20px)',
                                boxShadow: isDark ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 10px 30px -10px rgba(0,0,0,0.05)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                                        <BarChartIcon sx={{ color: '#3b82f6' }} /> توزيع مساحة الملفات
                                    </Typography>

                                    <Grid container spacing={4}>
                                        <Grid item xs={12} md={7}>
                                            <Stack spacing={2.5}>
                                                {breakdownData.map((item, index) => (
                                                    <Box key={index}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                                                            </Stack>
                                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatSize(item.value)}</Typography>
                                                        </Stack>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={(item.value / stats.used) * 100}
                                                            sx={{
                                                                height: 8,
                                                                borderRadius: 4,
                                                                bgcolor: isDark ? alpha('#000', 0.2) : alpha('#e2e8f0', 0.5),
                                                                '& .MuiLinearProgress-bar': {
                                                                    bgcolor: item.color,
                                                                    borderRadius: 4
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} md={5}>
                                            <Box sx={{ height: 250, width: '100%' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={breakdownData} layout="vertical" margin={{ left: -20 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fontWeight: 700 }} />
                                                        <RechartsTooltip
                                                            formatter={(value: number) => formatSize(value)}
                                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        />
                                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                            {breakdownData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    {/* System Summary Cards */}
                    <Grid item xs={12} sm={4}>
                        <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
                            <Card sx={{ borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                                            <StorageIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>نظام التشغيل</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{stats.platform}</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
                            <Card sx={{ borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}>
                                            <SystemIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>اسم القرص</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>القرص المحلي (Root)</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
                            <Card sx={{ borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha('#fbbf24', 0.1), color: '#fbbf24' }}>
                                            <RefreshIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>آخر تحديث</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                {new Date(stats.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>
            )}

            {/* Warning Sections */}
            <AnimatePresence>
                {stats && stats.usagePercent > 80 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Paper sx={{
                            p: 3,
                            borderRadius: 4,
                            background: `linear-gradient(to right, ${alpha(muiTheme.palette.error.main, 0.1)}, transparent)`,
                            border: '1px solid',
                            borderColor: alpha(muiTheme.palette.error.main, 0.2)
                        }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: '50%',
                                    bgcolor: muiTheme.palette.error.main,
                                    color: '#fff',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    <InfoIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: muiTheme.palette.error.main }}>
                                        تنبيه: مساحة التخزين حرجة ({stats.usagePercent}%)
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b' }}>
                                        نوصي بحذف الفيديوهات القديمة أو الصور المؤرشفة لتوفير مساحة إضافية.
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default SuperAdminServerUsage;
