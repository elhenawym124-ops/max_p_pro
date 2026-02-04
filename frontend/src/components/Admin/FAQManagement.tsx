import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  order: number;
  helpful: number;
  notHelpful: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const FAQManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    tags: '',
    isActive: true,
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/faqs');
      setFaqs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحميل الأسئلة الشائعة');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editingFaq) {
        await apiClient.put(`/faqs/${editingFaq.id}`, data);
        setSuccess('تم تحديث السؤال بنجاح');
      } else {
        await apiClient.post('/faqs', data);
        setSuccess('تم إضافة السؤال بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل حفظ السؤال');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      await apiClient.delete(`/faqs/${id}`);
      setSuccess('تم حذف السؤال بنجاح');
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل حذف السؤال');
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      await apiClient.put(
        `/faqs/${faq.id}`,
        { isActive: !faq.isActive }
      );
      setSuccess(`تم ${!faq.isActive ? 'تفعيل' : 'تعطيل'} السؤال بنجاح`);
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحديث حالة السؤال');
    }
  };

  const handleReorder = async (faq: FAQ, direction: 'up' | 'down') => {
    try {
      const newOrder = direction === 'up' ? faq.order - 1 : faq.order + 1;
      await apiClient.put(
        `/faqs/${faq.id}`,
        { order: newOrder }
      );
      loadFAQs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل إعادة الترتيب');
    }
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags.join(', '),
      isActive: faq.isActive,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'general',
      tags: '',
      isActive: true,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">إدارة الأسئلة الشائعة</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          إضافة سؤال جديد
        </Button>
      </Box>

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

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الترتيب</TableCell>
                <TableCell>السؤال</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>التقييم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإصدار</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => handleReorder(faq, 'up')}
                        disabled={faq.order === 0}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <Typography sx={{ mx: 1 }}>{faq.order}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleReorder(faq, 'down')}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {faq.question}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {faq.answer.substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={faq.category} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box display="flex" alignItems="center">
                        <ThumbUp fontSize="small" color="success" />
                        <Typography variant="caption" ml={0.5}>
                          {faq.helpful}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <ThumbDown fontSize="small" color="error" />
                        <Typography variant="caption" ml={0.5}>
                          {faq.notHelpful}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.isActive}
                      onChange={() => handleToggleActive(faq)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${faq.version}`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEditDialog(faq)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(faq.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingFaq ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="السؤال"
                fullWidth
                multiline
                rows={2}
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الإجابة"
                fullWidth
                multiline
                rows={4}
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={formData.category}
                  label="الفئة"
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <MenuItem value="general">عام</MenuItem>
                  <MenuItem value="shipping">الشحن</MenuItem>
                  <MenuItem value="payment">الدفع</MenuItem>
                  <MenuItem value="returns">الإرجاع</MenuItem>
                  <MenuItem value="products">المنتجات</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="الوسوم (مفصولة بفواصل)"
                fullWidth
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="شحن, توصيل, سريع"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label="نشط"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.question || !formData.answer}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FAQManagement;
