import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuthSimple';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Info as InfoIcon
} from '@mui/icons-material';

import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminFacebookOAuth = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    redirectUri: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAppSecret, setShowAppSecret] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl('admin/facebook-oauth/config'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setConfig({
          appId: data.data.appId || '',
          appSecret: data.data.appSecret || '',
          redirectUri: data.data.redirectUri || ''
        });
      } else {
        setError(data.message || 'فشل في جلب الإعدادات');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(buildApiUrl('admin/facebook-oauth/config'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || 'تم حفظ الإعدادات بنجاح');
        // Refresh the config to show the saved data
        await fetchConfig();
      } else {
        setError(data.message || 'فشل في حفظ الإعدادات');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
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
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <FacebookIcon sx={{ mr: 1, color: '#1877F2' }} />
          إعدادات Facebook OAuth
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          قم بتكوين إعدادات تكامل Facebook OAuth للسماح للشركات بالربط مع صفحات Facebook الخاصة بها
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Configuration Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">
              معلومات الإعداد
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 3 }}>
            لتمكين تكامل Facebook OAuth، تحتاج إلى إنشاء تطبيق على منصة Facebook Developers وإدخال المعلومات التالية:
          </Typography>
          
          <Box component="ol" sx={{ pl: 2, mb: 3 }}>
            <li>انتقل إلى <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">Facebook Developers</a></li>
            <li>أنشئ تطبيقًا جديدًا أو استخدم تطبيقًا موجودًا</li>
            <li>احصل على App ID و App Secret</li>
            <li>أضف رابط إعادة التوجيه إلى إعدادات التطبيق: <code>{window.location.origin}/settings/facebook/callback</code></li>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FacebookIcon sx={{ mr: 1, color: '#1877F2' }} />
            <Typography variant="h6">
              إعدادات التطبيق
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip 
              label={config.appId && config.appSecret && config.redirectUri ? 'مُكوَّن' : 'غير مُكوَّن'} 
              color={config.appId && config.appSecret && config.redirectUri ? 'success' : 'default'} 
              sx={{ mr: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {config.appId && config.appSecret && config.redirectUri 
                ? 'تم تكوين إعدادات Facebook OAuth بشكل صحيح' 
                : 'لم يتم تكوين إعدادات Facebook OAuth بعد'}
            </Typography>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Facebook App ID"
              value={config.appId}
              onChange={(e) => handleChange('appId', e.target.value)}
              placeholder="أدخل App ID"
              helperText="يمكنك العثور على هذا في إعدادات تطبيق Facebook Developers"
            />

            <FormControl fullWidth variant="outlined">
              <InputLabel htmlFor="app-secret">Facebook App Secret</InputLabel>
              <OutlinedInput
                id="app-secret"
                type={showAppSecret ? 'text' : 'password'}
                value={config.appSecret}
                onChange={(e) => handleChange('appSecret', e.target.value)}
                placeholder="أدخل App Secret"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowAppSecret(!showAppSecret)}
                      edge="end"
                    >
                      {showAppSecret ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Facebook App Secret"
              />
              <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                يمكنك العثور على هذا في إعدادات تطبيق Facebook Developers
              </Typography>
            </FormControl>

            <TextField
              fullWidth
              label="رابط إعادة التوجيه (Redirect URI)"
              value={config.redirectUri}
              onChange={(e) => handleChange('redirectUri', e.target.value)}
              placeholder="https://yourdomain.com/settings/facebook/callback"
              helperText="يجب أن يتطابق هذا مع إعدادات تطبيق Facebook Developers"
            />
          </Box>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ minWidth: 120 }}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2">ملاحظة مهمة:</Typography>
            <Typography variant="body2">
              بعد حفظ الإعدادات، سيتم تطبيق التغييرات تلقائيًا.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuperAdminFacebookOAuth;