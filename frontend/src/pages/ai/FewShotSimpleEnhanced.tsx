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
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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

const FewShotSimpleEnhanced: React.FC = () => {
  const [examples, setExamples] = useState<FewShotExample[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerMessages, setCustomerMessages] = useState<string[]>(['']);
  const [aiResponses, setAiResponses] = useState<string[]>(['']);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [systemEnabled, setSystemEnabled] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

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

  const handleAddCustomerMessage = () => {
    setCustomerMessages([...customerMessages, '']);
  };

  const handleAddAiResponse = () => {
    setAiResponses([...aiResponses, '']);
  };

  const handleRemoveCustomerMessage = (index: number) => {
    if (customerMessages.length > 1) {
      setCustomerMessages(customerMessages.filter((_, i) => i !== index));
    }
  };

  const handleRemoveAiResponse = (index: number) => {
    if (aiResponses.length > 1) {
      setAiResponses(aiResponses.filter((_, i) => i !== index));
    }
  };

  const handleAdd = async () => {
    const validCustomerMessages = customerMessages.filter(msg => msg.trim());
    const validAiResponses = aiResponses.filter(resp => resp.trim());

    if (validCustomerMessages.length === 0 || validAiResponses.length === 0) {
      showSnackbar('يرجى كتابة سؤال واحد على الأقل ورد واحد على الأقل', 'error');
      return;
    }

    try {
      // إضافة كل تركيبة ممكنة من الأسئلة والردود
      const promises = [];
      for (const customerMsg of validCustomerMessages) {
        for (const aiResp of validAiResponses) {
          promises.push(
            companyAwareApi.post('/few-shot/examples', {
              customerMessage: customerMsg.trim(),
              aiResponse: aiResp.trim(),
              priority: 5,
              isActive: true,
            })
          );
        }
      }

      await Promise.all(promises);

      const totalAdded = validCustomerMessages.length * validAiResponses.length;
      showSnackbar(`تم إضافة ${totalAdded} مثال بنجاح ✅`, 'success');

      // إعادة تعيين النماذج
      setCustomerMessages(['']);
      setAiResponses(['']);
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في إضافة الأمثلة', 'error');
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', gap: 2, bgcolor: '#f9fafb', p: 2 }}>
      {/* Left Side - Add Form */}
      <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
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
        </Box>

        {/* Instructions */}
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: '#fef3c7',
            border: '2px solid #fbbf24',
            cursor: 'pointer',
          }}
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#92400e' }}>
                📚 تعليمات مهمة - اقرأ قبل الإضافة
              </Typography>
            </Box>
            {showInstructions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>

          <Collapse in={showInstructions}>
            <Box sx={{ mt: 2, pl: 4 }}>
              <Typography variant="body2" sx={{ color: '#92400e', mb: 1, fontWeight: 600 }}>
                ⚠️ مهم جداً:
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e', mb: 0.5 }}>
                • <strong>الأمثلة تُعلم الأسلوب فقط</strong> - البوت يتعلم كيف يرد، لكن المعلومات الفعلية تأتي من قاعدة البيانات
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e', mb: 0.5 }}>
                • <strong>لا تكتب أسعار محددة</strong> - البوت يجلب السعر الحقيقي من المنتجات تلقائياً
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e', mb: 2 }}>
                • <strong>ركز على الأسلوب والطريقة</strong> - كيف يرد البوت بشكل احترافي وودود
              </Typography>

              <Typography variant="body2" sx={{ color: '#92400e', mb: 1, fontWeight: 600 }}>
                ✅ أمثلة صحيحة:
              </Typography>
              <Paper sx={{ p: 1.5, mb: 1, bgcolor: '#d1fae5', border: '1px solid #10b981' }}>
                <Typography variant="caption" sx={{ color: '#065f46', display: 'block', mb: 0.5 }}>
                  <strong>سؤال:</strong> كم سعر المنتج؟
                </Typography>
                <Typography variant="caption" sx={{ color: '#065f46' }}>
                  <strong>رد:</strong> سعر المنتج [السعر] جنيه، ويشمل الشحن المجاني 🎁
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#d1fae5', border: '1px solid #10b981' }}>
                <Typography variant="caption" sx={{ color: '#065f46', display: 'block', mb: 0.5 }}>
                  <strong>سؤال:</strong> متى يوصل الطلب؟
                </Typography>
                <Typography variant="caption" sx={{ color: '#065f46' }}>
                  <strong>رد:</strong> التوصيل خلال 2-3 أيام عمل، وسنبلغك بالتفاصيل 📦
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: '#92400e', mb: 1, fontWeight: 600 }}>
                ❌ أمثلة خاطئة:
              </Typography>
              <Paper sx={{ p: 1.5, bgcolor: '#fee2e2', border: '1px solid #ef4444' }}>
                <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', mb: 0.5 }}>
                  <strong>سؤال:</strong> كم سعر تيشيرت أديداس؟
                </Typography>
                <Typography variant="caption" sx={{ color: '#991b1b' }}>
                  <strong>رد:</strong> سعر تيشيرت أديداس 299 جنيه ❌ (لا تكتب أسعار محددة!)
                </Typography>
              </Paper>
            </Box>
          </Collapse>
        </Paper>

        {/* Add New Example Form */}
        <Paper sx={{ p: 3, bgcolor: '#f0f9ff', border: '2px dashed #3b82f6' }}>
          {/* Customer Messages */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e40af' }}>
            👤 أسئلة العميل (يمكنك إضافة أكثر من سؤال)
          </Typography>
          {customerMessages.map((msg, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#3b82f6', width: 40, height: 40 }}>
                <PersonIcon />
              </Avatar>
              <TextField
                fullWidth
                placeholder={`سؤال ${index + 1}: مثال - كم سعر المنتج؟`}
                value={msg}
                onChange={(e) => {
                  const newMessages = [...customerMessages];
                  newMessages[index] = e.target.value;
                  setCustomerMessages(newMessages);
                }}
                multiline
                rows={2}
                variant="outlined"
                sx={{ bgcolor: 'white' }}
              />
              {customerMessages.length > 1 && (
                <IconButton
                  onClick={() => handleRemoveCustomerMessage(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddCustomerMessage}
            sx={{ mb: 3, color: '#3b82f6' }}
          >
            إضافة سؤال آخر
          </Button>

          {/* AI Responses */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#065f46' }}>
            🤖 ردود البوت (يمكنك إضافة أكثر من رد)
          </Typography>
          {aiResponses.map((resp, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
                <BotIcon />
              </Avatar>
              <TextField
                fullWidth
                placeholder={`رد ${index + 1}: مثال - سعر المنتج [السعر] جنيه مع شحن مجاني 🎁`}
                value={resp}
                onChange={(e) => {
                  const newResponses = [...aiResponses];
                  newResponses[index] = e.target.value;
                  setAiResponses(newResponses);
                }}
                multiline
                rows={3}
                variant="outlined"
                sx={{ bgcolor: 'white' }}
              />
              {aiResponses.length > 1 && (
                <IconButton
                  onClick={() => handleRemoveAiResponse(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddAiResponse}
            sx={{ mb: 2, color: '#10b981' }}
          >
            إضافة رد آخر
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              💡 سيتم إنشاء {customerMessages.filter(m => m.trim()).length * aiResponses.filter(r => r.trim()).length} مثال
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={
                customerMessages.filter(m => m.trim()).length === 0 ||
                aiResponses.filter(r => r.trim()).length === 0
              }
              sx={{
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' },
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              إضافة الأمثلة
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

                <Chip
                  label={`مثال ${index + 1}`}
                  size="small"
                  sx={{ mb: 2, bgcolor: '#f3f4f6', fontWeight: 600 }}
                />

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

export default FewShotSimpleEnhanced;
