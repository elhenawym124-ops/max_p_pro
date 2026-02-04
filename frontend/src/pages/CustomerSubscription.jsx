import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Paper,
  IconButton
} from '@mui/material';
import {
  Payment as PaymentIcon,
  ContentCopy as CopyIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { apiClient } from '../services/apiClient';

const CustomerSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    fetchSubscription();
    fetchWalletNumbers();
  }, []);

  const fetchSubscription = async () => {
    try {
      // بدلاً من استدعاء API، سنستخدم بيانات وهمية للعرض
      const mockSubscription = {
        id: 'mock-subscription',
        planType: 'PRO',
        price: 7500,
        currency: 'EGP',
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        nextBillingDate: '2025-09-15',
        autoRenew: true
      };

      setSubscription(mockSubscription);
    } catch (error) {
      console.error('خطأ في جلب الاشتراك:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletNumbers = async () => {
    try {
      const response = await apiClient.get('/wallet-payment/wallet-numbers');
      if (response.data.success) {
        setWalletNumbers(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب أرقام المحافظ:', error);
    }
  };

  const copyToClipboard = (text, walletName) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({
        open: true,
        message: `تم نسخ رقم ${walletName}`
      });
    });
  };

  const handlePayment = () => {
    window.open('/payment/subscription-renewal', '_blank');
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
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={800} mx="auto">
      <Typography variant="h4" gutterBottom textAlign="center">
        💳 تجديد الاشتراك
      </Typography>

      {/* معلومات التجديد */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            📅 معلومات التجديد
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                تاريخ التجديد القادم
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {subscription?.nextBillingDate ? formatDate(subscription.nextBillingDate) : '15 سبتمبر 2025'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                المبلغ المطلوب
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {subscription?.price ? formatCurrency(subscription.price) : '7,500 ج.م'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* أرقام المحافظ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💳 أرقام المحافظ للدفع
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            اختر رقم المحفظة المناسب وانسخه لإجراء التحويل
          </Typography>

          <Grid container spacing={2}>
            {walletNumbers.map((wallet) => (
              <Grid item xs={12} sm={6} key={wallet.id}>
                <Paper
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {wallet.icon} {wallet.name}
                      </Typography>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                        {wallet.number}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => copyToClipboard(wallet.number, wallet.name)}
                      color="primary"
                      size="small"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* التعليمات */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📝 تعليمات الدفع
          </Typography>

          <Box component="ol" sx={{ pl: 2 }}>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              انسخ رقم المحفظة المناسب من الأعلى
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              حول المبلغ <strong>{subscription?.price ? formatCurrency(subscription.price) : '7,500 ج.م'}</strong> من تليفونك
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              التقط صورة واضحة لإيصال التحويل
            </Typography>
            <Typography component="li" variant="body1">
              اضغط على زر "إرسال إيصال الدفع" أدناه لرفع الصورة
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* زر الانتقال لصفحة الدفع */}
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            🚀 جاهز للدفع؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            بعد إجراء التحويل، اضغط على الزر أدناه لرفع إيصال الدفع
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<PaymentIcon />}
            onClick={handlePayment}
            sx={{ px: 4, py: 1.5 }}
          >
            إرسال إيصال الدفع
          </Button>
        </CardContent>
      </Card>

      {/* رسالة النسخ */}
      {snackbar.open && (
        <Alert
          severity="success"
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000
          }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
};

export default CustomerSubscription;
