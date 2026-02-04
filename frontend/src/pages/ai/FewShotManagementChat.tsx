import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  PlayArrow as TestIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  TrendingUp as StatsIcon,
} from '@mui/icons-material';
import { companyAwareApi } from '../../services/companyAwareApi';

interface FewShotExample {
  id: string;
  customerMessage: string;
  aiResponse: string;
  category?: string;
  tags?: string[];
  priority: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface FewShotSettings {
  enabled: boolean;
  maxExamplesPerPrompt: number;
  selectionStrategy: 'priority' | 'random' | 'category_match' | 'smart';
  autoLearnFromGood: boolean;
  minQualityScore: number;
}

interface FewShotStats {
  totalExamples: number;
  activeExamples: number;
  inactiveExamples: number;
  enabled: boolean;
  maxExamplesPerPrompt: number;
  selectionStrategy: string;
  autoLearnEnabled: boolean;
  examplesByCategory: Array<{ category: string; count: number }>;
  mostUsedExamples: Array<{
    id: string;
    customerMessage: string;
    category: string;
    usageCount: number;
    priority: number;
  }>;
}

const FewShotManagementChat: React.FC = () => {
  const [examples, setExamples] = useState<FewShotExample[]>([]);
  const [settings, setSettings] = useState<FewShotSettings>({
    enabled: false,
    maxExamplesPerPrompt: 3,
    selectionStrategy: 'priority',
    autoLearnFromGood: false,
    minQualityScore: 80,
  });
  const [stats, setStats] = useState<FewShotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [editingExample, setEditingExample] = useState<FewShotExample | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedExample, setSelectedExample] = useState<FewShotExample | null>(null);

  const [formData, setFormData] = useState({
    customerMessage: '',
    aiResponse: '',
    category: '',
    tags: '',
    priority: 5,
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    loadExamples();
    loadSettings();
    loadStats();
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
      setSettings(response.data.data);
    } catch (error) {
      showSnackbar('فشل في تحميل الإعدادات', 'error');
    }
  };

