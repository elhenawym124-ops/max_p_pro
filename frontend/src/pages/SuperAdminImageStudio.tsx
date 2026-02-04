import React, { useState, useEffect } from 'react';
import {

  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Image as ImageIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as XCircleIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

const SuperAdminImageStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
    loadKeys();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/image-studio/admin/settings');
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'فشل تحميل الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/image-studio/admin/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadKeys = async () => {
    try {
      const response = await apiClient.get('/image-studio/admin/keys');
      if (response.data.success) {
        setKeys(response.data.keys);
      }
    } catch (error) {
      console.error('Error loading keys:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.put('/image-studio/admin/settings', settings);

      if (response.data.success) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        loadSettings();
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'فشل حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography color="text.secondary">جاري التحميل...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }} dir="rtl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <ImageIcon sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            استديو توليد الصور (Nano Banana)
          </Typography>
        </Box>
        <Typography color="text.secondary">
          إدارة إعدادات نظام توليد الصور باستخدام Google AI Image Models
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">إجمالي الصور</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.totalImages}</Typography>
                </Box>
                <ImageIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">نجحت</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{stats.completedImages}</Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">فشلت</Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">{stats.failedImages}</Typography>
                </Box>
                <XCircleIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">نسبة النجاح</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.successRate}%</Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_e, newValue) => setCurrentTab(newValue)}>
          <Tab icon={<SettingsIcon />} label="الإعدادات" iconPosition="start" />
          <Tab icon={<KeyIcon />} label="المفاتيح" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Settings */}
      {currentTab === 0 && settings && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SettingsIcon />
                <Typography variant="h6">الإعدادات العامة</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={(e) => updateSetting('enabled', e.target.checked)}
                    />
                  }
                  label="تفعيل الاستديو"
                />

                <FormControl fullWidth>
                  <InputLabel>اختر مفتاح Google AI</InputLabel>
                  <Select
                    value={settings.selectedKeyId || ''}
                    label="اختر مفتاح Google AI"
                    onChange={(e) => updateSetting('selectedKeyId', e.target.value || null)}
                  >
                    <MenuItem value="">استخدام المفاتيح التلقائية</MenuItem>
                    {keys.map((key) => (
                      <MenuItem key={key.id} value={key.id}>
                        {key.name} ({key.keyType}) - {key.maskedKey}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>النموذج الافتراضي</InputLabel>
                  <Select
                    value={settings.defaultModel}
                    label="النموذج الافتراضي"
                    onChange={(e) => updateSetting('defaultModel', e.target.value)}
                  >
                    <MenuItem value="basic">Basic (سريع)</MenuItem>
                    <MenuItem value="pro">Pro (احترافي)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="الحد الأقصى للصور في الطلب الواحد"
                  type="number"
                  inputProps={{ min: 1, max: 10 }}
                  value={settings.maxImagesPerRequest}
                  onChange={(e) => updateSetting('maxImagesPerRequest', parseInt(e.target.value))}
                  fullWidth
                />

                <TextField
                  label="الحد الأقصى للطلبات اليومية (لكل شركة)"
                  type="number"
                  inputProps={{ min: 1, max: 1000 }}
                  value={settings.maxRequestsPerDay}
                  onChange={(e) => updateSetting('maxRequestsPerDay', parseInt(e.target.value))}
                  fullWidth
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ImageIcon />
                <Typography variant="h6">إعدادات النماذج</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>نموذج Basic</InputLabel>
                    <Select
                      value={settings.basicModelName}
                      label="نموذج Basic"
                      onChange={(e) => updateSetting('basicModelName', e.target.value)}
                    >
                      <MenuItem value="gemini-2.5-flash-image">
                        Nano Banana (gemini-2.5-flash-image)
                      </MenuItem>
                      <MenuItem value="imagen-3.0-generate-002">
                        Imagen 3 (imagen-3.0-generate-002)
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    النموذج السريع والفعال - مناسب للاستخدام اليومي
                  </Typography>
                </Box>

                <Box>
                  <FormControl fullWidth>
                    <InputLabel>نموذج Pro</InputLabel>
                    <Select
                      value={settings.proModelName}
                      label="نموذج Pro"
                      onChange={(e) => updateSetting('proModelName', e.target.value)}
                    >
                      <MenuItem value="gemini-3-pro-image-preview">
                        Nano Banana Pro (gemini-3-pro-image-preview)
                      </MenuItem>
                      <MenuItem value="imagen-4.0-generate-002">
                        Imagen 4 (imagen-4.0-generate-002)
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    النموذج الاحترافي - جودة عالية ونصوص واضحة
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Keys */}
      {currentTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={3}>
            <KeyIcon />
            <Typography variant="h6">مفاتيح Google AI المتاحة</Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المفتاح</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">لا توجد مفاتيح نشطة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={key.keyType}
                          size="small"
                          color={key.keyType === 'PRO' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {key.maskedKey}
                      </TableCell>
                      <TableCell>{key.priority}</TableCell>
                      <TableCell>
                        <Chip
                          label={key.isActive ? 'نشط' : 'غير نشط'}
                          size="small"
                          color={key.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>ملاحظة:</strong> يمكنك اختيار مفتاح محدد من تبويب الإعدادات، أو ترك الخيار فارغاً لاستخدام نظام التبديل التلقائي.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Save Button */}
      {currentTab === 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            size="large"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SuperAdminImageStudio;
