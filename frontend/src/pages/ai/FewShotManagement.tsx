import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  PlayArrow as TestIcon,
  TrendingUp as StatsIcon,
  School as LearnIcon,
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

const FewShotManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
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
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [editingExample, setEditingExample] = useState<FewShotExample | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState({
    customerMessage: '',
    aiResponse: '',
    category: '',
    tags: '',
    priority: 5,
    notes: '',
    isActive: true,
  });

  const [testData, setTestData] = useState({
    customerMessage: '',
    category: '',
  });

  const [testResult, setTestResult] = useState<any>(null);

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

  const handleTestPrompt = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.post('/few-shot/test', {
        customerMessage: testData.customerMessage,
        messageContext: { category: testData.category },
      });
      setTestResult(response.data.data);
    } catch (error) {
      showSnackbar('فشل في اختبار البرومبت', 'error');
    } finally {
      setLoading(false);
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
      pricing: 'primary',
      shipping: 'secondary',
      complaint: 'error',
      product_info: 'info',
      general: 'default',
    };
    return colors[category || 'general'] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">🎓 نظام التعلم بالأمثلة</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setOpenSettingsDialog(true)}
            sx={{ mr: 1 }}
          >
            الإعدادات
          </Button>
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={() => setOpenTestDialog(true)}
            sx={{ mr: 1 }}
          >
            اختبار
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            إضافة مثال
          </Button>
        </Box>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  إجمالي الأمثلة
                </Typography>
                <Typography variant="h4">{stats.totalExamples}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  الأمثلة النشطة
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.activeExamples}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  الحد الأقصى للأمثلة
                </Typography>
                <Typography variant="h4">{stats.maxExamplesPerPrompt}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  الحالة
                </Typography>
                <Chip
                  label={stats.enabled ? 'مفعّل' : 'معطّل'}
                  color={stats.enabled ? 'success' : 'default'}
                  size="small"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="📚 الأمثلة" />
        <Tab label="📊 الإحصائيات" />
      </Tabs>

      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>سؤال العميل</TableCell>
                <TableCell>رد الذكاء الاصطناعي</TableCell>
                <TableCell>التصنيف</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>الاستخدام</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : examples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">لا توجد أمثلة</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                examples.map((example) => (
                  <TableRow key={example.id}>
                    <TableCell>
                      <Tooltip title={example.customerMessage}>
                        <Typography noWrap sx={{ maxWidth: 200 }}>
                          {example.customerMessage}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={example.aiResponse}>
                        <Typography noWrap sx={{ maxWidth: 250 }}>
                          {example.aiResponse}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {example.category && (
                        <Chip
                          label={example.category}
                          size="small"
                          color={getCategoryColor(example.category) as any}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={example.priority} size="small" />
                    </TableCell>
                    <TableCell>{example.usageCount}</TableCell>
                    <TableCell>
                      <Chip
                        label={example.isActive ? 'نشط' : 'معطل'}
                        size="small"
                        color={example.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(example)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteExample(example.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الأمثلة حسب التصنيف
                </Typography>
                {stats.examplesByCategory.map((cat) => (
                  <Box key={cat.category} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {cat.category}: {cat.count}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الأمثلة الأكثر استخداماً
                </Typography>
                {stats.mostUsedExamples.map((ex, idx) => (
                  <Box key={ex.id} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {idx + 1}. {ex.customerMessage.substring(0, 50)}... ({ex.usageCount} مرة)
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingExample ? '✏️ تعديل المثال' : '➕ إضافة مثال جديد'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="سؤال العميل"
            multiline
            rows={3}
            value={formData.customerMessage}
            onChange={(e) => setFormData({ ...formData, customerMessage: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="رد الذكاء الاصطناعي"
            multiline
            rows={4}
            value={formData.aiResponse}
            onChange={(e) => setFormData({ ...formData, aiResponse: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="التصنيف"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="pricing, shipping, complaint, etc."
              />
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
            placeholder="tag1, tag2, tag3"
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

      <Dialog open={openTestDialog} onClose={() => setOpenTestDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>🧪 اختبار نظام التعلم بالأمثلة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="رسالة العميل"
            multiline
            rows={3}
            value={testData.customerMessage}
            onChange={(e) => setTestData({ ...testData, customerMessage: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="التصنيف (اختياري)"
            value={testData.category}
            onChange={(e) => setTestData({ ...testData, category: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleTestPrompt}
            disabled={!testData.customerMessage || loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : 'اختبار'}
          </Button>
          {testResult && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                ✅ تم اختيار {testResult.examplesCount} أمثلة بنجاح
              </Alert>
              <Typography variant="subtitle2" gutterBottom>
                الأمثلة المختارة:
              </Typography>
              {testResult.selectedExamples.map((ex: any, idx: number) => (
                <Card key={idx} sx={{ mb: 1, p: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    العميل: {ex.customerMessage}
                  </Typography>
                  <Typography variant="caption" display="block">
                    الرد: {ex.aiResponse}
                  </Typography>
                </Card>
              ))}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                البرومبت الكامل:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {testResult.prompt}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTestDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

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

export default FewShotManagement;
