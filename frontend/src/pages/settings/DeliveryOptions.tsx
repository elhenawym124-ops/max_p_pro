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
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeliveryDining as DeliveryIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

interface DeliveryOption {
  id: string;
  name: string;
  description: string | null;
  deliveryTime: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  icon: string | null;
  sortOrder: number;
}

const DeliveryOptions: React.FC = () => {
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOption | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deliveryTime: '',
    price: 0,
    isDefault: false,
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/delivery-options');

      if (response.data.success) {
        setOptions(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching delivery options:', error);
      setMessage({
        type: 'error',
        text: 'فشل في جلب خيارات التوصيل'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (option?: DeliveryOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        name: option.name,
        description: option.description || '',
        deliveryTime: option.deliveryTime,
        price: option.price,
        isDefault: option.isDefault,
        isActive: option.isActive,
        sortOrder: option.sortOrder
      });
    } else {
      setEditingOption(null);
      setFormData({
        name: '',
        description: '',
        deliveryTime: '',
        price: 0,
        isDefault: false,
        isActive: true,
        sortOrder: options.length
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOption(null);
  };

  const handleSave = async () => {
    try {
      if (editingOption) {
        // Update
        await apiClient.put(
          `/delivery-options/${editingOption.id}`,
          formData
        );
        setMessage({ type: 'success', text: 'تم تحديث خيار التوصيل بنجاح' });
      } else {
        // Create
        await apiClient.post(
          '/delivery-options',
          formData
        );
        setMessage({ type: 'success', text: 'تم إضافة خيار التوصيل بنجاح' });
      }

      handleCloseDialog();
      fetchOptions();
    } catch (error: any) {
      console.error('Error saving delivery option:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في حفظ خيار التوصيل'
      });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.patch(
        `/delivery-options/${id}/toggle`,
        {}
      );
      fetchOptions();
    } catch (error: any) {
      console.error('Error toggling delivery option:', error);
      setMessage({
        type: 'error',
        text: 'فشل في تغيير حالة خيار التوصيل'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف خيار التوصيل هذا؟')) {
      return;
    }

    try {
      await apiClient.delete(`/delivery-options/${id}`);
      setMessage({ type: 'success', text: 'تم حذف خيار التوصيل بنجاح' });
      fetchOptions();
    } catch (error: any) {
      console.error('Error deleting delivery option:', error);
      setMessage({
        type: 'error',
        text: 'فشل في حذف خيار التوصيل'
      });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            🚚 خيارات التوصيل
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قم بإدارة خيارات التوصيل المتاحة للعملاء
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          إضافة خيار جديد
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الوصف</TableCell>
                  <TableCell>وقت التوصيل</TableCell>
                  <TableCell>السعر</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {options.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={3}>
                        <DeliveryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          لا توجد خيارات توصيل. قم بإضافة خيار جديد
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  options.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {option.name}
                          {option.isDefault && (
                            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{option.description || '-'}</TableCell>
                      <TableCell>{option.deliveryTime}</TableCell>
                      <TableCell>{option.price} جنيه</TableCell>
                      <TableCell>
                        <Chip
                          label={option.isActive ? 'نشط' : 'معطل'}
                          color={option.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(option)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggle(option.id)}
                          color="info"
                        >
                          <Switch checked={option.isActive} size="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(option.id)}
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOption ? 'تعديل خيار التوصيل' : 'إضافة خيار توصيل جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="اسم الخيار"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: توصيل عادي، توصيل سريع، توصيل فوري"
            />

            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف مختصر لخيار التوصيل"
            />

            <TextField
              label="وقت التوصيل"
              fullWidth
              required
              value={formData.deliveryTime}
              onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              placeholder="مثال: 3-5 أيام، 1-2 يوم، نفس اليوم"
            />

            <TextField
              label="السعر (جنيه)"
              type="number"
              fullWidth
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0, step: 5 } }}
            />

            <TextField
              label="ترتيب العرض"
              type="number"
              fullWidth
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              helperText="الترتيب الذي سيظهر به الخيار (الأقل أولاً)"
              InputProps={{ inputProps: { min: 0 } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="جعله الخيار الافتراضي"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="تفعيل الخيار"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained">
            {editingOption ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryOptions;
