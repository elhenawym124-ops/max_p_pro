import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

interface SchedulerStats {
  totalChecked?: number;
  totalUpdated?: number;
  totalErrors?: number;
  totalChecks?: number;
  campaignsSent?: number;
  errors?: number;
}

interface Scheduler {
  id: string;
  name: string;
  description: string;
  isRunning: boolean;
  intervalMinutes?: number;
  activeCompanies?: number;
  lastRun?: string;
  lastCheck?: string;
  type: string;
  schedule?: string;
  icon: string;
  stats: SchedulerStats | null;
}

interface SchedulersSummary {
  total: number;
  running: number;
  stopped: number;
}

const SystemMonitoring: React.FC = () => {
  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [summary, setSummary] = useState<SchedulersSummary>({ total: 0, running: 0, stopped: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [intervalDialog, setIntervalDialog] = useState(false);
  const [newInterval, setNewInterval] = useState(5);

  const fetchSchedulersStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/schedulers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSchedulers(response.data.data.schedulers);
        setSummary(response.data.data.summary);
      }
    } catch (err: any) {
      console.error('Error fetching schedulers:', err);
      setError(err.response?.data?.message || 'فشل في جلب حالة الموقتات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulersStatus();
    const interval = setInterval(fetchSchedulersStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartScheduler = async (schedulerId: string) => {
    try {
      setActionLoading(schedulerId);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/schedulers/${schedulerId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        await fetchSchedulersStatus();
      }
    } catch (err: any) {
      console.error('Error starting scheduler:', err);
      setError(err.response?.data?.message || 'فشل في تشغيل الموقت');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopScheduler = async (schedulerId: string) => {
    try {
      setActionLoading(schedulerId);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/schedulers/${schedulerId}/stop`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        await fetchSchedulersStatus();
      }
    } catch (err: any) {
      console.error('Error stopping scheduler:', err);
      setError(err.response?.data?.message || 'فشل في إيقاف الموقت');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateInterval = async () => {
    try {
      setActionLoading('interval');
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/schedulers/woocommerce/interval`,
        { intervalMinutes: newInterval },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setIntervalDialog(false);
        await fetchSchedulersStatus();
      }
    } catch (err: any) {
      console.error('Error updating interval:', err);
      setError(err.response?.data?.message || 'فشل في تحديث الفترة');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualSync = async (type: 'woocommerce' | 'turbo') => {
    try {
      setActionLoading(`manual-${type}`);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('accessToken');
      const endpoint = type === 'woocommerce' 
        ? '/admin/schedulers/woocommerce/sync'
        : '/admin/schedulers/turbo/update';
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
      }
    } catch (err: any) {
      console.error('Error triggering manual action:', err);
      setError(err.response?.data?.message || 'فشل في تنفيذ العملية');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لم يتم التشغيل بعد';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG');
  };

  if (loading && schedulers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          ⚙️ مراقبة الموقتات
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSchedulersStatus}
          disabled={loading}
        >
          تحديث
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{summary.total}</Typography>
            <Typography variant="body1">إجمالي الموقتات</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{summary.running}</Typography>
            <Typography variant="body1">موقتات نشطة</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{summary.stopped}</Typography>
            <Typography variant="body1">موقتات متوقفة</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {schedulers.map((scheduler) => (
          <Grid item xs={12} md={6} lg={4} key={scheduler.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h4">{scheduler.icon}</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {scheduler.name}
                      </Typography>
                      <Chip
                        label={scheduler.isRunning ? 'نشط' : 'متوقف'}
                        color={scheduler.isRunning ? 'success' : 'error'}
                        size="small"
                        icon={scheduler.isRunning ? <CheckCircleIcon /> : <ErrorIcon />}
                      />
                    </Box>
                  </Box>
                  {scheduler.id === 'woocommerce_sync' && (
                    <Tooltip title="تعديل الفترة">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setNewInterval(scheduler.intervalMinutes || 5);
                          setIntervalDialog(true);
                        }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {scheduler.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" flexDirection="column" gap={1}>
                  {scheduler.type === 'cron' && scheduler.schedule && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">الجدولة: {scheduler.schedule}</Typography>
                    </Box>
                  )}

                  {scheduler.type === 'polling' && scheduler.intervalMinutes && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">كل {scheduler.intervalMinutes} دقيقة</Typography>
                    </Box>
                  )}

                  {scheduler.activeCompanies !== undefined && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <InfoIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        شركات نشطة: {scheduler.activeCompanies}
                      </Typography>
                    </Box>
                  )}

                  {scheduler.lastRun && (
                    <Typography variant="caption" color="text.secondary">
                      آخر تشغيل: {formatDate(scheduler.lastRun)}
                    </Typography>
                  )}

                  {scheduler.lastCheck && (
                    <Typography variant="caption" color="text.secondary">
                      آخر فحص: {formatDate(scheduler.lastCheck)}
                    </Typography>
                  )}
                </Box>

                {scheduler.stats && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      الإحصائيات:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      {scheduler.stats.totalChecked !== undefined && (
                        <Typography variant="body2">
                          تم الفحص: {scheduler.stats.totalChecked}
                        </Typography>
                      )}
                      {scheduler.stats.totalUpdated !== undefined && (
                        <Typography variant="body2" color="success.main">
                          تم التحديث: {scheduler.stats.totalUpdated}
                        </Typography>
                      )}
                      {scheduler.stats.totalChecks !== undefined && (
                        <Typography variant="body2">
                          إجمالي الفحوصات: {scheduler.stats.totalChecks}
                        </Typography>
                      )}
                      {scheduler.stats.campaignsSent !== undefined && (
                        <Typography variant="body2" color="success.main">
                          حملات مرسلة: {scheduler.stats.campaignsSent}
                        </Typography>
                      )}
                      {(scheduler.stats.totalErrors !== undefined || scheduler.stats.errors !== undefined) && (
                        <Typography variant="body2" color="error.main">
                          أخطاء: {scheduler.stats.totalErrors || scheduler.stats.errors}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </CardContent>

              <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                {scheduler.isRunning ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    fullWidth
                    onClick={() => handleStopScheduler(scheduler.id)}
                    disabled={actionLoading === scheduler.id}
                  >
                    {actionLoading === scheduler.id ? <CircularProgress size={24} /> : 'إيقاف'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayIcon />}
                    fullWidth
                    onClick={() => handleStartScheduler(scheduler.id)}
                    disabled={actionLoading === scheduler.id}
                  >
                    {actionLoading === scheduler.id ? <CircularProgress size={24} /> : 'تشغيل'}
                  </Button>
                )}

                {(scheduler.id === 'woocommerce_sync' || scheduler.id === 'turbo_tracking') && (
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleManualSync(scheduler.id === 'woocommerce_sync' ? 'woocommerce' : 'turbo')}
                    disabled={actionLoading === `manual-${scheduler.id === 'woocommerce_sync' ? 'woocommerce' : 'turbo'}`}
                  >
                    {actionLoading === `manual-${scheduler.id === 'woocommerce_sync' ? 'woocommerce' : 'turbo'}` 
                      ? <CircularProgress size={24} /> 
                      : 'تشغيل يدوي'}
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={intervalDialog} onClose={() => setIntervalDialog(false)}>
        <DialogTitle>تعديل فترة المزامنة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="الفترة بالدقائق"
            type="number"
            fullWidth
            value={newInterval}
            onChange={(e) => setNewInterval(parseInt(e.target.value))}
            inputProps={{ min: 1, max: 60 }}
            helperText="أدخل قيمة بين 1 و 60 دقيقة"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntervalDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleUpdateInterval}
            variant="contained"
            disabled={actionLoading === 'interval' || newInterval < 1 || newInterval > 60}
          >
            {actionLoading === 'interval' ? <CircularProgress size={24} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemMonitoring;
