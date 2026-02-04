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
  Pagination,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Send as SendIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SuperAdminInvoices = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form data for creating invoice
  const [formData, setFormData] = useState({
    companyId: '',
    subscriptionId: '',
    type: 'SUBSCRIPTION',
    dueDate: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    taxRate: 14,
    discountAmount: 0,
    notes: '',
    paymentTerms: 'Net 30'
  });

  useEffect(() => {
    // Check if there's a subscription filter from URL
    const subscriptionId = searchParams.get('subscription');
    const invoiceId = searchParams.get('invoice');
    if (subscriptionId && !filters.subscriptionId) {
      setFilters(prev => ({ ...prev, subscriptionId }));
      return; // Exit early to prevent double fetch
    }
    if (invoiceId && !filters.invoiceId) {
      setFilters(prev => ({ ...prev, invoiceId }));
      return; // Exit early to prevent double fetch
    }
    fetchInvoices();
  }, [page, filters]);

  // Separate effect for URL params to avoid infinite loop
  useEffect(() => {
    const subscriptionId = searchParams.get('subscription');
    const invoiceId = searchParams.get('invoice');
    if (subscriptionId && !filters.subscriptionId) {
      setFilters(prev => ({ ...prev, subscriptionId }));
    }
    if (invoiceId && !filters.invoiceId) {
      setFilters(prev => ({ ...prev, invoiceId }));
    }
  }, [searchParams]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(buildApiUrl(`admin/invoices?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.data.invoices);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.pages);
      } else {
        setError(data.message || 'خطأ في جلب البيانات');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(buildApiUrl('admin/invoices/stats/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      fetchInvoiceStats();
    }
  }, [activeTab]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1);
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'default',
      SENT: 'info',
      PAID: 'success',
      OVERDUE: 'error',
      CANCELLED: 'error',
      REFUNDED: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      DRAFT: 'مسودة',
      SENT: 'مرسلة',
      PAID: 'مدفوعة',
      OVERDUE: 'متأخرة',
      CANCELLED: 'ملغية',
      REFUNDED: 'مستردة'
    };
    return texts[status] || status;
  };

  const getTypeText = (type) => {
    const texts = {
      SUBSCRIPTION: 'اشتراك',
      ONE_TIME: 'مرة واحدة',
      UPGRADE: 'ترقية',
      DOWNGRADE: 'تخفيض',
      REFUND: 'استرداد'
    };
    return texts[type] || type;
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

  const handleSendInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(buildApiUrl(`admin/invoices/${invoiceId}/send`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        fetchInvoices();
      } else {
        setError(data.message || 'خطأ في إرسال الفاتورة');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  const handleUpdateStatus = async (invoiceId, status) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(buildApiUrl(`admin/invoices/${invoiceId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      
      if (data.success) {
        fetchInvoices();
      } else {
        setError(data.message || 'خطأ في تحديث حالة الفاتورة');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      setError('خطأ في الاتصال بالخادم');
    }
  };

  const addInvoiceItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeInvoiceItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = (subtotal * formData.taxRate) / 100;
    return subtotal + tax - formData.discountAmount;
  };

  if (loading && invoices.length === 0) {
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
          إدارة الفواتير
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          فاتورة جديدة
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="الفواتير" />
          <Tab label="الإحصائيات" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    إجمالي الفواتير
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
                    الفواتير المدفوعة
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.byStatus?.PAID?.count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    الفواتير المتأخرة
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.byStatus?.OVERDUE?.count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    إجمالي الإيرادات
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {formatPrice(stats.totalRevenue || 0)}
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
                      <MenuItem value="DRAFT">مسودة</MenuItem>
                      <MenuItem value="SENT">مرسلة</MenuItem>
                      <MenuItem value="PAID">مدفوعة</MenuItem>
                      <MenuItem value="OVERDUE">متأخرة</MenuItem>
                      <MenuItem value="CANCELLED">ملغية</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>النوع</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      label="النوع"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      <MenuItem value="SUBSCRIPTION">اشتراك</MenuItem>
                      <MenuItem value="ONE_TIME">مرة واحدة</MenuItem>
                      <MenuItem value="UPGRADE">ترقية</MenuItem>
                      <MenuItem value="DOWNGRADE">تخفيض</MenuItem>
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

          {/* Invoices Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الفاتورة</TableCell>
                    <TableCell>الشركة</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>تاريخ الإصدار</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {invoice.company.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {invoice.company.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTypeText(invoice.type)}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatPrice(invoice.totalAmount, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="عرض التفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setViewDialogOpen(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {invoice.status === 'DRAFT' && (
                            <Tooltip title="إرسال">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleSendInvoice(invoice.id)}
                              >
                                <SendIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {invoice.status === 'SENT' && (
                            <Tooltip title="تحديد كمدفوعة">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                              >
                                <PaymentIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="عرض المدفوعات">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/super-admin/payments?invoice=${invoice.id}`)}
                            >
                              <MoneyIcon />
                            </IconButton>
                          </Tooltip>
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
        </>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  نظرة عامة على الفواتير
                </Typography>
                {stats.overview && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        إجمالي الفواتير
                      </Typography>
                      <Typography variant="h6">
                        {stats.overview.totalInvoices}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        الفواتير المدفوعة
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {stats.overview.paidInvoices}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        الفواتير المتأخرة
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        {stats.overview.overdueInvoices}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        الفواتير المعلقة
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {stats.overview.pendingInvoices}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        إجمالي الإيرادات
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {formatPrice(stats.overview.totalRevenue)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        متوسط قيمة الفاتورة
                      </Typography>
                      <Typography variant="h6">
                        {formatPrice(stats.overview.averageInvoiceValue)}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الفواتير الحديثة
                </Typography>
                {stats.recentInvoices && stats.recentInvoices.length > 0 ? (
                  <Box>
                    {stats.recentInvoices.slice(0, 5).map((invoice) => (
                      <Box key={invoice.id} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                        <Box>
                          <Typography variant="body2">
                            {invoice.invoiceNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {invoice.company.name}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="body2">
                            {formatPrice(invoice.totalAmount, invoice.currency)}
                          </Typography>
                          <Chip
                            label={getStatusText(invoice.status)}
                            color={getStatusColor(invoice.status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    لا توجد فواتير حديثة
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
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
                label="معرف الاشتراك (اختياري)"
                value={formData.subscriptionId}
                onChange={(e) => setFormData(prev => ({ ...prev, subscriptionId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الفاتورة</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  label="نوع الفاتورة"
                >
                  <MenuItem value="SUBSCRIPTION">اشتراك</MenuItem>
                  <MenuItem value="ONE_TIME">مرة واحدة</MenuItem>
                  <MenuItem value="UPGRADE">ترقية</MenuItem>
                  <MenuItem value="DOWNGRADE">تخفيض</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تاريخ الاستحقاق"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            {/* Invoice Items */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                عناصر الفاتورة
              </Typography>
              {formData.items.map((item, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="الوصف"
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="الكمية"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="سعر الوحدة"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="الإجمالي"
                      value={item.quantity * item.unitPrice}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => removeInvoiceItem(index)}
                      disabled={formData.items.length === 1}
                      fullWidth
                    >
                      حذف
                    </Button>
                  </Grid>
                </Grid>
              ))}
              <Button
                variant="outlined"
                onClick={addInvoiceItem}
                sx={{ mb: 2 }}
              >
                إضافة عنصر
              </Button>
            </Grid>

            {/* Totals */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="معدل الضريبة (%)"
                type="number"
                value={formData.taxRate}
                onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مبلغ الخصم"
                type="number"
                value={formData.discountAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body1">
                  المجموع الفرعي: {formatPrice(calculateSubtotal())}
                </Typography>
                <Typography variant="body1">
                  الضريبة ({formData.taxRate}%): {formatPrice((calculateSubtotal() * formData.taxRate) / 100)}
                </Typography>
                <Typography variant="body1">
                  الخصم: {formatPrice(formData.discountAmount)}
                </Typography>
                <Typography variant="h6" color="primary">
                  الإجمالي: {formatPrice(calculateTotal())}
                </Typography>
              </Box>
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
          <Button onClick={() => {/* handleCreateInvoice */}} variant="contained">إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل الفاتورة</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">رقم الفاتورة</Typography>
                <Typography variant="body1">{selectedInvoice.invoiceNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الشركة</Typography>
                <Typography variant="body1">{selectedInvoice.company.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الحالة</Typography>
                <Chip
                  label={getStatusText(selectedInvoice.status)}
                  color={getStatusColor(selectedInvoice.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المبلغ الإجمالي</Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(selectedInvoice.totalAmount, selectedInvoice.currency)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">تاريخ الإصدار</Typography>
                <Typography variant="body1">{formatDate(selectedInvoice.issueDate)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">تاريخ الاستحقاق</Typography>
                <Typography variant="body1">{formatDate(selectedInvoice.dueDate)}</Typography>
              </Grid>
              {selectedInvoice.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">ملاحظات</Typography>
                  <Typography variant="body1">{selectedInvoice.notes}</Typography>
                </Grid>
              )}
              
              {/* Invoice Items */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>عناصر الفاتورة</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>الوصف</TableCell>
                        <TableCell>الكمية</TableCell>
                        <TableCell>سعر الوحدة</TableCell>
                        <TableCell>الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatPrice(item.unitPrice, selectedInvoice.currency)}</TableCell>
                          <TableCell>{formatPrice(item.totalPrice, selectedInvoice.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Payments */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>المدفوعات</Typography>
                  {selectedInvoice.payments.map((payment, index) => (
                    <Box key={index} sx={{ p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2">
                        المبلغ: {formatPrice(payment.amount, selectedInvoice.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        الطريقة: {payment.method} | التاريخ: {payment.paidAt ? formatDate(payment.paidAt) : 'غير محدد'}
                      </Typography>
                    </Box>
                  ))}
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

export default SuperAdminInvoices;
