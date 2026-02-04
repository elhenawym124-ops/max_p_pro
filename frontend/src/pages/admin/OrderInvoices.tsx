import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  PendingActions as PendingActionsIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const OrderInvoices: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [page, rowsPerPage, paymentStatus]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (search) params.search = search;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await apiClient.get('/order-invoices', { params });

      setInvoices(response.data.data);
      setTotal(response.data.pagination.total);
      setStats(response.data.stats);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchInvoices();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/orders/invoice/${invoiceId}`);
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      await apiClient.post(`/order-invoices/${invoiceId}/print`);
      window.open(`/orders/invoice/${invoiceId}`, '_blank');
    } catch (err: any) {
      console.error('Error printing invoice:', err);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: any = {
      'PAID': 'success',
      'PENDING': 'warning',
      'CANCELLED': 'error',
      'REFUNDED': 'info',
      'PARTIALLY_PAID': 'warning'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: any = {
      'PAID': 'مدفوعة',
      'PENDING': 'قيد الانتظار',
      'CANCELLED': 'ملغاة',
      'REFUNDED': 'مستردة',
      'PARTIALLY_PAID': 'مدفوعة جزئياً'
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          فواتير الطلبات
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchInvoices}
        >
          تحديث
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      إجمالي الفواتير
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.totalInvoices}
                    </Typography>
                  </Box>
                  <ReceiptIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      فواتير مدفوعة
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {stats.paidInvoices}
                    </Typography>
                  </Box>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      فواتير معلقة
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                      {stats.pendingInvoices}
                    </Typography>
                  </Box>
                  <PendingActionsIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      إجمالي المبلغ
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(stats.totalAmount)}
                    </Typography>
                  </Box>
                  <AttachMoneyIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="البحث برقم الفاتورة، اسم العميل، أو رقم الهاتف"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>حالة الدفع</InputLabel>
              <Select
                value={paymentStatus}
                label="حالة الدفع"
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="PENDING">قيد الانتظار</MenuItem>
                <MenuItem value="PAID">مدفوعة</MenuItem>
                <MenuItem value="PARTIALLY_PAID">مدفوعة جزئياً</MenuItem>
                <MenuItem value="CANCELLED">ملغاة</MenuItem>
                <MenuItem value="REFUNDED">مستردة</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="من تاريخ"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="إلى تاريخ"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              sx={{ height: 56 }}
            >
              بحث
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoices Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : invoices.length === 0 ? (
          <Box p={4} textAlign="center">
            <Alert severity="info">لا توجد فواتير</Alert>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>رقم الفاتورة</strong></TableCell>
                    <TableCell><strong>رقم الطلب</strong></TableCell>
                    <TableCell><strong>العميل</strong></TableCell>
                    <TableCell><strong>تاريخ الإصدار</strong></TableCell>
                    <TableCell><strong>المبلغ</strong></TableCell>
                    <TableCell><strong>حالة الدفع</strong></TableCell>
                    <TableCell align="center"><strong>الإجراءات</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {invoice.order?.orderNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {invoice.customerName}
                        </Typography>
                        {invoice.customerPhone && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {invoice.customerPhone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(invoice.issueDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(parseFloat(invoice.totalAmount), invoice.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPaymentStatusLabel(invoice.paymentStatus)}
                          color={getPaymentStatusColor(invoice.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض الفاتورة">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="طباعة">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handlePrintInvoice(invoice.id)}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="عدد الصفوف في الصفحة:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default OrderInvoices;
