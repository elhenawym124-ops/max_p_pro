import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  FileDownload as FileDownloadIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { apiClient } from '../services/apiClient';

const MyActivity = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalActivities, setTotalActivities] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    category: '',
    action: '',
    severity: '',
    isSuccess: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Dialog
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch activities
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await apiClient.get('/activity/my-activities', {
        params
      });

      if (response.data.success) {
        setActivities(response.data.data.activities);
        setTotalActivities(response.data.data.pagination.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء جلب النشاطات');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/activity/my-stats');

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [page, rowsPerPage, filters.category, filters.action, filters.severity, filters.isSuccess, filters.startDate, filters.endDate, filters.search]);

  // Export activities
  const handleExport = async () => {
    try {
      const response = await apiClient.get('/activity/export/csv', {
        params: filters,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `my-activities-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('حدث خطأ أثناء تصدير النشاطات');
    }
  };

  // View activity details
  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'LOW': return <InfoIcon fontSize="small" />;
      case 'MEDIUM': return <InfoIcon fontSize="small" />;
      case 'HIGH': return <WarningIcon fontSize="small" />;
      case 'CRITICAL': return <ErrorIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  // Get category label in Arabic
  const getCategoryLabel = (category) => {
    const labels = {
      AUTH: 'المصادقة',
      ADS: 'الإعلانات',
      CONVERSATIONS: 'المحادثات',
      BILLING: 'الفواتير',
      SETTINGS: 'الإعدادات',
      SUPPORT: 'الدعم الفني',
      FILES: 'الملفات',
      USERS: 'المستخدمين',
      COMPANY: 'الشركة',
      REPORTS: 'التقارير'
    };
    return labels[category] || category;
  };

  // Get action label in Arabic
  const getActionLabel = (action) => {
    const labels = {
      CREATE: 'إنشاء',
      UPDATE: 'تعديل',
      DELETE: 'حذف',
      LOGIN: 'تسجيل دخول',
      LOGOUT: 'تسجيل خروج',
      UPLOAD: 'رفع',
      DOWNLOAD: 'تحميل',
      VIEW: 'عرض',
      SEND: 'إرسال',
      RECEIVE: 'استقبال',
      ACTIVATE: 'تفعيل',
      DEACTIVATE: 'إيقاف',
      APPROVE: 'موافقة',
      REJECT: 'رفض',
      EXPORT: 'تصدير',
      IMPORT: 'استيراد'
    };
    return labels[action] || action;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        📊 نشاطاتي
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  إجمالي النشاطات
                </Typography>
                <Typography variant="h4">
                  {stats.totalActivities}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  آخر نشاط
                </Typography>
                <Typography variant="body1">
                  {stats.lastActivity ? format(new Date(stats.lastActivity.createdAt), 'PPp', { locale: ar }) : 'لا يوجد'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  التصنيفات الأكثر نشاطاً
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {stats.categoryStats && stats.categoryStats.length > 0 ? (
                    stats.categoryStats.slice(0, 5).map((cat) => (
                      <Chip
                        key={cat._id}
                        label={`${getCategoryLabel(cat._id)}: ${cat.count}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      لا توجد تصنيفات
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={filters.category}
                label="التصنيف"
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="AUTH">المصادقة</MenuItem>
                <MenuItem value="ADS">الإعلانات</MenuItem>
                <MenuItem value="CONVERSATIONS">المحادثات</MenuItem>
                <MenuItem value="BILLING">الفواتير</MenuItem>
                <MenuItem value="SETTINGS">الإعدادات</MenuItem>
                <MenuItem value="SUPPORT">الدعم الفني</MenuItem>
                <MenuItem value="FILES">الملفات</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الخطورة</InputLabel>
              <Select
                value={filters.severity}
                label="الخطورة"
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="LOW">منخفض</MenuItem>
                <MenuItem value="MEDIUM">متوسط</MenuItem>
                <MenuItem value="HIGH">عالي</MenuItem>
                <MenuItem value="CRITICAL">حرج</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filters.isSuccess}
                label="الحالة"
                onChange={(e) => setFilters({ ...filters, isSuccess: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="true">نجح</MenuItem>
                <MenuItem value="false">فشل</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="بحث"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="ابحث في الوصف..."
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
            >
              تصدير CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Activities Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>التاريخ والوقت</TableCell>
              <TableCell>التصنيف</TableCell>
              <TableCell>الإجراء</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>الخطورة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تفاصيل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  لا توجد نشاطات
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity._id} hover>
                  <TableCell>
                    {format(new Date(activity.createdAt), 'PPp', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(activity.category)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{getActionLabel(activity.action)}</TableCell>
                  <TableCell>{activity.description}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getSeverityIcon(activity.severity)}
                      label={activity.severity}
                      size="small"
                      color={getSeverityColor(activity.severity)}
                    />
                  </TableCell>
                  <TableCell>
                    {activity.isSuccess ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(activity)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalActivities}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* Activity Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>تفاصيل النشاط</DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    التصنيف
                  </Typography>
                  <Typography variant="body1">
                    {getCategoryLabel(selectedActivity.category)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    الإجراء
                  </Typography>
                  <Typography variant="body1">
                    {getActionLabel(selectedActivity.action)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    الوصف
                  </Typography>
                  <Typography variant="body1">
                    {selectedActivity.description}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    التاريخ والوقت
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedActivity.createdAt), 'PPpp', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    الحالة
                  </Typography>
                  <Typography variant="body1">
                    {selectedActivity.isSuccess ? 'نجح ✅' : 'فشل ❌'}
                  </Typography>
                </Grid>
                {selectedActivity.metadata && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        عنوان IP
                      </Typography>
                      <Typography variant="body1">
                        {selectedActivity.metadata.ipAddress || 'غير متوفر'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        المتصفح
                      </Typography>
                      <Typography variant="body1">
                        {selectedActivity.metadata.browser || 'غير متوفر'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        نظام التشغيل
                      </Typography>
                      <Typography variant="body1">
                        {selectedActivity.metadata.os || 'غير متوفر'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        نوع الجهاز
                      </Typography>
                      <Typography variant="body1">
                        {selectedActivity.metadata.deviceType || 'غير متوفر'}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyActivity;
