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
  Divider,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
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

const FewShotTwoColumns: React.FC = () => {
  const [examples, setExamples] = useState<FewShotExample[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerMessages, setCustomerMessages] = useState<string[]>(['']);
  const [aiResponses, setAiResponses] = useState<string[]>(['']);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [systemEnabled, setSystemEnabled] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [editingExample, setEditingExample] = useState<FewShotExample | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddVariationDialog, setOpenAddVariationDialog] = useState(false);
  const [baseExample, setBaseExample] = useState<FewShotExample | null>(null);
  const [newVariations, setNewVariations] = useState({ questions: [''], answers: [''] });
  const [openTemplatesDialog, setOpenTemplatesDialog] = useState(false);

  // قوالب جاهزة
  const templates = [
    {
      id: 'pricing',
      name: '💰 الأسعار',
      examples: [
        { q: 'كم سعر المنتج؟', a: 'سعر المنتج [السعر] جنيه، ويشمل الشحن المجاني 🎁' },
        { q: 'بكام المنتج؟', a: 'المنتج متوفر بسعر [السعر] جنيه فقط ✨' },
        { q: 'المنتج غالي', a: 'السعر مناسب جداً مقارنة بالجودة، والتوصيل مجاني 📦' },
      ]
    },
    {
      id: 'shipping',
      name: '📦 الشحن والتوصيل',
      examples: [
        { q: 'متى يوصل الطلب؟', a: 'التوصيل خلال 2-3 أيام عمل، وسنبلغك بالتفاصيل 📱' },
        { q: 'الشحن مجاني؟', a: 'نعم! الشحن مجاني لجميع المحافظات 🚚' },
        { q: 'ممكن استلام من المحل؟', a: 'بالتأكيد! يمكنك الاستلام من الفرع الأقرب لك 🏪' },
      ]
    },
    {
      id: 'availability',
      name: '✅ التوفر والمخزون',
      examples: [
        { q: 'المنتج متوفر؟', a: 'نعم متوفر! يمكنك الطلب الآن وسيصلك قريباً ✅' },
        { q: 'الكمية المتاحة؟', a: 'متوفر بكميات محدودة، ننصح بالطلب سريعاً ⚡' },
        { q: 'هيرجع تاني؟', a: 'سنوفره قريباً، يمكنك حجزه الآن 📝' },
      ]
    },
    {
      id: 'payment',
      name: '💳 الدفع',
      examples: [
        { q: 'طرق الدفع المتاحة؟', a: 'يمكنك الدفع كاش عند الاستلام أو أونلاين 💳' },
        { q: 'ممكن دفع أونلاين؟', a: 'بالتأكيد! نقبل جميع طرق الدفع الإلكتروني 💰' },
        { q: 'في تقسيط؟', a: 'نعم متاح التقسيط على 3 أو 6 أشهر 📊' },
      ]
    },
    {
      id: 'returns',
      name: '🔄 الاسترجاع والاستبدال',
      examples: [
        { q: 'ممكن استرجاع؟', a: 'يمكنك الاسترجاع خلال 14 يوم من الاستلام 🔄' },
        { q: 'شروط الاستبدال؟', a: 'المنتج يكون بحالته الأصلية مع الفاتورة 📋' },
        { q: 'مين يدفع مصاريف الإرجاع؟', a: 'نحن نتحمل مصاريف الإرجاع في حالة العيوب 💯' },
      ]
    },
    {
      id: 'quality',
      name: '⭐ الجودة والضمان',
      examples: [
        { q: 'المنتج أصلي؟', a: 'نعم 100% أصلي ومضمون الجودة ⭐' },
        { q: 'في ضمان؟', a: 'يوجد ضمان سنة على جميع المنتجات 🛡️' },
        { q: 'جودة المنتج كويسة؟', a: 'جودة ممتازة وتقييمات العملاء ممتازة ⭐⭐⭐⭐⭐' },
      ]
    },
  ];

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

  const handleEditExample = (example: FewShotExample) => {
    setEditingExample(example);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingExample) return;

    try {
      await companyAwareApi.put(`/few-shot/examples/${editingExample.id}`, {
        customerMessage: editingExample.customerMessage,
        aiResponse: editingExample.aiResponse,
        priority: 5,
        isActive: true,
      });
      showSnackbar('تم تحديث المثال بنجاح ✅', 'success');
      setOpenEditDialog(false);
      setEditingExample(null);
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في تحديث المثال', 'error');
    }
  };

  const handleAddVariation = (example: FewShotExample) => {
    setBaseExample(example);
    setNewVariations({ questions: [''], answers: [''] });
    setOpenAddVariationDialog(true);
  };

  const handleSaveVariations = async () => {
    if (!baseExample) return;

    const validQuestions = newVariations.questions.filter(q => q.trim());
    const validAnswers = newVariations.answers.filter(a => a.trim());

    if (validQuestions.length === 0 && validAnswers.length === 0) {
      showSnackbar('يرجى إضافة سؤال أو رد على الأقل', 'error');
      return;
    }

    try {
      const promises = [];

      // إضافة أسئلة جديدة مع نفس الرد
      for (const question of validQuestions) {
        promises.push(
          companyAwareApi.post('/few-shot/examples', {
            customerMessage: question.trim(),
            aiResponse: baseExample.aiResponse,
            priority: 5,
            isActive: true,
          })
        );
      }

      // إضافة ردود جديدة مع نفس السؤال
      for (const answer of validAnswers) {
        promises.push(
          companyAwareApi.post('/few-shot/examples', {
            customerMessage: baseExample.customerMessage,
            aiResponse: answer.trim(),
            priority: 5,
            isActive: true,
          })
        );
      }

      await Promise.all(promises);

      const totalAdded = validQuestions.length + validAnswers.length;
      showSnackbar(`تم إضافة ${totalAdded} تنويع جديد ✅`, 'success');
      setOpenAddVariationDialog(false);
      setBaseExample(null);
      setNewVariations({ questions: [''], answers: [''] });
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في إضافة التنويعات', 'error');
    }
  };

  const handleAddTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      const promises = template.examples.map(ex =>
        companyAwareApi.post('/few-shot/examples', {
          customerMessage: ex.q,
          aiResponse: ex.a,
          priority: 5,
          isActive: true,
        })
      );

      await Promise.all(promises);
      showSnackbar(`تم إضافة ${template.examples.length} مثال من قالب "${template.name}" ✅`, 'success');
      loadExamples();
    } catch (error) {
      showSnackbar('فشل في إضافة القالب', 'error');
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
    <Box className="h-full flex gap-2 p-2 bg-[#f9fafb] dark:bg-gray-900">
      {/* Left Column - Add Form */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
        {/* Header */}
        <Paper className="p-2 bg-white dark:bg-gray-800 dark:text-white">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ➡️ إضافة أمثلة جديدة
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<InfoIcon />}
                onClick={() => setOpenTemplatesDialog(true)}
                sx={{ color: '#10b981', borderColor: '#10b981' }}
              >
                قوالب جاهزة
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setOpenSettings(true)}
              >
                الإعدادات
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={systemEnabled ? '✅ مفعّل' : '⭕ معطّل'}
              color={systemEnabled ? 'success' : 'default'}
              size="small"
            />
            <Chip label={`${examples.length} مثال`} size="small" />
          </Box>
        </Paper>

        {/* Instructions */}
        <Paper
          className="p-2 bg-[#fef3c7] dark:bg-amber-900/20 border-2 border-[#fbbf24] dark:border-amber-700 cursor-pointer"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="subtitle2" className="font-semibold text-[#92400e] dark:text-amber-200">
                📚 تعليمات مهمة
              </Typography>
            </Box>
            {showInstructions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>

          <Collapse in={showInstructions}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" className="text-[#92400e] dark:text-amber-200 mb-1">
                • <strong>الأمثلة تُعلم الأسلوب فقط</strong> - المعلومات الفعلية من قاعدة البيانات
              </Typography>
              <Typography variant="body2" className="text-[#92400e] dark:text-amber-200 mb-1">
                • <strong>لا تكتب أسعار محددة</strong> - البوت يجلب السعر الحقيقي تلقائياً
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ color: '#065f46', display: 'block', fontWeight: 600 }}>
                ✅ مثال صحيح: "سعر المنتج [السعر] جنيه مع شحن مجاني 🎁"
              </Typography>
              <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', fontWeight: 600 }}>
                ❌ مثال خاطئ: "سعر تيشيرت أديداس 299 جنيه"
              </Typography>
            </Box>
          </Collapse>
        </Paper>

        {/* Add Form */}
        <Paper className="p-2 bg-[#f0f9ff] dark:bg-blue-900/10 border-2 border-dashed border-[#3b82f6] dark:border-blue-700">
          <Typography variant="subtitle2" className="mb-1 font-semibold text-[#1e40af] dark:text-blue-300">
            👤 أسئلة العميل
          </Typography>
          {customerMessages.map((msg, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`سؤال ${index + 1}`}
                value={msg}
                onChange={(e) => {
                  const newMessages = [...customerMessages];
                  newMessages[index] = e.target.value;
                  setCustomerMessages(newMessages);
                }}
                multiline
                rows={2}
                className="bg-white dark:bg-gray-700 dark:text-white rounded-md"
                InputProps={{ className: "dark:text-white" }}
              />
              {customerMessages.length > 1 && (
                <IconButton size="small" onClick={() => handleRemoveCustomerMessage(index)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={handleAddCustomerMessage} sx={{ mb: 2 }}>
            إضافة سؤال
          </Button>

          <Typography variant="subtitle2" className="mb-1 font-semibold text-[#065f46] dark:text-green-300">
            🤖 ردود البوت
          </Typography>
          {aiResponses.map((resp, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`رد ${index + 1}`}
                value={resp}
                onChange={(e) => {
                  const newResponses = [...aiResponses];
                  newResponses[index] = e.target.value;
                  setAiResponses(newResponses);
                }}
                multiline
                rows={2}
                className="bg-white dark:bg-gray-700 dark:text-white rounded-md"
                InputProps={{ className: "dark:text-white" }}
              />
              {aiResponses.length > 1 && (
                <IconButton size="small" onClick={() => handleRemoveAiResponse(index)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={handleAddAiResponse} sx={{ mb: 2 }}>
            إضافة رد
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              💡 سيتم إنشاء {customerMessages.filter(m => m.trim()).length * aiResponses.filter(r => r.trim()).length} مثال
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={
                customerMessages.filter(m => m.trim()).length === 0 ||
                aiResponses.filter(r => r.trim()).length === 0
              }
            >
              إضافة
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Right Column - Examples List */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper className="p-2 mb-2 bg-white dark:bg-gray-800 dark:text-white">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            📚 الأمثلة المضافة ({examples.length})
          </Typography>
        </Paper>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : examples.length === 0 ? (
            <Paper className="p-4 text-center bg-white dark:bg-gray-800 dark:text-gray-300">
              <Typography color="textSecondary">
                لا توجد أمثلة بعد
              </Typography>
              <Typography variant="caption" color="textSecondary">
                أضف أول مثال من العمود الأيسر ←
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {examples.map((example, index) => (
                <Paper key={example.id} className="p-2 relative bg-white dark:bg-gray-800 dark:text-white">
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleAddVariation(example)}
                      sx={{ color: '#10b981' }}
                      title="إضافة تنويعات"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditExample(example)}
                      sx={{ color: '#3b82f6' }}
                      title="تعديل"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(example.id)}
                      sx={{ color: '#ef4444' }}
                      title="حذف"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Chip label={`مثال ${index + 1}`} size="small" sx={{ mb: 1 }} />

                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                      <Avatar sx={{ bgcolor: '#3b82f6', width: 24, height: 24 }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>
                        سؤال العميل
                      </Typography>
                    </Box>
                    <Paper className="p-1 bg-[#eff6ff] dark:bg-blue-900/20 border border-[#bfdbfe] dark:border-blue-800">
                      <Typography variant="body2" className="text-[#1e40af] dark:text-blue-200">
                        {example.customerMessage}
                      </Typography>
                    </Paper>
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                      <Avatar sx={{ bgcolor: '#10b981', width: 24, height: 24 }}>
                        <BotIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>
                        رد البوت
                      </Typography>
                    </Box>
                    <Paper className="p-1 bg-[#f0fdf4] dark:bg-green-900/20 border border-[#bbf7d0] dark:border-green-800">
                      <Typography variant="body2" className="text-[#065f46] dark:text-green-200">
                        {example.aiResponse}
                      </Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 1, pt: 1, borderTop: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="textSecondary">
                      📊 {example.usageCount} مرة
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
      </Box>

      {/* Templates Dialog */}
      <Dialog
        open={openTemplatesDialog}
        onClose={() => setOpenTemplatesDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "bg-white dark:bg-gray-800 dark:text-white" }}
      >
        <DialogTitle>📋 قوالب جاهزة للاستخدام</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            اختر قالب لإضافة أمثلة جاهزة بضغطة واحدة
          </Typography>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} key={template.id}>
                <Paper
                  className="p-2 cursor-pointer border-2 border-gray-200 dark:border-gray-700 hover:border-[#10b981] dark:hover:border-green-500 bg-white dark:bg-gray-800 hover:bg-[#f0fdf4] dark:hover:bg-green-900/10"
                  onClick={() => {
                    handleAddTemplate(template.id);
                    setOpenTemplatesDialog(false);
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {template.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    {template.examples.length} أمثلة
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  {template.examples.slice(0, 2).map((ex, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#1e40af', display: 'block' }}>
                        👤 {ex.q}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#065f46', display: 'block' }}>
                        🤖 {ex.a}
                      </Typography>
                    </Box>
                  ))}
                  {template.examples.length > 2 && (
                    <Typography variant="caption" color="textSecondary">
                      ... و {template.examples.length - 2} أمثلة أخرى
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTemplatesDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Add Variation Dialog */}
      <Dialog
        open={openAddVariationDialog}
        onClose={() => setOpenAddVariationDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: "bg-white dark:bg-gray-800 dark:text-white" }}
      >
        <DialogTitle>➕ إضافة تنويعات على المثال</DialogTitle>
        <DialogContent>
          {baseExample && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  <strong>المثال الأساسي:</strong><br />
                  👤 {baseExample.customerMessage}<br />
                  🤖 {baseExample.aiResponse}
                </Typography>
              </Alert>

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e40af' }}>
                👤 أسئلة إضافية (ستستخدم نفس الرد)
              </Typography>
              {newVariations.questions.map((q, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`سؤال إضافي ${index + 1}`}
                    value={q}
                    onChange={(e) => {
                      const newQ = [...newVariations.questions];
                      newQ[index] = e.target.value;
                      setNewVariations({ ...newVariations, questions: newQ });
                    }}
                    multiline
                    rows={2}
                  />
                  {newVariations.questions.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNewVariations({
                          ...newVariations,
                          questions: newVariations.questions.filter((_, i) => i !== index)
                        });
                      }}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setNewVariations({ ...newVariations, questions: [...newVariations.questions, ''] })}
                sx={{ mb: 2 }}
              >
                إضافة سؤال
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#065f46' }}>
                🤖 ردود إضافية (ستستخدم نفس السؤال)
              </Typography>
              {newVariations.answers.map((a, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`رد إضافي ${index + 1}`}
                    value={a}
                    onChange={(e) => {
                      const newA = [...newVariations.answers];
                      newA[index] = e.target.value;
                      setNewVariations({ ...newVariations, answers: newA });
                    }}
                    multiline
                    rows={2}
                  />
                  {newVariations.answers.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNewVariations({
                          ...newVariations,
                          answers: newVariations.answers.filter((_, i) => i !== index)
                        });
                      }}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setNewVariations({ ...newVariations, answers: [...newVariations.answers, ''] })}
              >
                إضافة رد
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddVariationDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveVariations} variant="contained" color="success">
            حفظ التنويعات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: "bg-white dark:bg-gray-800 dark:text-white" }}
      >
        <DialogTitle>✏️ تعديل المثال</DialogTitle>
        <DialogContent>
          {editingExample && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e40af' }}>
                👤 سؤال العميل
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editingExample.customerMessage}
                onChange={(e) => setEditingExample({ ...editingExample, customerMessage: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#065f46' }}>
                🤖 رد البوت
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={editingExample.aiResponse}
                onChange={(e) => setEditingExample({ ...editingExample, aiResponse: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            حفظ التعديلات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: "bg-white dark:bg-gray-800 dark:text-white" }}
      >
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

export default FewShotTwoColumns;
