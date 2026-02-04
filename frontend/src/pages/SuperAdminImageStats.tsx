import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    TablePagination,
    TableSortLabel,
    Stack,
    alpha,
    useTheme as useMuiTheme,
    Tooltip,
    IconButton,
    Button,
    Menu,
    MenuItem
} from '@mui/material';
import {
    Search as SearchIcon,
    Image as ImageIcon,
    Storage as StorageIcon,
    Business as BusinessIcon,
    Refresh as RefreshIcon,
    InfoOutlined as InfoIcon,
    AutoFixHigh as AutoFixHighIcon,
    DeleteSweep as DeleteSweepIcon,
    Delete as DeleteIcon,
    CleaningServices as CleaningServicesIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { apiClient } from '../services/apiClient';

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface CompanyStats {
    companyId: string;
    companyName: string;
    galleryCount: number;
    gallerySize: number;
    productCount: number;
    productSize: number;
    chatImageCount: number;
    chatImageSize: number;
    whatsappImageCount: number;
    whatsappImageSize: number;
    totalCount: number;
    totalSize: number;
}

const SuperAdminImageStats = () => {
    const muiTheme = useMuiTheme();
    const isDark = muiTheme.palette.mode === 'dark';

    const [stats, setStats] = useState<CompanyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof CompanyStats>('totalSize');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedCompany, setSelectedCompany] = useState<{ id: string, name: string } | null>(null);
    const [orphanedStats, setOrphanedStats] = useState<{ count: number, size: number } | null>(null);
    const [scanning, setScanning] = useState(false);
    const [cleaning, setCleaning] = useState(false);

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, companyId: string, companyName: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedCompany({ id: companyId, name: companyName });
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedCompany(null);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/super-admin/image-statistics');

            if (response.status === 200 && response.data.success) {
                setStats(response.data.data);
            } else {
                setError(response.data.message || 'فشل في جلب الإحصائيات');
            }
        } catch (err: any) {
            console.error('Error fetching image stats:', err);
            setError('حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const handleCompressImages = async () => {
        if (!window.confirm('هل أنت متأكد من بدء عملية ضغط الصور؟ سيتم ضغط جميع الصور غير المضغوطة في النظام. قد تستغرق العملية وقتاً طويلاً.')) return;

        try {
            setCompressing(true);
            const response = await apiClient.post('/super-admin/image-stats/compress');

            if (response.status === 200 && response.data.success) {
                setMessage(response.data.message);
                setTimeout(() => setMessage(null), 5000);
            } else {
                setError(response.data.message || 'فشل في بدء العملية');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في الاتصال بالخادم');
        } finally {
            setCompressing(false);
        }
    };

    const handleDeleteOldChatImages = async (months: number) => {
        if (!window.confirm(`هل أنت متأكد من حذف صور الدردشة التي مضى عليها أكثر من ${months} أشهر؟ هذه العملية لا يمكن التراجع عنها.`)) return;

        try {
            setLoading(true);
            const response = await apiClient.post('/super-admin/image-stats/delete-old-chat-images', { months });

            if (response.status === 200 && response.data.success) {
                setMessage(`تم حذف ${response.data.details.chatDeleted + response.data.details.whatsappDeleted} صورة بنجاح`);
                fetchStats();
                setTimeout(() => setMessage(null), 5000);
            } else {
                setError(response.data.message || 'فشل في عملية الحذف');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCompanyImages = async (companyId: string, companyName: string, target: 'CHAT' | 'GALLERY' | 'PRODUCTS' | 'ALL' = 'ALL') => {
        const targetNames: any = {
            'CHAT': 'صور الدردشات (النظام وواتساب)',
            'GALLERY': 'صور المعرض',
            'PRODUCTS': 'صور المنتجات',
            'ALL': 'كافة الصور والبيانات'
        };

        const targetName = targetNames[target];

        if (!window.confirm(`⚠️ تحذير: سيتم حذف ${targetName} الخاصة بشركة "${companyName}". هل أنت متأكد؟`)) return;
        if (target === 'ALL' && !window.confirm(`تأكيد أخير: حذف كافة بيانات الصور لـ "${companyName}"؟`)) return;

        try {
            setLoading(true);
            const response = await apiClient.post('/super-admin/image-stats/delete-company-images', { companyId, target });

            if (response.status === 200 && response.data.success) {
                setMessage(`تم تنظيف ${targetName} لشركة ${companyName} بنجاح`);
                fetchStats();
                setTimeout(() => setMessage(null), 5000);
            } else {
                setError(response.data.message || 'فشل في عملية الحذف');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في الاتصال بالخادم');
        } finally {
            setLoading(false);
            handleMenuClose();
        }
    };

    const handleRequestSort = (property: keyof CompanyStats) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleScanOrphaned = async () => {
        try {
            setScanning(true);
            const response = await apiClient.get('/super-admin/image-stats/orphaned-stats');
            if (response.status === 200 && response.data.success) {
                setOrphanedStats(response.data.stats);
                setMessage(`تم العثور على ${response.data.stats.count} ملف يتيم يشغل مساحة ${formatSize(response.data.stats.size)}`);
            } else {
                setError(response.data.message || 'فشل في فحص الملفات');
            }
        } catch (err: any) {
            setError('حدث خطأ أثناء فحص الملفات');
        } finally {
            setScanning(false);
        }
    };

    const handleCleanupOrphaned = async () => {
        if (!window.confirm('هل أنت متأكد من حذف الملفات اليتيمة؟ هذه العملية ستحذف كافة الصور والملفات غير المرتبطة بقاعدة البيانات نهائياً.')) return;

        try {
            setCleaning(true);
            const response = await apiClient.post('/super-admin/image-stats/cleanup-orphaned');
            if (response.status === 200 && response.data.success) {
                const { deletedCount, deletedSize } = response.data.result;
                setMessage(`تم بنجاح حذف ${deletedCount} ملف يتيم وتوفير ${formatSize(deletedSize)}`);
                setOrphanedStats(null);
                fetchStats();
            } else {
                setError(response.data.message || 'فشل في عملية التنظيف');
            }
        } catch (err: any) {
            setError('حدث خطأ أثناء عملية التنظيف');
        } finally {
            setCleaning(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const filteredStats = React.useMemo(() =>
        stats.filter(item => item.companyName.toLowerCase().includes(searchTerm.toLowerCase())),
        [stats, searchTerm]);

    const sortedStats = React.useMemo(() => {
        return [...filteredStats].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (bValue < aValue) return order === 'asc' ? 1 : -1;
            if (bValue > aValue) return order === 'asc' ? -1 : 1;
            return 0;
        });
    }, [filteredStats, orderBy, order]);

    const paginatedStats = React.useMemo(() =>
        sortedStats.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sortedStats, page, rowsPerPage]);

    const systemTotals = React.useMemo(() => {
        const totalSize = stats.reduce((acc, curr) => acc + curr.totalSize, 0);
        const galleryCount = stats.reduce((acc, curr) => acc + curr.galleryCount, 0);
        const productCount = stats.reduce((acc, curr) => acc + curr.productCount, 0);
        const chatCount = stats.reduce((acc, curr) => acc + (curr.chatImageCount || 0) + (curr.whatsappImageCount || 0), 0);
        return {
            totalSize,
            galleryCount,
            productCount,
            chatCount,
            totalImages: galleryCount + productCount + chatCount
        };
    }, [stats]);

    const chartData = React.useMemo(() => {
        return [...stats]
            .sort((a, b) => b.totalSize - a.totalSize)
            .slice(0, 5)
            .map(item => ({
                name: item.companyName.length > 15 ? item.companyName.substring(0, 12) + '...' : item.companyName,
                size: parseFloat((item.totalSize / (1024 * 1024)).toFixed(2)), // In MB
                fullName: item.companyName
            }));
    }, [stats]);

    if (loading && stats.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b' }}>
                    إحصائيات استهلاك الصور
                </Typography>
                <Box>
                    <IconButton onClick={fetchStats} color="primary" sx={{ bgcolor: alpha(muiTheme.palette.primary.main, 0.1) }}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}
            {message && (
                <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#fff',
                        border: '1px solid',
                        borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05)
                    }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha('#3b82f6', 0.1),
                                color: '#3b82f6'
                            }}>
                                <ImageIcon fontSize="large" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>إجمالي الصور</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{systemTotals.totalImages.toLocaleString()}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#fff',
                        border: '1px solid',
                        borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05)
                    }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha('#10b981', 0.1),
                                color: '#10b981'
                            }}>
                                <StorageIcon fontSize="large" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>المساحة الإجمالية</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{formatSize(systemTotals.totalSize)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#fff',
                        border: '1px solid',
                        borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05)
                    }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha('#8b5cf6', 0.1),
                                color: '#8b5cf6'
                            }}>
                                <InfoIcon fontSize="large" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>صور المحادثات</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{systemTotals.chatCount.toLocaleString()}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#fff',
                        border: '1px solid',
                        borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05)
                    }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha('#f59e0b', 0.1),
                                color: '#f59e0b'
                            }}>
                                <ImageIcon fontSize="large" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>صور المنتجات</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{systemTotals.productCount.toLocaleString()}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Maintenance Actions */}
            <Card sx={{
                mb: 4,
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: alpha(muiTheme.palette.primary.main, 0.1),
                overflow: 'hidden'
            }}>
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.05),
                    borderBottom: '1px solid',
                    borderColor: alpha(muiTheme.palette.primary.main, 0.1)
                }}>
                    <CleaningServicesIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>إجراءات الصيانة وتوفير المساحة</Typography>
                </Box>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>تنظيف صور الدردشات القديمة</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" mb={2}>
                                    حذف صور المحادثات (النظام وواتساب) لتوفير المساحة.
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<DeleteSweepIcon />}
                                        onClick={() => handleDeleteOldChatImages(3)}
                                    >
                                        أقدم من 3 أشهر
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteSweepIcon />}
                                        onClick={() => handleDeleteOldChatImages(6)}
                                    >
                                        أقدم من 6 أشهر
                                    </Button>
                                </Stack>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>تنظيف الملفات اليتيمة (Orphaned Files)</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" mb={2}>
                                    البحث عن الملفات الموجودة على السيرفر وغير مرتبطة بقاعدة البيانات ومسحها.
                                </Typography>
                                {orphanedStats ? (
                                    <Box mb={2}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                            وجدنا: {orphanedStats.count} ملف ({formatSize(orphanedStats.size)})
                                        </Typography>
                                    </Box>
                                ) : null}
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={scanning ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                                        onClick={handleScanOrphaned}
                                        disabled={scanning || cleaning}
                                    >
                                        {orphanedStats ? 'إعادة الفحص' : 'فحص الملفات'}
                                    </Button>
                                    {orphanedStats && orphanedStats.count > 0 && (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="error"
                                            startIcon={cleaning ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                                            onClick={handleCleanupOrphaned}
                                            disabled={scanning || cleaning}
                                        >
                                            تنظيف الآن
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>ضغط الصور</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" mb={2}>
                                    تقليل حجم الصور المخزنة دون التأثير الملحوظ على الجودة.
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="secondary"
                                    startIcon={compressing ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                                    onClick={handleCompressImages}
                                    disabled={compressing}
                                >
                                    بدء عملية الضغط
                                </Button>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>ملاحظة هامة</Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                    • عمليات الحذف نهائية ولا يمكن التراجع عنها.<br />
                                    • حذف صور الدردشات سيجعل الصور غير متاحة للمستخدمين.<br />
                                    • تنظيف الملفات اليتيمة هو أضمن وسيلة لتوفير المساحة الضائعة.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Visual Analytics */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                            أكثر الشركات استهلاكاً للمساحة (MB)
                        </Typography>
                        <Box sx={{ height: 300, width: '100%', minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1e293b' : '#fff',
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        itemStyle={{ color: '#3b82f6' }}
                                        formatter={(value: any) => [`${value} MB`, 'المساحة']}
                                    />
                                    <Bar dataKey="size" radius={[4, 4, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={muiTheme.palette.primary.main} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* Data Table */}
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02) }}>
                    <TextField
                        placeholder="البحث عن شركة..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ width: 300 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Tooltip title="المساحة تشمل صور الحافظة وصور المنتجات المخزنة محلياً">
                        <InfoIcon color="action" fontSize="small" />
                    </Tooltip>
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 'unset' }}>
                    <Table stickyHeader aria-label="image usage statistics">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'companyName'}
                                        direction={orderBy === 'companyName' ? order : 'asc'}
                                        onClick={() => handleRequestSort('companyName')}
                                    >
                                        الشركة
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'galleryCount'}
                                        direction={orderBy === 'galleryCount' ? order : 'asc'}
                                        onClick={() => handleRequestSort('galleryCount')}
                                    >
                                        صور الحافظة
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'productCount'}
                                        direction={orderBy === 'productCount' ? order : 'asc'}
                                        onClick={() => handleRequestSort('productCount')}
                                    >
                                        صور المنتجات
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'chatImageCount'}
                                        direction={orderBy === 'chatImageCount' ? order : 'asc'}
                                        onClick={() => handleRequestSort('chatImageCount')}
                                    >
                                        الدردشات
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'whatsappImageCount'}
                                        direction={orderBy === 'whatsappImageCount' ? order : 'asc'}
                                        onClick={() => handleRequestSort('whatsappImageCount')}
                                    >
                                        واتساب
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'totalCount'}
                                        direction={orderBy === 'totalCount' ? order : 'asc'}
                                        onClick={() => handleRequestSort('totalCount')}
                                    >
                                        إجمالي الصور
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                    <TableSortLabel
                                        active={orderBy === 'totalSize'}
                                        direction={orderBy === 'totalSize' ? order : 'asc'}
                                        onClick={() => handleRequestSort('totalSize')}
                                    >
                                        إجمالي الحجم
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedStats.map((row) => (
                                <TableRow key={row.companyId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.companyName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.companyId}</Typography>
                                    </TableCell>
                                    <TableCell align="center">{row.galleryCount.toLocaleString()}</TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2">{row.productCount.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{formatSize(row.productSize)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2">{(row.chatImageCount || 0).toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{formatSize(row.chatImageSize || 0)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2">{(row.whatsappImageCount || 0).toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{formatSize(row.whatsappImageSize || 0)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                                            {row.totalCount.toLocaleString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>
                                            {formatSize(row.totalSize)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="خيارات الحذف">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={(e) => handleMenuOpen(e, row.companyId, row.companyName)}
                                                sx={{ bgcolor: alpha(muiTheme.palette.error.main, 0.1) }}
                                            >
                                                <SettingsIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedStats.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        لا توجد بيانات للعرض
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={filteredStats.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="عدد الصفوف:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
            </Card>

            {/* Deletion Menu for Companies */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: 180
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">خيارات الحذف لـ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedCompany?.name}</Typography>
                </Box>

                <MenuItem onClick={() => handleDeleteCompanyImages(selectedCompany!.id, selectedCompany!.name, 'CHAT')} sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <CleaningServicesIcon fontSize="small" color="primary" />
                        <Typography variant="body2">حذف صور الدردشات</Typography>
                    </Stack>
                </MenuItem>

                <MenuItem onClick={() => handleDeleteCompanyImages(selectedCompany!.id, selectedCompany!.name, 'GALLERY')} sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <ImageIcon fontSize="small" color="info" />
                        <Typography variant="body2">حذف صور المعرض</Typography>
                    </Stack>
                </MenuItem>

                <MenuItem onClick={() => handleDeleteCompanyImages(selectedCompany!.id, selectedCompany!.name, 'PRODUCTS')} sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <BusinessIcon fontSize="small" color="warning" />
                        <Typography variant="body2">حذف صور المنتجات</Typography>
                    </Stack>
                </MenuItem>

                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
                    <MenuItem onClick={() => handleDeleteCompanyImages(selectedCompany!.id, selectedCompany!.name, 'ALL')} sx={{ py: 1.5, color: 'error.main' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <DeleteSweepIcon fontSize="small" color="error" />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>حذف كافة البيانات</Typography>
                        </Stack>
                    </MenuItem>
                </Box>
            </Menu>
        </Box>
    );
};

export default SuperAdminImageStats;