  const loadStats = async () => {
    try {
      const response = await companyAwareApi.get('/few-shot/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSaveExample = async () => {
    try {
      const data = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      };

      if (editingExample) {
        await companyAwareApi.put(`/few-shot/examples/${editingExample.id}`, data);
        showSnackbar('تم تحديث المثال بنجاح', 'success');
      } else {
        await companyAwareApi.post('/few-shot/examples', data);
        showSnackbar('تم إضافة المثال بنجاح', 'success');
      }

      loadExamples();
      loadStats();
      handleCloseDialog();
    } catch (error) {
      showSnackbar('فشل في حفظ المثال', 'error');
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المثال؟')) return;

    try {
      await companyAwareApi.delete(`/few-shot/examples/${id}`);
      showSnackbar('تم حذف المثال بنجاح', 'success');
      loadExamples();
      loadStats();
      setSelectedExample(null);
    } catch (error) {
      showSnackbar('فشل في حذف المثال', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await companyAwareApi.put('/few-shot/settings', settings);
      showSnackbar('تم حفظ الإعدادات بنجاح', 'success');
      setOpenSettingsDialog(false);
      loadStats();
    } catch (error) {
      showSnackbar('فشل في حفظ الإعدادات', 'error');
    }
  };

  const handleOpenDialog = (example?: FewShotExample) => {
    if (example) {
      setEditingExample(example);
      setFormData({
        customerMessage: example.customerMessage,
        aiResponse: example.aiResponse,
        category: example.category || '',
        tags: example.tags?.join(', ') || '',
        priority: example.priority,
        notes: example.notes || '',
        isActive: example.isActive,
      });
    } else {
      setEditingExample(null);
      setFormData({
        customerMessage: '',
        aiResponse: '',
        category: '',
        tags: '',
        priority: 5,
        notes: '',
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExample(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      pricing: '#3b82f6',
      shipping: '#8b5cf6',
      complaint: '#ef4444',
      product_info: '#10b981',
      general: '#6b7280',
    };
    return colors[category || 'general'] || '#6b7280';
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      pricing: 'الأسعار',
      shipping: 'الشحن',
      complaint: 'شكوى',
      product_info: 'معلومات المنتج',
      general: 'عام',
    };
    return labels[category || 'general'] || 'عام';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            🎓 نظام التعلم بالأمثلة
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setOpenSettingsDialog(true)}
              sx={{ mr: 1 }}
              size="small"
            >
              الإعدادات
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              إضافة مثال
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f0f9ff' }}>
                <Typography variant="h4" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                  {stats.totalExamples}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  إجمالي الأمثلة
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f0fdf4' }}>
                <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 700 }}>
                  {stats.activeExamples}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  الأمثلة النشطة
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fef3c7' }}>
                <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                  {stats.maxExamplesPerPrompt}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  الحد الأقصى
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: stats.enabled ? '#f0fdf4' : '#f3f4f6' }}>
                <Chip
                  label={stats.enabled ? 'مفعّل' : 'معطّل'}
                  color={stats.enabled ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  حالة النظام
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Chat-like Examples List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: '#f9fafb' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : examples.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="textSecondary" gutterBottom>
              لا توجد أمثلة حتى الآن
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ mt: 2 }}
            >
              إضافة أول مثال
            </Button>
          </Box>
        ) : (
          <Stack spacing={3}>
            {examples.map((example) => (
              <Card
                key={example.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: selectedExample?.id === example.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => setSelectedExample(example)}
              >
                <Box sx={{ p: 2 }}>
                  {/* Header with Category and Priority */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {example.category && (
                        <Chip
                          label={getCategoryLabel(example.category)}
                          size="small"
                          sx={{
                            bgcolor: getCategoryColor(example.category),
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Chip
                        label={`أولوية: ${example.priority}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={example.isActive ? 'نشط' : 'معطل'}
                        size="small"
                        color={example.isActive ? 'success' : 'default'}
                      />
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(example);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExample(example.id);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Customer Message */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#3b82f6', width: 36, height: 36 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                        سؤال العميل
                      </Typography>
                      <Paper
                        sx={{
                          p: 2,
                          mt: 0.5,
                          bgcolor: '#eff6ff',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2">{example.customerMessage}</Typography>
                      </Paper>
                    </Box>
                  </Box>

                  {/* AI Response */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 36, height: 36 }}>
                      <BotIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                        رد الذكاء الاصطناعي
                      </Typography>
                      <Paper
                        sx={{
                          p: 2,
                          mt: 0.5,
                          bgcolor: '#f0fdf4',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2">{example.aiResponse}</Typography>
                      </Paper>
                    </Box>
                  </Box>

                  {/* Footer with Stats */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="textSecondary">
                      📊 استُخدم {example.usageCount} مرة
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      📅 {new Date(example.createdAt).toLocaleDateString('ar-EG')}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingExample ? '✏️ تعديل المثال' : '➕ إضافة مثال جديد'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" color="primary" />
              سؤال العميل
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={formData.customerMessage}
              onChange={(e) => setFormData({ ...formData, customerMessage: e.target.value })}
              placeholder="مثال: كم سعر المنتج؟"
              sx={{ mb: 3 }}
              required
            />

            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BotIcon fontSize="small" color="success" />
              رد الذكاء الاصطناعي المثالي
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={formData.aiResponse}
              onChange={(e) => setFormData({ ...formData, aiResponse: e.target.value })}
              placeholder="مثال: سعر المنتج 299 جنيه، ويشمل الشحن المجاني 🎁"
              sx={{ mb: 3 }}
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>التصنيف</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    label="التصنيف"
                  >
                    <MenuItem value="">بدون تصنيف</MenuItem>
                    <MenuItem value="pricing">الأسعار</MenuItem>
                    <MenuItem value="shipping">الشحن</MenuItem>
                    <MenuItem value="complaint">شكوى</MenuItem>
                    <MenuItem value="product_info">معلومات المنتج</MenuItem>
                    <MenuItem value="general">عام</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الأولوية (0-10)"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  inputProps={{ min: 0, max: 10 }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="الوسوم (مفصولة بفاصلة)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              sx={{ mt: 2, mb: 2 }}
              placeholder="سعر, خصم, عرض"
            />

            <TextField
              fullWidth
              label="ملاحظات"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="نشط"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            onClick={handleSaveExample}
            variant="contained"
            disabled={!formData.customerMessage || !formData.aiResponse}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={openSettingsDialog} onClose={() => setOpenSettingsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>⚙️ إعدادات نظام التعلم بالأمثلة</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
            }
            label="تفعيل نظام التعلم بالأمثلة"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="الحد الأقصى للأمثلة في كل برومبت"
            type="number"
            value={settings.maxExamplesPerPrompt}
            onChange={(e) => setSettings({ ...settings, maxExamplesPerPrompt: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 10 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>استراتيجية الاختيار</InputLabel>
            <Select
              value={settings.selectionStrategy}
              onChange={(e) => setSettings({ ...settings, selectionStrategy: e.target.value as any })}
              label="استراتيجية الاختيار"
            >
              <MenuItem value="priority">حسب الأولوية</MenuItem>
              <MenuItem value="random">عشوائي</MenuItem>
              <MenuItem value="category_match">حسب التصنيف</MenuItem>
              <MenuItem value="smart">ذكي</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoLearnFromGood}
                onChange={(e) => setSettings({ ...settings, autoLearnFromGood: e.target.checked })}
              />
            }
            label="التعلم التلقائي من الردود الجيدة"
            sx={{ mb: 2 }}
          />
          {settings.autoLearnFromGood && (
            <TextField
              fullWidth
              label="الحد الأدنى لجودة الرد (%)"
              type="number"
              value={settings.minQualityScore}
              onChange={(e) => setSettings({ ...settings, minQualityScore: parseFloat(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveSettings} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FewShotManagementChat;
