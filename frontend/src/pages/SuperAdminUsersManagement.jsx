import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  Pagination,
  CircularProgress,
  Avatar,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { useTheme } from '../hooks/useTheme';
import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminUsersManagement = () => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    skills: '',
    department: '',
    availability: 'available',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Available roles from settings
  const [availableRoles, setAvailableRoles] = useState([]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) {
        queryParams.append('search', search);
      }
      if (isActiveFilter !== '') {
        queryParams.append('isActive', isActiveFilter);
      }

      const url = buildApiUrl(`super-admin/users?${queryParams}`);
      console.log('🔍 [SUPER-ADMIN-USERS] Fetching from URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Error response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText
        });

        if (response.status === 401) {
          setError('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('accessToken');
          window.location.href = '/auth/login';
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 100)}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Response is not JSON:', text.substring(0, 200));
        throw new Error('الخادم لم يرجع بيانات JSON صحيحة');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total);
        setError(null);
      } else {
        setError(data.message || 'فشل في جلب المستخدمين');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available roles from settings
  const fetchRoles = async () => {
    try {
      const response = await fetch(buildApiUrl('super-admin/dev/settings'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success && data.data?.permissions) {
        const roles = Object.keys(data.data.permissions);
        setAvailableRoles(roles);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [page, search, isActiveFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: '',
      skills: '',
      department: '',
      availability: 'available',
      isActive: true
    });
    setFormErrors({});
  };

  // Open new user modal
  const handleAddUser = () => {
    resetForm();
    setModalOpen(true);
  };

  // Open edit user modal
  const handleEditUser = (userToEdit) => {
    setFormData({
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      email: userToEdit.email || '',
      password: '', // Don't pre-fill password
      phone: userToEdit.phone || '',
      role: userToEdit.role || '',
      skills: userToEdit.skills || '',
      department: userToEdit.department || '',
      availability: userToEdit.availability || 'available',
      isActive: userToEdit.isActive !== undefined ? userToEdit.isActive : true
    });
    setSelectedUser(userToEdit);
    setEditModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'الاسم الأول مطلوب';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'الاسم الأخير مطلوب';
    }

    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!editModalOpen && !formData.password.trim()) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }

    if (!formData.role) {
      errors.role = 'الدور مطلوب';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const url = editModalOpen
        ? buildApiUrl(`super-admin/users/${selectedUser.id}`)
        : buildApiUrl('super-admin/users');

      const method = editModalOpen ? 'PUT' : 'POST';

      // Don't send password if it's empty in edit mode
      const submitData = { ...formData };
      if (editModalOpen && !submitData.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Error response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText
        });

        if (response.status === 401) {
          setError('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('accessToken');
          window.location.href = '/auth/login';
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Response is not JSON:', text.substring(0, 200));
        throw new Error('الخادم لم يرجع بيانات JSON صحيحة');
      }

      const data = await response.json();

      if (data.success) {
        await fetchUsers();
        setModalOpen(false);
        setEditModalOpen(false);
        resetForm();
        setSelectedUser(null);
        setSuccess(data.message || (editModalOpen ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح'));
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'فشل في حفظ المستخدم');
      }
    } catch (err) {
      setError('فشل في حفظ المستخدم: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${userToDelete.firstName} ${userToDelete.lastName}؟`)) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`super-admin/users/${userToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Error response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText
        });

        if (response.status === 401) {
          setError('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('accessToken');
          window.location.href = '/auth/login';
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ [SUPER-ADMIN-USERS] Response is not JSON:', text.substring(0, 200));
        throw new Error('الخادم لم يرجع بيانات JSON صحيحة');
      }

      const data = await response.json();

      if (data.success) {
        await fetchUsers();
        setSuccess('تم حذف المستخدم بنجاح');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'فشل في حذف المستخدم');
      }
    } catch (err) {
      setError('فشل في حذف المستخدم: ' + err.message);
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700 }}>
            إدارة مستخدمي السوبر أدمن
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 1 }}>
            إجمالي المستخدمين: {totalCount}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
          sx={{
            bgcolor: '#3b82f6',
            '&:hover': { bgcolor: '#2563eb' }
          }}
        >
          إضافة مستخدم جديد
        </Button>
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

      {/* Filters */}
      <Card sx={{ mb: 3, bgcolor: isDark ? '#1e293b' : '#fff' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="بحث بالاسم أو البريد الإلكتروني..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActiveFilter === 'true'}
                    onChange={(e) => {
                      setIsActiveFilter(e.target.checked ? 'true' : '');
                      setPage(1);
                    }}
                  />
                }
                label="المستخدمين النشطين فقط"
                sx={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card sx={{ bgcolor: isDark ? '#1e293b' : '#fff' }}>
        <CardContent>
          <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>المستخدم</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>الدور</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>القسم</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>التواجد</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>الهاتف</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>الحالة</TableCell>
                  <TableCell sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>آخر تسجيل دخول</TableCell>
                  <TableCell align="center" sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: '#3b82f6' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                            {userItem.firstName} {userItem.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            ID: {userItem.id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                        {userItem.email}
                      </Typography>
                      {userItem.isEmailVerified && (
                        <Chip
                          label="مؤكد"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={userItem.role || 'غير محدد'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        {userItem.department || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {userItem.availability && (
                        <Chip
                          label={
                            userItem.availability === 'available' ? 'متاح' :
                              userItem.availability === 'busy' ? 'مشغول' :
                                userItem.availability === 'away' ? 'بعيد' : 'غير متصل'
                          }
                          size="small"
                          color={
                            userItem.availability === 'available' ? 'success' :
                              userItem.availability === 'busy' ? 'error' :
                                userItem.availability === 'away' ? 'warning' : 'default'
                          }
                          variant="filled"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        {userItem.phone || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={userItem.isActive ? 'نشط' : 'غير نشط'}
                        color={userItem.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        {userItem.lastLoginAt
                          ? new Date(userItem.lastLoginAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'لم يسجل دخول'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(userItem)}
                          sx={{ color: '#3b82f6' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(userItem)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        لا يوجد مستخدمين
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      <Dialog
        open={modalOpen || editModalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditModalOpen(false);
          resetForm();
          setSelectedUser(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#1e293b'
          }
        }}
      >
        <DialogTitle sx={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700 }}>
          {editModalOpen ? 'تعديل مستخدم السوبر أدمن' : 'إضافة مستخدم سوبر أدمن جديد'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم الأول"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم الأخير"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editModalOpen ? 'كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور'}
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password || (editModalOpen ? 'اتركها فارغة إذا لم ترد تغييرها' : 'يجب أن تكون 8 أحرف على الأقل')}
                required={!editModalOpen}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.role} required>
                <InputLabel id="role-label" sx={{ color: isDark ? '#94a3b8' : undefined }}>الدور</InputLabel>
                <Select
                  labelId="role-label"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  label="الدور"
                  sx={{
                    bgcolor: isDark ? '#0f172a' : '#f8fafc',
                    '& .MuiSelect-select': {
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }
                  }}
                >
                  <MenuItem value="">-- اختر الدور --</MenuItem>
                  <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
                  {availableRoles.filter(r => r !== 'SUPER_ADMIN').map((role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
                {formErrors.role && <FormHelperText>{formErrors.role}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الهاتف"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="مثال: Frontend, Backend..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="availability-label" sx={{ color: isDark ? '#94a3b8' : undefined }}>الحالة</InputLabel>
                <Select
                  labelId="availability-label"
                  value={formData.availability}
                  onChange={(e) => handleInputChange('availability', e.target.value)}
                  label="الحالة"
                  sx={{
                    bgcolor: isDark ? '#0f172a' : '#f8fafc',
                    '& .MuiSelect-select': {
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }
                  }}
                >
                  <MenuItem value="available">متاح</MenuItem>
                  <MenuItem value="busy">مشغول</MenuItem>
                  <MenuItem value="away">بعيد</MenuItem>
                  <MenuItem value="offline">غير متصل</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المهارات"
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                placeholder="مثال: React, Node.js, Python (مفصولة بفاصلة)"
                helperText="أدخل المهارات مفصولة بفاصلة"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isDark ? '#0f172a' : '#f8fafc'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                }
                label="نشط"
                sx={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setModalOpen(false);
              setEditModalOpen(false);
              resetForm();
              setSelectedUser(null);
            }}
            sx={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' }
            }}
          >
            {submitting ? 'جاري الحفظ...' : (editModalOpen ? 'تحديث' : 'إنشاء')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminUsersManagement;

