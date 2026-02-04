import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/urlHelper';
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
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SuperAdminPayments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Form data for recording payment
  const [formData, setFormData] = useState({
    companyId: '',
    invoiceId: '',
    subscriptionId: '',
    amount: '',
    currency: 'EGP',
    method: 'BANK_TRANSFER',
    gateway: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [page, filters]);

  // Separate effect for URL params to avoid infinite loop
  useEffect(() => {
    const invoiceId = searchParams.get('invoice');
    const subscriptionId = searchParams.get('subscription');
    if (invoiceId && !filters.invoiceId) {
      setFilters(prev => ({ ...prev, invoiceId }));
    }
    if (subscriptionId && !filters.subscriptionId) {
      setFilters(prev => ({ ...prev, subscriptionId }));
    }
  }, [searchParams]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/auth/login');
        return;
      }
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(buildApiUrl(`admin/payments?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/auth/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setPayments(data.data.payments);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.pages);
      } else {
        setError(data.message || 'خطأ في جلب البيانات');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
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
      PENDING: 'warning',
      COMPLETED: 'success',
      FAILED: 'error',
      CANCELLED: 'error',
      REFUNDED: 'info'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      PENDING: 'معلق',
      COMPLETED: 'مكتمل',
      FAILED: 'فاشل',
      CANCELLED: 'ملغي',
      REFUNDED: 'مسترد'
    };
    return texts[status] || status;
  };

  const getMethodText = (method) => {
    const texts = {
      CREDIT_CARD: 'بطاقة ائتمان',
      DEBIT_CARD: 'بطاقة خصم',
      BANK_TRANSFER: 'تحويل بنكي',
      PAYPAL: 'باي بال',
      STRIPE: 'سترايب',
      CASH: 'نقدي',
      CHECK: 'شيك'
    };
    return texts[method] || method;
  };

  const getMethodIcon = (method) => {
    const icons = {
      CREDIT_CARD: <CreditCardIcon />,
      DEBIT_CARD: <CreditCardIcon />,
      BANK_TRANSFER: <BankIcon />,
      PAYPAL: <MoneyIcon />,
      STRIPE: <CreditCardIcon />,
      CASH: <MoneyIcon />,
      CHECK: <ReceiptIcon />
    };
    return icons[method] || <MoneyIcon />;
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

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  const handleCreatePayment = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/auth/login');
        return;
      }
      
      const response = await fetch(buildApiUrl('admin/payments'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/auth/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setCreateDialogOpen(false);
        fetchPayments();
        setFormData({
          companyId: '',
          invoiceId: '',
          subscriptionId: '',
          amount: '',
          currency: 'EGP',
          method: 'BANK_TRANSFER',
          gateway: '',
          transactionId: '',
          notes: ''
        });
      } else {
        setError(data.message || 'خطأ في تسجيل المدفوعة');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  if (loading && payments.length === 0) {
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
          إدارة المدفوعات
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          تسجيل مدفوعة
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
                إجمالي المدفوعات
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
                المدفوعات المكتملة
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.byStatus?.COMPLETED?.count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                المدفوعات المعلقة
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.byStatus?.PENDING?.count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المبالغ
              </Typography>
              <Typography variant="h4" color="primary.main">
                {formatPrice(stats.byStatus?.COMPLETED?.amount || 0)}
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
                  <MenuItem value="PENDING">معلق</MenuItem>
                  <MenuItem value="COMPLETED">مكتمل</MenuItem>
                  <MenuItem value="FAILED">فاشل</MenuItem>
                  <MenuItem value="CANCELLED">ملغي</MenuItem>
                  <MenuItem value="REFUNDED">مسترد</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>طريقة الدفع</InputLabel>
                <Select
                  value={filters.method}
                  onChange={(e) => handleFilterChange('method', e.target.value)}
                  label="طريقة الدفع"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="CREDIT_CARD">بطاقة ائتمان</MenuItem>
                  <MenuItem value="BANK_TRANSFER">تحويل بنكي</MenuItem>
                  <MenuItem value="PAYPAL">باي بال</MenuItem>
                  <MenuItem value="CASH">نقدي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="من تاريخ"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="إلى تاريخ"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم المدفوعة</TableCell>
                <TableCell>الشركة</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الدفع</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {payment.paymentNumber}
                    </Typography>
                    {payment.transactionId && (
                      <Typography variant="caption" color="text.secondary">
                        {payment.transactionId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {payment.company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {payment.company.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" color="primary">
                      {formatPrice(payment.amount, payment.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getMethodIcon(payment.method)}
                      <Typography variant="body2">
                        {getMethodText(payment.method)}
                      </Typography>
                    </Box>
                    {payment.gateway && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {payment.gateway}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(payment.status)}
                      color={getStatusColor(payment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {payment.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(payment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setViewDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {payment.invoice && (
                        <Tooltip title="عرض الفاتورة">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/super-admin/invoices?invoice=${payment.invoice.id}`)}
                          >
                            <ReceiptIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {payment.subscription && (
                        <Tooltip title="عرض الاشتراك">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/super-admin/subscriptions?subscription=${payment.subscription.id}`)}
                          >
                            <BusinessIcon />
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

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تسجيل مدفوعة جديدة</DialogTitle>
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
              <TextField
                fullWidth
                label="معرف الفاتورة (اختياري)"
                value={formData.invoiceId}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="معرف الاشتراك (اختياري)"
                value={formData.subscriptionId}
                onChange={(e) => setFormData(prev => ({ ...prev, subscriptionId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المبلغ"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
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
              <FormControl fullWidth>
                <InputLabel>طريقة الدفع</InputLabel>
                <Select
                  value={formData.method}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                  label="طريقة الدفع"
                >
                  <MenuItem value="BANK_TRANSFER">تحويل بنكي</MenuItem>
                  <MenuItem value="CREDIT_CARD">بطاقة ائتمان</MenuItem>
                  <MenuItem value="DEBIT_CARD">بطاقة خصم</MenuItem>
                  <MenuItem value="PAYPAL">باي بال</MenuItem>
                  <MenuItem value="CASH">نقدي</MenuItem>
                  <MenuItem value="CHECK">شيك</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="بوابة الدفع (اختياري)"
                value={formData.gateway}
                onChange={(e) => setFormData(prev => ({ ...prev, gateway: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="معرف المعاملة"
                value={formData.transactionId}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreatePayment} variant="contained">تسجيل</Button>
        </DialogActions>
      </Dialog>

      {/* View Payment Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل المدفوعة</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">رقم المدفوعة</Typography>
                <Typography variant="body1">{selectedPayment.paymentNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الشركة</Typography>
                <Typography variant="body1">{selectedPayment.company.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المبلغ</Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(selectedPayment.amount, selectedPayment.currency)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">طريقة الدفع</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {getMethodIcon(selectedPayment.method)}
                  <Typography variant="body1">
                    {getMethodText(selectedPayment.method)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الحالة</Typography>
                <Chip
                  label={getStatusText(selectedPayment.status)}
                  color={getStatusColor(selectedPayment.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">تاريخ الدفع</Typography>
                <Typography variant="body1">
                  {selectedPayment.paidAt ? formatDateTime(selectedPayment.paidAt) : 'غير محدد'}
                </Typography>
              </Grid>
              {selectedPayment.gateway && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">بوابة الدفع</Typography>
                  <Typography variant="body1">{selectedPayment.gateway}</Typography>
                </Grid>
              )}
              {selectedPayment.transactionId && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">معرف المعاملة</Typography>
                  <Typography variant="body1">{selectedPayment.transactionId}</Typography>
                </Grid>
              )}
              {selectedPayment.invoice && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">الفاتورة المرتبطة</Typography>
                  <Box sx={{ p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                    <Typography variant="body2">
                      رقم الفاتورة: {selectedPayment.invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2">
                      مبلغ الفاتورة: {formatPrice(selectedPayment.invoice.totalAmount, selectedPayment.currency)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {selectedPayment.metadata?.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">ملاحظات</Typography>
                  <Typography variant="body1">{selectedPayment.metadata.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminPayments;
