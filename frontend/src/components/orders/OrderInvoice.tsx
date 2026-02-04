import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Print as PrintIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

interface OrderInvoiceProps {
  orderId?: string;
  invoiceId?: string;
}

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderId, invoiceId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  const finalOrderId = orderId || params['orderId'];
  const finalInvoiceId = invoiceId || params['invoiceId'];

  useEffect(() => {
    fetchInvoice();
  }, [finalOrderId, finalInvoiceId]);

  // التحقق من معامل print في URL وتفعيل الطباعة تلقائياً
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get('print') === 'true';

    if (shouldPrint && invoice && !loading) {
      // تأخير بسيط للتأكد من تحميل كل المحتوى
      setTimeout(() => {
        window.print();
      }, 1500);
    }
  }, [invoice, loading]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      if (finalInvoiceId) {
        response = await apiClient.get(`/order-invoices/${finalInvoiceId}`);
      } else if (finalOrderId) {
        response = await apiClient.get(`/order-invoices/order/${finalOrderId}`);
      } else {
        throw new Error('يجب تحديد رقم الطلب أو رقم الفاتورة');
      }

      setInvoice(response.data.data);
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      setError(err.response?.data?.message || 'خطأ في جلب الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);

      await apiClient.post(`/order-invoices/${invoice.id}/print`);

      window.print();
    } catch (err: any) {
      console.error('Error printing invoice:', err);
    } finally {
      setPrinting(false);
    }
  };

  const handleEmail = async () => {
    try {
      await apiClient.post(`/order-invoices/${invoice.id}/email`);
      alert('تم إرسال الفاتورة بنجاح');
    } catch (err: any) {
      console.error('Error emailing invoice:', err);
      alert('خطأ في إرسال الفاتورة');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          رجوع
        </Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box p={3}>
        <Alert severity="warning">الفاتورة غير موجودة</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          رجوع
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Action Buttons - Hidden in Print */}
      <Box className="no-print" sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          رجوع
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={printing}
        >
          طباعة
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailIcon />}
          onClick={handleEmail}
        >
          إرسال بالبريد
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handlePrint}
        >
          تحميل PDF
        </Button>
      </Box>

      {/* Invoice Content */}
      <Paper ref={printRef} sx={{ p: 4, maxWidth: '210mm', mx: 'auto' }}>
        {/* Header */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            {invoice.companyLogo && (
              <Box
                component="img"
                src={invoice.companyLogo}
                alt={invoice.companyName}
                sx={{ maxHeight: 80, mb: 2 }}
              />
            )}
            <Typography variant="h5" fontWeight="bold">
              {invoice.companyName}
            </Typography>
            {invoice.companyAddress && (
              <Typography variant="body2" color="text.secondary">
                {invoice.companyAddress}
              </Typography>
            )}
            {invoice.companyPhone && (
              <Typography variant="body2" color="text.secondary">
                هاتف: {invoice.companyPhone}
              </Typography>
            )}
            {invoice.companyEmail && (
              <Typography variant="body2" color="text.secondary">
                بريد: {invoice.companyEmail}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} textAlign="left">
            <Typography variant="h4" fontWeight="bold" color="primary">
              فاتورة
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {invoice.invoiceNumber}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>تاريخ الإصدار:</strong> {formatDate(invoice.issueDate)}
              </Typography>
              {invoice.dueDate && (
                <Typography variant="body2">
                  <strong>تاريخ الاستحقاق:</strong> {formatDate(invoice.dueDate)}
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={getPaymentStatusLabel(invoice.paymentStatus)}
                  color={getPaymentStatusColor(invoice.paymentStatus)}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Customer Info */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              الفاتورة إلى:
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {invoice.customerName}
            </Typography>
            {invoice.customerPhone && (
              <Typography variant="body2">
                هاتف: {invoice.customerPhone}
              </Typography>
            )}
            {invoice.customerEmail && (
              <Typography variant="body2">
                بريد: {invoice.customerEmail}
              </Typography>
            )}
            {invoice.customerAddress && (
              <Typography variant="body2">
                العنوان: {invoice.customerAddress}
              </Typography>
            )}
            {invoice.city && (
              <Typography variant="body2">
                المدينة: {invoice.city}
              </Typography>
            )}
            {invoice.governorate && (
              <Typography variant="body2">
                المحافظة: {invoice.governorate}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} textAlign="left">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              معلومات الطلب:
            </Typography>
            <Typography variant="body2">
              <strong>رقم الطلب:</strong> {invoice.order?.orderNumber}
            </Typography>
            <Typography variant="body2">
              <strong>حالة الطلب:</strong> {invoice.order?.status}
            </Typography>
            {invoice.paymentMethod && (
              <Typography variant="body2">
                <strong>طريقة الدفع:</strong> {invoice.paymentMethod}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* Items Table */}
        <TableContainer sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>المنتج</strong></TableCell>
                <TableCell align="center"><strong>الكمية</strong></TableCell>
                <TableCell align="right"><strong>السعر</strong></TableCell>
                <TableCell align="right"><strong>الإجمالي</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.order?.orderItems?.map((item: any, index: number) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.productName}
                    </Typography>
                    {item.variantName && (
                      <Typography variant="caption" color="text.secondary">
                        {item.variantName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(parseFloat(item.price), invoice.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(parseFloat(item.totalPrice), invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totals */}
        <Grid container justifyContent="flex-end">
          <Grid item xs={12} md={5}>
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>المجموع الفرعي:</Typography>
                <Typography fontWeight="medium">
                  {formatCurrency(parseFloat(invoice.subtotal), invoice.currency)}
                </Typography>
              </Box>

              {parseFloat(invoice.discount) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الخصم:</Typography>
                  <Typography color="error.main" fontWeight="medium">
                    - {formatCurrency(parseFloat(invoice.discount), invoice.currency)}
                  </Typography>
                </Box>
              )}

              {parseFloat(invoice.tax) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الضريبة ({invoice.taxRate}%):</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(parseFloat(invoice.tax), invoice.currency)}
                  </Typography>
                </Box>
              )}

              {parseFloat(invoice.shipping) > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>الشحن:</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(parseFloat(invoice.shipping), invoice.currency)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1 }} />

              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">
                  الإجمالي:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {formatCurrency(parseFloat(invoice.totalAmount), invoice.currency)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <Box sx={{ mt: 4 }}>
            {invoice.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ملاحظات:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invoice.notes}
                </Typography>
              </Box>
            )}

            {invoice.terms && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  الشروط والأحكام:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invoice.terms}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'grey.300', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            شكراً لتعاملكم معنا
          </Typography>
          {invoice.printCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              تم طباعة هذه الفاتورة {invoice.printCount} مرة
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
            
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default OrderInvoice;
