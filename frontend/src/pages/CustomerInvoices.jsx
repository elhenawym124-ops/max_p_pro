import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';

const CustomerInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      // بيانات وهمية للفواتير
      const mockInvoices = [
        {
          id: 'cme8q7mnr000kuf3wgftcsv3l',
          invoiceNumber: 'INV-202506-31819812',
          issueDate: '2025-08-01',
          dueDate: '2025-08-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'PENDING'
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-202507-12345678',
          issueDate: '2025-07-01',
          dueDate: '2025-07-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'PAID'
        },
        {
          id: 'inv-3',
          invoiceNumber: 'INV-202506-87654321',
          issueDate: '2025-06-01',
          dueDate: '2025-06-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'OVERDUE'
        }
      ];

      setInvoices(mockInvoices);
    } catch (error) {
      console.error('خطأ في جلب الفواتير:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'DRAFT':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PAID':
        return 'مدفوعة';
      case 'PENDING':
        return 'في الانتظار';
      case 'OVERDUE':
        return 'متأخرة';
      case 'DRAFT':
        return 'مسودة';
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePayInvoice = (invoice) => {
    // فتح صفحة الدفع في تبويب جديد
    window.open(`/payment/${invoice.id}`, '_blank');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Typography variant="h4" gutterBottom className="text-gray-900 dark:text-white">
        🧾 فواتيري
      </Typography>

      {error && (
        <Alert severity="error" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          {error}
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-blue-600 dark:text-blue-400 font-bold">
                {invoices.length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                إجمالي الفواتير
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-green-600 dark:text-green-400 font-bold">
                {invoices.filter(inv => inv.status === 'PAID').length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                فواتير مدفوعة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-yellow-600 dark:text-yellow-400 font-bold">
                {invoices.filter(inv => inv.status === 'PENDING').length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                في الانتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-red-600 dark:text-red-400 font-bold">
                {invoices.filter(inv => inv.status === 'OVERDUE').length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                فواتير متأخرة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الفواتير */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
        <CardContent>
          <Typography variant="h6" gutterBottom className="text-gray-900 dark:text-white font-semibold">
            قائمة الفواتير
          </Typography>

          {invoices.length === 0 ? (
            <Alert severity="info" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              لا توجد فواتير حالياً
            </Alert>
          ) : (
            <TableContainer component={Paper} className="bg-white dark:bg-gray-800 border-0 dark:border dark:border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHead className="bg-gray-50 dark:bg-gray-700">
                  <TableRow>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">رقم الفاتورة</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">تاريخ الإصدار</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">تاريخ الاستحقاق</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">المبلغ</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">الحالة</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="font-bold text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(invoice.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Chip
                          label={getStatusText(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                          className={`${
                            invoice.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' :
                            invoice.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' :
                            invoice.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                          }`}
                        />
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            عرض
                          </Button>
                          {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<PaymentIcon />}
                              onClick={() => handlePayInvoice(invoice)}
                              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              دفع
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            تحميل
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomerInvoices;
