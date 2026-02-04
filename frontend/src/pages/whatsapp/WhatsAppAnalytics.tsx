import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Alert
} from '@mui/material';
import {
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 الأنواع
// ═══════════════════════════════════════════════════════════════════════════════

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: string;
  readRate: string;
  byCategory: Record<string, number>;
  byEvent: Record<string, number>;
}

interface NotificationLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  category: string;
  eventType: string;
  content: string;
  status: string;
  sentAt: string;
  createdAt: string;
  template?: { name: string };
  order?: { orderNumber: string };
  customer?: { firstName: string; lastName: string };
}

const WhatsAppAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'warning',
    QUEUED: 'info',
    SENDING: 'info',
    SENT: 'success',
    DELIVERED: 'success',
    READ: 'success',
    FAILED: 'error',
    CANCELLED: 'default'
  };

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('whatsappNotifications.status.pending'),
    QUEUED: t('whatsappNotifications.status.queued'),
    SENDING: t('whatsappNotifications.status.sending'),
    SENT: t('whatsappNotifications.status.sent'),
    DELIVERED: t('whatsappNotifications.status.delivered'),
    READ: t('whatsappNotifications.status.read'),
    FAILED: t('whatsappNotifications.status.failed'),
    CANCELLED: t('whatsappNotifications.status.cancelled')
  };

  const CATEGORY_LABELS: Record<string, string> = {
    ORDERS: t('whatsappNotifications.tabs.orders'),
    PRODUCTS: t('whatsappNotifications.tabs.products'),
    MARKETING: t('whatsappNotifications.tabs.marketing'),
    ABANDONED_CART: t('whatsappNotifications.tabs.abandonedCart'),
    HR: t('whatsappNotifications.tabs.hr'),
    SYSTEM: t('common.system')
  };

  const EVENT_LABELS: Record<string, string> = {
    ORDER_CREATED: t('whatsappNotifications.orders.orderCreated'),
    ORDER_CONFIRMED: t('whatsappNotifications.orders.orderConfirmed'),
    ORDER_PROCESSING: t('whatsappNotifications.orders.orderProcessing'),
    ORDER_SHIPPED: t('whatsappNotifications.orders.orderShipped'),
    ORDER_OUT_FOR_DELIVERY: t('whatsappNotifications.orders.orderShipped'),
    ORDER_DELIVERED: t('whatsappNotifications.orders.orderDelivered'),
    ORDER_CANCELLED: t('whatsappNotifications.orders.orderCancelled'),
    PAYMENT_REMINDER: t('whatsappNotifications.orders.paymentReminder'),
    BACK_IN_STOCK: t('whatsappNotifications.products.backInStock'),
    PRICE_DROP: t('whatsappNotifications.products.priceDrop'),
    CART_ABANDONED_1H: t('whatsappNotifications.abandonedCart.firstReminder'),
    CART_ABANDONED_24H: t('whatsappNotifications.abandonedCart.secondReminder'),
    CART_ABANDONED_WITH_DISCOUNT: t('whatsappNotifications.abandonedCart.incentiveDiscount'),
    PROMOTIONAL: t('whatsappNotifications.marketing.promotional'),
    COUPON_SENT: t('whatsappNotifications.marketing.coupons'),
    BIRTHDAY_WISH: t('whatsappNotifications.marketing.birthday'),
    ATTENDANCE_REMINDER: t('whatsappNotifications.hr.attendance'),
    LEAVE_APPROVED: t('whatsappNotifications.hr.leave'),
    PAYROLL_READY: t('whatsappNotifications.hr.payroll')
  };


  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [dateRange, setDateRange] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📡 جلب البيانات
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/whatsapp/notifications/stats', {
        params: { days: dateRange }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await apiClient.get('/whatsapp/notifications/logs', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          category: categoryFilter || undefined,
          status: statusFilter || undefined
        }
      });
      setLogs(response.data.logs || []);
      setTotalLogs(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [dateRange, page, rowsPerPage, categoryFilter, statusFilter]);

  const handleRefresh = () => {
    fetchStats();
    fetchLogs();
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 العرض
  // ═══════════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/whatsapp/notifications')}>
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </IconButton>
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <Box>
            <Typography variant="h5" fontWeight="bold">{t('whatsappAnalytics.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('whatsappAnalytics.description')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('whatsappAnalytics.timeRange.label')}</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              label={t('whatsappAnalytics.timeRange.label')}
            >
              <MenuItem value={7}>{t('whatsappAnalytics.timeRange.last7Days')}</MenuItem>
              <MenuItem value={30}>{t('whatsappAnalytics.timeRange.last30Days')}</MenuItem>
              <MenuItem value={90}>{t('whatsappAnalytics.timeRange.last90Days')}</MenuItem>
              <MenuItem value={365}>{t('whatsappAnalytics.timeRange.lastYear')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات الرئيسية */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('whatsappAnalytics.stats.total')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats?.delivered || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('whatsappAnalytics.stats.delivered')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats?.read || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('whatsappAnalytics.stats.read')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {stats?.failed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('whatsappAnalytics.stats.failed')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* معدلات الأداء */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">{t('whatsappAnalytics.stats.deliveryRate')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <Typography variant="h6" color="success.main">{stats?.deliveryRate || 0}%</Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={parseFloat(stats?.deliveryRate || '0')}
                sx={{ height: 10, borderRadius: 5 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">{t('whatsappAnalytics.stats.readRate')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <Typography variant="h6" color="info.main">{stats?.readRate || 0}%</Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={parseFloat(stats?.readRate || '0')}
                sx={{ height: 10, borderRadius: 5 }}
                color="info"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الإحصائيات حسب التصنيف */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('whatsappAnalytics.charts.byCategory')}</Typography>
              {stats?.byCategory && Object.keys(stats.byCategory).length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{CATEGORY_LABELS[category] || category}</Typography>
                        <Typography variant="body2" fontWeight="bold">{count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / (stats?.total || 1)) * 100}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>{t('whatsappAnalytics.charts.noData')}</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('whatsappAnalytics.charts.topEvents')}</Typography>
              {stats?.byEvent && Object.keys(stats.byEvent).length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  {Object.entries(stats.byEvent)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([event, count]) => (
                      <Box key={event} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{EVENT_LABELS[event] || event}</Typography>
                          <Typography variant="body2" fontWeight="bold">{count}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(count / (stats?.total || 1)) * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                          color="secondary"
                        />
                      </Box>
                    ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>{t('whatsappAnalytics.charts.noData')}</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* سجل الإشعارات */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('whatsappAnalytics.logs.title')}</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('whatsappAnalytics.logs.type')}</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label={t('whatsappAnalytics.logs.type')}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('whatsappAnalytics.logs.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label={t('whatsappAnalytics.logs.status')}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('whatsappAnalytics.logs.recipient')}</TableCell>
                  <TableCell>{t('whatsappAnalytics.logs.type')}</TableCell>
                  <TableCell>{t('whatsappAnalytics.logs.status')}</TableCell>
                  <TableCell>{t('whatsappAnalytics.logs.date')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="body2">{log.recipientName || 'غير معروف'}</Typography>
                        <Typography variant="caption" color="text.secondary">{log.recipientPhone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={EVENT_LABELS[log.eventType] || log.eventType}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[log.status] || log.status}
                          size="small"
                          color={STATUS_COLORS[log.status] as any || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(log.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        {t('whatsappAnalytics.logs.noLogs')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalLogs}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage={t('whatsappAnalytics.logs.rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) =>
              t('whatsappAnalytics.logs.displayedRows', { from, to, count })
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default WhatsAppAnalytics;
