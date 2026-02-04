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
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useAuth } from '../hooks/useAuthSimple';

const CustomerPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // بيانات وهمية للمدفوعات
      const mockPayments = [
        {
          id: 'pay-1',
          paymentNumber: 'PAY-202507-001',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          paidAt: '2025-07-15T10:30:00Z',
          invoice: {
            invoiceNumber: 'INV-202507-12345678'
          }
        },
        {
          id: 'pay-2',
          paymentNumber: 'PAY-202506-002',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          paidAt: '2025-06-15T14:20:00Z',
          invoice: {
            invoiceNumber: 'INV-202506-87654321'
          }
        },
        {
          id: 'pay-3',
          paymentNumber: 'PAY-202508-003',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'PENDING',
          paidAt: null,
          invoice: {
            invoiceNumber: 'INV-202508-31819812'
          }
        }
      ];

      setPayments(mockPayments);
    } catch (error) {
      console.error('خطأ في جلب المدفوعات:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'مكتملة';
      case 'PENDING':
        return 'في الانتظار';
      case 'FAILED':
        return 'فشلت';
      default:
        return status;
    }
  };

  const getMethodText = (method) => {
    switch (method) {
      case 'WALLET_TRANSFER':
        return 'تحويل محفظة';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي';
      case 'CREDIT_CARD':
        return 'بطاقة ائتمان';
      case 'CASH':
        return 'نقداً';
      default:
        return method;
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalAmount = payments.reduce((sum, payment) =>
    payment.status === 'COMPLETED' ? sum + payment.amount : sum, 0
  );

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
        💰 مدفوعاتي
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
                {payments.length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                إجمالي المدفوعات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-green-600 dark:text-green-400 font-bold">
                {formatCurrency(totalAmount)}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                إجمالي المبلغ المدفوع
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-green-600 dark:text-green-400 font-bold">
                {payments.filter(p => p.status === 'COMPLETED').length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                مدفوعات مكتملة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
            <CardContent>
              <Typography variant="h6" className="text-yellow-600 dark:text-yellow-400 font-bold">
                {payments.filter(p => p.status === 'PENDING').length}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                في الانتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول المدفوعات */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
        <CardContent>
          <Typography variant="h6" gutterBottom className="text-gray-900 dark:text-white font-semibold">
            سجل المدفوعات
          </Typography>

          {payments.length === 0 ? (
            <Alert severity="info" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              لا توجد مدفوعات حالياً
            </Alert>
          ) : (
            <TableContainer component={Paper} className="bg-white dark:bg-gray-800 border-0 dark:border dark:border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHead className="bg-gray-50 dark:bg-gray-700">
                  <TableRow>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">رقم الدفع</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">رقم الفاتورة</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">المبلغ</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">طريقة الدفع</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">تاريخ الدفع</TableCell>
                    <TableCell className="text-gray-900 dark:text-white font-semibold border-b dark:border-gray-600">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="font-bold text-gray-900 dark:text-white">
                          {payment.paymentNumber}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="text-gray-700 dark:text-gray-300">
                          {payment.invoice?.invoiceNumber || 'غير محدد'}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Typography variant="body2" className="text-gray-700 dark:text-gray-300">
                          {getMethodText(payment.method)}
                        </Typography>
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {payment.paidAt ? formatDate(payment.paidAt) : 'غير محدد'}
                      </TableCell>
                      <TableCell className="border-b dark:border-gray-600">
                        <Chip
                          label={getStatusText(payment.status)}
                          color={getStatusColor(payment.status)}
                          size="small"
                          className={`${
                            payment.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' :
                            payment.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' :
                            payment.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                          }`}
                        />
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

export default CustomerPayments;
