import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { companyAwareApi } from '../../services/companyAwareApi';

interface FewShotExample {
  id: string;
  customerMessage: string;
  aiResponse: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const FewShotSimple: React.FC = () => {
  const [examples, setExamples] = useState<FewShotExample[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [systemEnabled, setSystemEnabled] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    loadExamples();
    loadSettings();
  }, []);

  const loadExamples = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get('/few-shot/examples');
      setExamples(response.data.data);
    } catch (error) {
      showSnackbar('فشل في تحميل الأمثلة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await companyAwareApi.get('/few-shot/settings');
      setSystemEnabled(response.data.data.enabled);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleAdd = async () => {
    if (!customerMessage.trim() || !aiResponse.trim()) {
      showSnackbar('يرجى كتابة السؤال والرد', 'error');
      return;
    }

    try {
      await companyAwareApi.post('/few-shot/examples', {
        customerMessage: customerMessage.trim(),
        aiResponse: aiResponse.trim(),
        priority: 5,
        isActive: true,
      });

      showSnackbar('تم إضافة المثال بنجاح ✅', 'success');
      setCustomerMessage('');
      setAiResponse('');
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في إضافة المثال', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا المثال؟')) return;

    try {
      await companyAwareApi.delete(`/few-shot/examples/${id}`);
      showSnackbar('تم الحذف بنجاح', 'success');
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في الحذف', 'error');
    }
  };

  const handleToggleSystem = async () => {
    try {
      await companyAwareApi.put('/few-shot/settings', {
        enabled: !systemEnabled,
        maxExamplesPerPrompt: 3,
        selectionStrategy: 'priority',
        autoLearnFromGood: false,
        minQualityScore: 80,
      });
      setSystemEnabled(!systemEnabled);
      showSnackbar(systemEnabled ? 'تم تعطيل النظام' : 'تم تفعيل النظام ✅', 'success');
      setOpenSettings(false);
    } catch (error) {
      showSnackbar('فشل في تحديث الإعدادات', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '2px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            🎓 التعلم بالأمثلة
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => setOpenSettings(true)}
          >
            الإعدادات
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            label={systemEnabled ? '✅ مفعّل' : '⭕ معطّل'}
            color={systemEnabled ? 'success' : 'default'}
            size="small"
          />
          <Typography variant="caption" color="textSecondary">
            {examples.length} مثال
          </Typography>
        </Box>

        {/* Add New Example Form */}
        <Paper sx={{ p: 3, bgcolor: '#f0f9ff', border: '2px dashed #3b82f6' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: '#3b82f6', width: 40, height: 40 }}>
              <PersonIcon />
            </Avatar>
            <TextField
              fullWidth
              placeholder="اكتب سؤال العميل هنا..."
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              multiline
              rows={2}
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
              <BotIcon />
            </Avatar>
            <TextField
              fullWidth
              placeholder="اكتب رد البوت المثالي هنا..."
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              multiline
              rows={3}
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={!customerMessage.trim() || !aiResponse.trim()}
              sx={{
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' },
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              إضافة المثال
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Examples List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : examples.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              لا توجد أمثلة بعد
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ابدأ بإضافة أول مثال في الأعلى ⬆️
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {examples.map((example, index) => (
              <Paper
                key={example.id}
                sx={{
                  p: 3,
                  position: 'relative',
                  border: '1px solid #e5e7eb',
                  '&:hover': {
                    boxShadow: 3,
                    borderColor: '#3b82f6',
                  },
                }}
              >
                {/* Delete Button */}
                <IconButton
                  size="small"
                  onClick={() => handleDelete(example.id)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#ef4444',
                  }}
                >
                  <DeleteIcon />
                </IconButton>

                {/* Example Number */}
                <Chip
                  label={`مثال ${index + 1}`}
                  size="small"
                  sx={{ mb: 2, bgcolor: '#f3f4f6', fontWeight: 600 }}
                />

                {/* Customer Message */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#3b82f6', width: 36, height: 36 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      سؤال العميل
                    </Typography>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#1e40af' }}>
                        {example.customerMessage}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>

                {/* AI Response */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#10b981', width: 36, height: 36 }}>
                    <BotIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      رد البوت
                    </Typography>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#065f46' }}>
                        {example.aiResponse}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
                  <Typography variant="caption" color="textSecondary">
                    📊 استُخدم {example.usageCount} مرة
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    📅 {new Date(example.createdAt).toLocaleDateString('ar-EG')}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Settings Dialog */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)} maxWidth="xs" fullWidth>
        <DialogTitle>⚙️ إعدادات النظام</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={systemEnabled}
                onChange={handleToggleSystem}
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {systemEnabled ? 'تعطيل النظام' : 'تفعيل النظام'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {systemEnabled
                    ? 'النظام مفعّل حالياً ويستخدم الأمثلة في الردود'
                    : 'النظام معطّل حالياً'}
                </Typography>
              </Box>
            }
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettings(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FewShotSimple;
