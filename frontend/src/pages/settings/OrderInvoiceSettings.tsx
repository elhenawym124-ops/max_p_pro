import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OrderInvoiceSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [settings, setSettings] = useState<any>({
    autoGenerate: false,
    autoGenerateOnStatus: '',
    invoicePrefix: 'INV',
    invoiceNumberFormat: 'INV-YYYYMMDD-XXXXXX',
    defaultTaxRate: 0,
    defaultTerms: '',
    defaultNotes: '',
    defaultDueDays: 7,
    showCompanyLogo: true,
    showTaxBreakdown: true,
    showPaymentMethod: true,
    showOrderItems: true,
    autoEmailToCustomer: false,
    emailSubject: '',
    emailBody: '',
    pdfPageSize: 'A4',
    pdfOrientation: 'portrait',
    primaryColor: '#4F46E5',
    secondaryColor: '#6B7280',
    fontFamily: 'Arial'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/order-invoice-settings');

      if (response.data.success) {
        const data = response.data.data;
        // تحويل null إلى empty string
        setSettings({
          ...data,
          autoGenerateOnStatus: data.autoGenerateOnStatus || '',
          defaultTerms: data.defaultTerms || '',
          defaultNotes: data.defaultNotes || '',
          emailSubject: data.emailSubject || '',
          emailBody: data.emailBody || ''
        });
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await apiClient.put('/order-invoice-settings', settings);

      if (response.data.success) {
        setSuccess('تم حفظ الإعدادات بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError('خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.post('/order-invoice-settings/reset', {});

      if (response.data.success) {
        setSettings(response.data.data);
        setSuccess('تم إعادة تعيين الإعدادات بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error('Error resetting settings:', err);
      setError('خطأ في إعادة تعيين الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            sx={{ mr: 2 }}
            disabled={saving}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}


      <Paper>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="الإعدادات العامة" />
          <Tab label="ترقيم الفواتير" />
          <Tab label="القيم الافتراضية" />
          <Tab label="خيارات العرض" />
          <Tab label="البريد الإلكتروني" />
          <Tab label="التصميم" />
        </Tabs>

        {/* Tab 1: General Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoGenerate}
                    onChange={(e) => handleChange('autoGenerate', e.target.checked)}
                  />
                }
                label="توليد الفواتير تلقائياً"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                سيتم توليد فاتورة تلقائياً عند تغيير حالة الطلب
              </Typography>
            </Grid>

            {settings.autoGenerate && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>توليد الفاتورة عند الحالة</InputLabel>
                  <Select
                    value={settings.autoGenerateOnStatus || ''}
                    label="توليد الفاتورة عند الحالة"
                    onChange={(e) => handleChange('autoGenerateOnStatus', e.target.value)}
                  >
                    <MenuItem value="">اختر الحالة</MenuItem>
                    <MenuItem value="CONFIRMED">مؤكد</MenuItem>
                    <MenuItem value="PROCESSING">قيد المعالجة</MenuItem>
                    <MenuItem value="SHIPPED">تم الشحن</MenuItem>
                    <MenuItem value="DELIVERED">تم التوصيل</MenuItem>
                    <MenuItem value="COMPLETED">مكتمل</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 2: Invoice Numbering */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="بادئة رقم الفاتورة"
                value={settings.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                helperText="مثال: INV, BILL, FAT"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تنسيق رقم الفاتورة"
                value={settings.invoiceNumberFormat}
                onChange={(e) => handleChange('invoiceNumberFormat', e.target.value)}
                helperText="YYYY=سنة, MM=شهر, DD=يوم, XXXXXX=رقم تسلسلي"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <strong>مثال على الرقم:</strong> {settings.invoicePrefix}-20260117-123456
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Default Values */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="نسبة الضريبة الافتراضية (%)"
                value={settings.defaultTaxRate}
                onChange={(e) => handleChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="أيام الاستحقاق الافتراضية"
                value={settings.defaultDueDays}
                onChange={(e) => handleChange('defaultDueDays', parseInt(e.target.value) || 7)}
                inputProps={{ min: 0 }}
                helperText="عدد الأيام حتى استحقاق الدفع"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الشروط والأحكام الافتراضية"
                value={settings.defaultTerms}
                onChange={(e) => handleChange('defaultTerms', e.target.value)}
                placeholder="شكراً لتعاملكم معنا. يرجى الدفع خلال 7 أيام من تاريخ الفاتورة."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الملاحظات الافتراضية"
                value={settings.defaultNotes}
                onChange={(e) => handleChange('defaultNotes', e.target.value)}
                placeholder="ملاحظات إضافية..."
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 4: Display Options */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showCompanyLogo}
                    onChange={(e) => handleChange('showCompanyLogo', e.target.checked)}
                  />
                }
                label="عرض شعار الشركة"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showTaxBreakdown}
                    onChange={(e) => handleChange('showTaxBreakdown', e.target.checked)}
                  />
                }
                label="عرض تفاصيل الضريبة"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showPaymentMethod}
                    onChange={(e) => handleChange('showPaymentMethod', e.target.checked)}
                  />
                }
                label="عرض طريقة الدفع"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showOrderItems}
                    onChange={(e) => handleChange('showOrderItems', e.target.checked)}
                  />
                }
                label="عرض تفاصيل المنتجات"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>إعدادات PDF</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>حجم الصفحة</InputLabel>
                <Select
                  value={settings.pdfPageSize}
                  label="حجم الصفحة"
                  onChange={(e) => handleChange('pdfPageSize', e.target.value)}
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                  <MenuItem value="Legal">Legal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>اتجاه الصفحة</InputLabel>
                <Select
                  value={settings.pdfOrientation}
                  label="اتجاه الصفحة"
                  onChange={(e) => handleChange('pdfOrientation', e.target.value)}
                >
                  <MenuItem value="portrait">عمودي</MenuItem>
                  <MenuItem value="landscape">أفقي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 5: Email Settings */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoEmailToCustomer}
                    onChange={(e) => handleChange('autoEmailToCustomer', e.target.checked)}
                  />
                }
                label="إرسال الفاتورة تلقائياً للعميل بالبريد الإلكتروني"
              />
            </Grid>

            {settings.autoEmailToCustomer && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="موضوع البريد"
                    value={settings.emailSubject}
                    onChange={(e) => handleChange('emailSubject', e.target.value)}
                    placeholder="فاتورة طلبك #{orderNumber}"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label="نص البريد"
                    value={settings.emailBody}
                    onChange={(e) => handleChange('emailBody', e.target.value)}
                    placeholder="عزيزي العميل، نشكرك على طلبك. تجد مرفقاً فاتورة طلبك."
                  />
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 6: Design */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="color"
                label="اللون الأساسي"
                value={settings.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="color"
                label="اللون الثانوي"
                value={settings.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>نوع الخط</InputLabel>
                <Select
                  value={settings.fontFamily}
                  label="نوع الخط"
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                >
                  <MenuItem value="Arial">Arial</MenuItem>
                  <MenuItem value="Helvetica">Helvetica</MenuItem>
                  <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                  <MenuItem value="Courier">Courier</MenuItem>
                  <MenuItem value="Tahoma">Tahoma</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                سيتم تطبيق هذه الألوان والخطوط على الفواتير المُولدة
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default OrderInvoiceSettings;
