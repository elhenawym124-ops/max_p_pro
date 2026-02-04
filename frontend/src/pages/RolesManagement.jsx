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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { buildApiUrl } from '../utils/apiHelpers';

/**
 * Roles & Permissions Management Page
 * 
 * Manages roles and permissions within a company
 */

const RolesManagement = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState({});
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch roles
  const fetchRoles = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/roles`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setRoles(data.data);
        setError(null);
      } else {
        setError(data.message || 'فشل في جلب الأدوار');
      }
    } catch (err) {
      setError('فشل في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch permissions
  const fetchPermissions = async () => {
    try {
      const response = await fetch(buildApiUrl('permissions'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [user?.companyId]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
      isActive: true
    });
    setFormErrors({});
  };

  // Open new role modal
  const handleAddRole = () => {
    resetForm();
    setModalOpen(true);
  };

  // Open edit role modal
  const handleEditRole = (roleKey, role) => {
    if (role.isBuiltIn) {
      setError('لا يمكن تعديل الأدوار الأساسية');
      return;
    }

    setFormData({
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || [],
      isActive: role.isActive !== undefined ? role.isActive : true
    });
    setSelectedRole({ key: roleKey, ...role });
    setEditModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'اسم الدور مطلوب';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'وصف الدور مطلوب';
    }
    
    if (formData.permissions.length === 0) {
      errors.permissions = 'يجب اختيار صلاحية واحدة على الأقل';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const url = editModalOpen 
        ? buildApiUrl(`companies/${user.companyId}/roles/${selectedRole.key}`)
        : buildApiUrl(`companies/${user.companyId}/roles`);
      
      const method = editModalOpen ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh roles list
        await fetchRoles();
        
        // Close modal and reset form
        setModalOpen(false);
        setEditModalOpen(false);
        resetForm();
        setSelectedRole(null);
        
        // Show success message
        setError(null);
      } else {
        setError(data.message || 'فشل في حفظ الدور');
      }
    } catch (err) {
      setError('فشل في حفظ الدور: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (roleKey, role) => {
    if (role.isBuiltIn) {
      setError('لا يمكن حذف الأدوار الأساسية');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف دور "${role.name}"؟`)) {
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/roles/${roleKey}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchRoles();
        setError(null);
      } else {
        setError(data.message || 'فشل في حذف الدور');
      }
    } catch (err) {
      setError('فشل في حذف الدور: ' + err.message);
    }
  };

  // Group permissions by category
  const groupedPermissions = Object.entries(permissions).reduce((acc, [permission, details]) => {
    const category = details.category || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ name: permission, ...details });
    return acc;
  }, {});

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            إدارة الأدوار والصلاحيات
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            إدارة أدوار المستخدمين وصلاحياتهم في النظام
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRole}
        >
          إضافة دور جديد
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Roles Grid */}
      <Grid container spacing={3}>
        {Object.entries(roles).map(([roleKey, role]) => (
          <Grid item xs={12} md={6} lg={4} key={roleKey}>
            <Card 
              sx={{ 
                height: '100%',
                border: role.isBuiltIn ? '2px solid #e3f2fd' : '1px solid #e0e0e0',
                position: 'relative'
              }}
            >
              {role.isBuiltIn && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#1976d2',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  <LockIcon sx={{ fontSize: 12, mr: 0.5 }} />
                  أساسي
                </Box>
              )}
              
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h3">
                    {role.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {role.description}
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="subtitle2" mb={1}>
                    الصلاحيات ({role.permissions?.length || 0}):
                  </Typography>
                  <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                    {role.permissions?.map((permission, index) => (
                      <Chip
                        key={index}
                        label={permission}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={role.isActive ? 'نشط' : 'غير نشط'}
                    color={role.isActive ? 'success' : 'default'}
                    size="small"
                  />
                  
                  <Box>
                    {!role.isBuiltIn && (
                      <>
                        <Tooltip title="تعديل">
                          <IconButton 
                            size="small"
                            onClick={() => handleEditRole(roleKey, role)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteRole(roleKey, role)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Role Modal */}
      <Dialog
        open={modalOpen || editModalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditModalOpen(false);
          resetForm();
          setSelectedRole(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editModalOpen ? 'تعديل الدور' : 'إضافة دور جديد'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم الدور *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    disabled={submitting}
                  />
                }
                label="نشط"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="وصف الدور *"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" mb={2}>
                الصلاحيات *
              </Typography>
              {formErrors.permissions && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formErrors.permissions}
                </Alert>
              )}

              {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                <Accordion key={category} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {category} ({categoryPermissions.filter(p => formData.permissions.includes(p.name)).length}/{categoryPermissions.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      {categoryPermissions.map((permission) => (
                        <FormControlLabel
                          key={permission.name}
                          control={
                            <Checkbox
                              checked={formData.permissions.includes(permission.name)}
                              onChange={() => handlePermissionToggle(permission.name)}
                              disabled={submitting}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {permission.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setModalOpen(false);
              setEditModalOpen(false);
              resetForm();
              setSelectedRole(null);
            }}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'جاري الحفظ...' : (editModalOpen ? 'تحديث' : 'إنشاء')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesManagement;
