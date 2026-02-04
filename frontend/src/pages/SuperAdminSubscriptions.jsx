import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Autorenew as RenewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    planType: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    companyId: '',
    planType: 'BASIC',
    billingCycle: 'monthly',
    price: '',
    currency: 'EGP',
    startDate: '',
    trialDays: 0,
    autoRenew: true
  });

  const [cancelData, setCancelData] = useState({
    reason: '',
    immediate: false
  });

  const [renewData, setRenewData] = useState({
    planType: '',
    price: '',
    billingCycle: '',
    immediate: false
  });

  useEffect(() => {
    fetchSubscriptions();
  }, [page, filters]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(buildApiUrl(`admin/subscriptions?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSubscriptions(data.data.subscriptions);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.pages);
      } else {
        setError(data.message || 'خطأ في جلب البيانات');
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1);
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'success',
      TRIAL: 'info',
      INACTIVE: 'warning',
      CANCELLED: 'error',
      EXPIRED: 'error',
      SUSPENDED: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      ACTIVE: 'نشط',
      TRIAL: 'تجريبي',
      INACTIVE: 'غير نشط',
      CANCELLED: 'ملغي',
      EXPIRED: 'منتهي',
      SUSPENDED: 'معلق'
    };
    return texts[status] || status;
  };

  const getPlanText = (planType) => {
    const texts = {
      BASIC: 'أساسية',
      PRO: 'احترافية',
      ENTERPRISE: 'مؤسسية'
    };
    return texts[planType] || planType;
  };

  const formatPrice = (price, currency = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const handleCreateSubscription = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(buildApiUrl('admin/subscriptions'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setCreateDialogOpen(false);
        fetchSubscriptions();
        setFormData({
          companyId: '',
          planType: 'BASIC',
          billingCycle: 'monthly',
          price: '',
          currency: 'EGP',
          startDate: '',
          trialDays: 0,
          autoRenew: true
        });
      } else {
        setError(data.message || 'خطأ في إنشاء الاشتراك');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl(`admin/subscriptions/${selectedSubscription.id}/cancel`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cancelData)
      });

      const data = await response.json();

      if (data.success) {
        setCancelDialogOpen(false);
        fetchSubscriptions();
        setCancelData({ reason: '', immediate: false });
      } else {
        setError(data.message || 'خطأ في إلغاء الاشتراك');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  const handleRenewSubscription = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl(`admin/subscriptions/${selectedSubscription.id}/renew`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planType: renewData.planType || selectedSubscription.planType,
          price: renewData.price ? parseFloat(renewData.price) : selectedSubscription.price,
          billingCycle: renewData.billingCycle || selectedSubscription.billingCycle,
          immediate: renewData.immediate
        })
      });

      const data = await response.json();

      if (data.success) {
        setRenewDialogOpen(false);
        fetchSubscriptions();
        setRenewData({ planType: '', price: '', billingCycle: '', immediate: false });
      } else {
        setError(data.message || 'خطأ في تجديد الاشتراك');
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  if (loading && subscriptions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          إدارة الاشتراكات
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          اشتراك جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي الاشتراكات
              </Typography>
              <Typography variant="h4">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الاشتراكات النشطة
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.byStatus?.ACTIVE || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الاشتراكات التجريبية
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats.byStatus?.TRIAL || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الإيرادات الشهرية
              </Typography>
              <Typography variant="h4" color="primary.main">
                {formatPrice(stats.monthlyRevenue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="البحث"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="ACTIVE">نشط</MenuItem>
                  <MenuItem value="TRIAL">تجريبي</MenuItem>
                  <MenuItem value="INACTIVE">غير نشط</MenuItem>
                  <MenuItem value="CANCELLED">ملغي</MenuItem>
                  <MenuItem value="EXPIRED">منتهي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>نوع الخطة</InputLabel>
                <Select
                  value={filters.planType}
                  onChange={(e) => handleFilterChange('planType', e.target.value)}
                  label="نوع الخطة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="BASIC">أساسية</MenuItem>
                  <MenuItem value="PRO">احترافية</MenuItem>
                  <MenuItem value="ENTERPRISE">مؤسسية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchSubscriptions}
                fullWidth
              >
                تحديث
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الشركة</TableCell>
                <TableCell>نوع الخطة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>السعر</TableCell>
                <TableCell>تاريخ البداية</TableCell>
                <TableCell>التجديد التالي</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {subscription.company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subscription.company.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPlanText(subscription.planType)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(subscription.status)}
                      color={getStatusColor(subscription.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatPrice(subscription.price, subscription.currency)}
                    <Typography variant="caption" display="block">
                      {subscription.billingCycle === 'monthly' ? 'شهري' : 'سنوي'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(subscription.startDate)}
                  </TableCell>
                  <TableCell>
                    {subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="عرض الفواتير">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/super-admin/invoices?subscription=${subscription.id}`)}
                        >
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="عرض المدفوعات">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/super-admin/payments?subscription=${subscription.id}`)}
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setEditDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {(subscription.status === 'ACTIVE' || subscription.status === 'EXPIRED') && (
                        <Tooltip title="تجديد">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setRenewData({
                                planType: subscription.planType,
                                price: subscription.price.toString(),
                                billingCycle: subscription.billingCycle,
                                immediate: false
                              });
                              setRenewDialogOpen(true);
                            }}
                          >
                            <RenewIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {subscription.status !== 'CANCELLED' && (
                        <Tooltip title="إلغاء">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}
      </Card>

      {/* Create Subscription Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء اشتراك جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="معرف الشركة"
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الخطة</InputLabel>
                <Select
                  value={formData.planType}
                  onChange={(e) => setFormData(prev => ({ ...prev, planType: e.target.value }))}
                  label="نوع الخطة"
                >
                  <MenuItem value="BASIC">أساسية</MenuItem>
                  <MenuItem value="PRO">احترافية</MenuItem>
                  <MenuItem value="ENTERPRISE">مؤسسية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>دورة الفوترة</InputLabel>
                <Select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData(prev => ({ ...prev, billingCycle: e.target.value }))}
                  label="دورة الفوترة"
                >
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="yearly">سنوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="السعر"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>العملة</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  label="العملة"
                >
                  <MenuItem value="EGP">جنيه مصري</MenuItem>
                  <MenuItem value="USD">دولار أمريكي</MenuItem>
                  <MenuItem value="SAR">ريال سعودي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تاريخ البداية"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="أيام التجربة"
                type="number"
                value={formData.trialDays}
                onChange={(e) => setFormData(prev => ({ ...prev, trialDays: parseInt(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreateSubscription} variant="contained">إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Renew Subscription Dialog */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تجديد الاشتراك</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            تجديد اشتراك {selectedSubscription?.company?.name}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الخطة</InputLabel>
                <Select
                  value={renewData.planType}
                  onChange={(e) => setRenewData(prev => ({ ...prev, planType: e.target.value }))}
                  label="نوع الخطة"
                >
                  <MenuItem value="BASIC">أساسية (2,500 ج.م)</MenuItem>
                  <MenuItem value="PRO">احترافية (7,500 ج.م)</MenuItem>
                  <MenuItem value="ENTERPRISE">مؤسسية (15,000 ج.م)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>دورة الفوترة</InputLabel>
                <Select
                  value={renewData.billingCycle}
                  onChange={(e) => setRenewData(prev => ({ ...prev, billingCycle: e.target.value }))}
                  label="دورة الفوترة"
                >
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="yearly">سنوي (خصم 10%)</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="السعر المخصص (اختياري)"
                type="number"
                value={renewData.price}
                onChange={(e) => setRenewData(prev => ({ ...prev, price: e.target.value }))}
                helperText="اتركه فارغاً لاستخدام السعر الافتراضي"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={renewData.immediate}
                    onChange={(e) => setRenewData(prev => ({ ...prev, immediate: e.target.checked }))}
                  />
                  تجديد فوري (بدلاً من انتظار تاريخ التجديد)
                </label>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>ملاحظة:</strong> سيتم إنشاء فاتورة جديدة وتحديث تاريخ التجديد التالي تلقائياً
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleRenewSubscription} variant="contained" color="primary">
            تجديد الاشتراك
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إلغاء الاشتراك</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            هل أنت متأكد من إلغاء اشتراك {selectedSubscription?.company?.name}؟
          </Typography>
          <TextField
            fullWidth
            label="سبب الإلغاء"
            multiline
            rows={3}
            value={cancelData.reason}
            onChange={(e) => setCancelData(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl component="fieldset">
            <label>
              <input
                type="checkbox"
                checked={cancelData.immediate}
                onChange={(e) => setCancelData(prev => ({ ...prev, immediate: e.target.checked }))}
              />
              إلغاء فوري (بدلاً من انتظار نهاية الفترة)
            </label>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCancelSubscription} variant="contained" color="error">
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminSubscriptions;
