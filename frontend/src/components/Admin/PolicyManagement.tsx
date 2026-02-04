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
  Visibility,
  Schedule,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { apiClient } from '../../services/apiClient';

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  order: number;
  isActive: boolean;
  version: number;
  effectiveAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PolicyManagement: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    isActive: true,
    effectiveAt: new Date(),
    expiresAt: null as Date | null,
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/policies');
      setPolicies(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحميل السياسات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        effectiveAt: formData.effectiveAt.toISOString(),
        expiresAt: formData.expiresAt ? formData.expiresAt.toISOString() : null,
      };

      if (editingPolicy) {
        await apiClient.put(`/policies/${editingPolicy.id}`, data);
        setSuccess('تم تحديث السياسة بنجاح');
      } else {
        await apiClient.post('/policies', data);
        setSuccess('تم إضافة السياسة بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل حفظ السياسة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) return;

    try {
      await apiClient.delete(`/policies/${id}`);
      setSuccess('تم حذف السياسة بنجاح');
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل حذف السياسة');
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    try {
      await apiClient.put(
        `/policies/${policy.id}`,
        { isActive: !policy.isActive }
      );
      setSuccess(`تم ${!policy.isActive ? 'تفعيل' : 'تعطيل'} السياسة بنجاح`);
      loadPolicies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحديث حالة السياسة');
    }
  };

  const openEditDialog = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title,
      content: policy.content,
      category: policy.category,
      tags: policy.tags.join(', '),
      isActive: policy.isActive,
      effectiveAt: new Date(policy.effectiveAt),
      expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      tags: '',
      isActive: true,
      effectiveAt: new Date(),
      expiresAt: null,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, any> = {
      shipping: 'primary',
      return: 'secondary',
      refund: 'warning',
      privacy: 'info',
      terms: 'default',
    };
    return colors[category] || 'default';
  };

  const isExpired = (policy: Policy) => {
    return policy.expiresAt && new Date(policy.expiresAt) < new Date();
  };

  const isNotYetEffective = (policy: Policy) => {
    return new Date(policy.effectiveAt) > new Date();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">إدارة السياسات</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          إضافة سياسة جديدة
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
                <TableCell>العنوان</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>تاريخ السريان</TableCell>
                <TableCell>تاريخ الانتهاء</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإصدار</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((policy) => (
                <TableRow
                  key={policy.id}
                  sx={{
                    bgcolor: isExpired(policy)
                      ? 'error.lighter'
                      : isNotYetEffective(policy)
                        ? 'warning.lighter'
                        : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {policy.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {policy.content.substring(0, 80)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={policy.category}
                      size="small"
                      color={getCategoryColor(policy.category)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Schedule fontSize="small" />
                      <Typography variant="caption">
                        {new Date(policy.effectiveAt).toLocaleDateString('ar-EG')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {policy.expiresAt ? (
                      <Typography
                        variant="caption"
                        color={isExpired(policy) ? 'error' : 'text.secondary'}
                      >
                        {new Date(policy.expiresAt).toLocaleDateString('ar-EG')}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        بدون انتهاء
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Switch
                        checked={policy.isActive}
                        onChange={() => handleToggleActive(policy)}
                        size="small"
                      />
                      {isExpired(policy) && (
                        <Chip label="منتهية" size="small" color="error" />
                      )}
                      {isNotYetEffective(policy) && (
                        <Chip label="قادمة" size="small" color="warning" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${policy.version}`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setViewingPolicy(policy);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openEditDialog(policy)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(policy.id)}
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
          {editingPolicy ? 'تعديل السياسة' : 'إضافة سياسة جديدة'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="العنوان"
                  fullWidth
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="المحتوى"
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
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
                    <MenuItem value="return">الإرجاع</MenuItem>
                    <MenuItem value="refund">الاسترداد</MenuItem>
                    <MenuItem value="privacy">الخصوصية</MenuItem>
                    <MenuItem value="terms">الشروط والأحكام</MenuItem>
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
                  placeholder="شحن, إرجاع, ضمان"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="تاريخ السريان"
                  value={formData.effectiveAt}
                  onChange={(date) =>
                    setFormData({ ...formData, effectiveAt: date || new Date() })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="تاريخ الانتهاء (اختياري)"
                  value={formData.expiresAt}
                  onChange={(date) =>
                    setFormData({ ...formData, expiresAt: date })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
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
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.title || !formData.content}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{viewingPolicy?.title}</DialogTitle>
        <DialogContent>
          {viewingPolicy && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الفئة
                  </Typography>
                  <Typography variant="body2">{viewingPolicy.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الإصدار
                  </Typography>
                  <Typography variant="body2">v{viewingPolicy.version}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ السريان
                  </Typography>
                  <Typography variant="body2">
                    {new Date(viewingPolicy.effectiveAt).toLocaleString('ar-EG')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الانتهاء
                  </Typography>
                  <Typography variant="body2">
                    {viewingPolicy.expiresAt
                      ? new Date(viewingPolicy.expiresAt).toLocaleString('ar-EG')
                      : 'بدون انتهاء'}
                  </Typography>
                </Grid>
              </Grid>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {viewingPolicy.content}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicyManagement;
