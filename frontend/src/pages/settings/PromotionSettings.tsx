import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  Button,
  Alert,
  FormControlLabel,
  Divider,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Discount as DiscountIcon,
  DeliveryDining as DeliveryIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Lightbulb as RecommendIcon
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
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`promotion-tabpanel-${index}`}
      aria-labelledby={`promotion-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PromotionSettings: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Free Shipping Settings
  const [freeShippingSettings, setFreeShippingSettings] = useState({
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    freeShippingMessage: 'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/promotion-settings');

      if (response.data.success) {
        const data = response.data.data;
        setFreeShippingSettings({
          freeShippingEnabled: data.freeShippingEnabled,
          freeShippingThreshold: parseFloat(data.freeShippingThreshold),
          freeShippingMessage: data.freeShippingMessage || 'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر'
        });
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في جلب الإعدادات'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFreeShipping = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post(
        '/promotion-settings',
        freeShippingSettings
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم حفظ الإعدادات بنجاح'
        });
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في حفظ الإعدادات'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين الإعدادات للقيم الافتراضية؟')) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post(
        '/promotion-settings/reset',
        {}
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم إعادة تعيين الإعدادات بنجاح'
        });
        fetchSettings();
      }
    } catch (error: any) {
      console.error('Error resetting settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في إعادة تعيين الإعدادات'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        🎯 إعدادات الترويج وزيادة المبيعات
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        قم بإعداد استراتيجيات لزيادة متوسط قيمة الطلب (AOV) وتحفيز العملاء على الشراء
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            if (newValue === 1) {
              navigate('/settings/volume-discounts');
            } else if (newValue === 2) {
              navigate('/settings/delivery-options');
            } else if (newValue === 3) {
              navigate('/settings/recommendations');
            } else {
              setCurrentTab(newValue);
            }
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<ShippingIcon />}
            label="الشحن المجاني"
            iconPosition="start"
          />
          <Tab
            icon={<DiscountIcon />}
            label="خصومات الكميات"
            iconPosition="start"
          />
          <Tab
            icon={<DeliveryIcon />}
            label="خيارات التوصيل"
            iconPosition="start"
          />
          <Tab
            icon={<RecommendIcon />}
            label="المنتجات المقترحة"
            iconPosition="start"
          />
        </Tabs>

        {/* Free Shipping Tab */}
        <TabPanel value={currentTab} index={0}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShippingIcon color="primary" />
                إعدادات الشحن المجاني
              </Typography>
              <Typography variant="body2" color="text.secondary">
                حفز العملاء على زيادة قيمة طلباتهم للحصول على شحن مجاني
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Enable/Disable Free Shipping */}
              <FormControlLabel
                control={
                  <Switch
                    checked={freeShippingSettings.freeShippingEnabled}
                    onChange={(e) => setFreeShippingSettings({
                      ...freeShippingSettings,
                      freeShippingEnabled: e.target.checked
                    })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      تفعيل الشحن المجاني
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      عند التفعيل، سيحصل العملاء على شحن مجاني عند الوصول للحد الأدنى
                    </Typography>
                  </Box>
                }
              />

              {/* Free Shipping Threshold */}
              <TextField
                label="الحد الأدنى للطلب (جنيه)"
                type="number"
                fullWidth
                value={freeShippingSettings.freeShippingThreshold}
                onChange={(e) => setFreeShippingSettings({
                  ...freeShippingSettings,
                  freeShippingThreshold: parseFloat(e.target.value) || 0
                })}
                disabled={!freeShippingSettings.freeShippingEnabled}
                helperText="المبلغ الذي يجب أن يصل إليه الطلب للحصول على شحن مجاني"
                InputProps={{
                  inputProps: { min: 0, step: 10 }
                }}
              />

              {/* Free Shipping Message */}
              <TextField
                label="رسالة الشحن المجاني"
                multiline
                rows={3}
                fullWidth
                value={freeShippingSettings.freeShippingMessage}
                onChange={(e) => setFreeShippingSettings({
                  ...freeShippingSettings,
                  freeShippingMessage: e.target.value
                })}
                disabled={!freeShippingSettings.freeShippingEnabled}
                helperText="استخدم {amount} لعرض المبلغ المطلوب. مثال: احصل على شحن مجاني عند الشراء بـ {amount} جنيه"
              />

              {/* Preview */}
              {freeShippingSettings.freeShippingEnabled && (
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    معاينة الرسالة:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {freeShippingSettings.freeShippingMessage.replace(
                      '{amount}',
                      freeShippingSettings.freeShippingThreshold.toString()
                    )}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetSettings}
                disabled={saving}
              >
                إعادة تعيين
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveFreeShipping}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </Box>
          </CardContent>
        </TabPanel>

        {/* Volume Discounts Tab - Coming Soon */}
        <TabPanel value={currentTab} index={1}>
          <CardContent>
            <Box textAlign="center" py={5}>
              <DiscountIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                خصومات الكميات
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ستتوفر هذه الميزة قريباً - يمكنك إدارة خصومات الكميات من صفحة المنتج
              </Typography>
            </Box>
          </CardContent>
        </TabPanel>

        {/* Delivery Options Tab - Coming Soon */}
        <TabPanel value={currentTab} index={2}>
          <CardContent>
            <Box textAlign="center" py={5}>
              <DeliveryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                خيارات التوصيل
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ستتوفر هذه الميزة قريباً - يمكنك إدارة خيارات التوصيل المتعددة
              </Typography>
            </Box>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default PromotionSettings;
