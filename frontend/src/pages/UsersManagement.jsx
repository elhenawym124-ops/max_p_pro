import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  FormHelperText,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Pagination,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  useTheme as useMuiTheme,
  Snackbar,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  DialogContentText,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
  MoreVert as MoreVertIcon,
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  VpnKey as VpnKeyIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  Mail as MailIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { useTheme } from '../hooks/useTheme';
import { buildApiUrl } from '../utils/urlHelper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Users Management Page
 * 
 * Manages users within a company
 */

const UsersManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  
  // Bulk Actions state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  
  // Search debounce state
  const [searchInput, setSearchInput] = useState('');
  
  // Password Reset Dialog state
  const [passwordResetDialog, setPasswordResetDialog] = useState({ open: false, user: null });
  
  // User Details Dialog state
  const [userDetailsDialog, setUserDetailsDialog] = useState({ open: false, user: null });

  // Plan limits state
  const [planLimits, setPlanLimits] = useState(null);
  const [limitsLoading, setLimitsLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: '',
    employeeStatus: '' // ✅ Add Employee Status filter
  });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'AGENT',
    isActive: true,
    // Employee fields
    departmentId: '',
    positionId: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'FULL_TIME',
    baseSalary: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Departments and Positions state
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // Invitation form state
  const [inviteFormData, setInviteFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'AGENT'
  });
  const [inviteFormErrors, setInviteFormErrors] = useState({});
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  
  // Roles data
  const [roles, setRoles] = useState({});

  // Statistics state
  const [activeTab, setActiveTab] = useState(0);
  const [statistics, setStatistics] = useState([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchInput]);
  
  // Fetch users
  const fetchUsers = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(buildApiUrl(`companies/${user.companyId}/users?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.total);
        setError(null);
      } else {
        setError(data.message || t('users.fetchError'));
      }
    } catch (err) {
      setError(t('users.fetchDataError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    if (!user?.companyId) return;

    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/roles`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  // Fetch plan limits
  const fetchPlanLimits = async () => {
    if (!user?.companyId) return;

    try {
      setLimitsLoading(true);
      const response = await fetch(buildApiUrl('company/limits'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setPlanLimits(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plan limits:', err);
    } finally {
      setLimitsLoading(false);
    }
  };

  // Fetch invitations
  const fetchInvitations = async () => {
    if (!user?.companyId) return;

    try {
      setInvitationsLoading(true);
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setInvitations(data.data.invitations);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch(buildApiUrl('hr/departments'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  // Fetch positions
  const fetchPositions = async () => {
    try {
      const response = await fetch(buildApiUrl('hr/positions'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setPositions(data.positions || []);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPlanLimits();
    fetchInvitations();
    fetchDepartments();
    fetchPositions();
  }, [page, limit, filters, user?.companyId]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
    setSelectedUsers([]); // Clear selection when filtering
  };
  
  // Show snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Show confirmation dialog
  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };
  
  // Close confirmation dialog
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  };
  
  // Handle bulk selection
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };
  
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  const isSelected = (userId) => selectedUsers.includes(userId);
  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'AGENT',
      isActive: true,
      // Employee fields
      departmentId: '',
      positionId: '',
      hireDate: new Date().toISOString().split('T')[0],
      contractType: 'FULL_TIME',
      baseSalary: ''
    });
    setFormErrors({});
  };

  // Reset invite form
  const resetInviteForm = () => {
    setInviteFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'AGENT'
    });
    setInviteFormErrors({});
  };

  // Check if can add new user
  const canAddUser = () => {
    if (!planLimits) return true;

    const userUsage = planLimits.usage.users;
    if (userUsage.limit === -1) return true; // Unlimited

    return userUsage.current < userUsage.limit;
  };

  // Open new user modal
  const handleAddUser = () => {
    if (!canAddUser()) {
      const userUsage = planLimits.usage.users;
      setError(t('users.usageText', { current: userUsage.current, limit: userUsage.limit, percentage: userUsage.percentage }) + t('users.upgradePlanAddMore'));
      return;
    }

    resetForm();
    setModalOpen(true);
  };

  // Open invite user modal
  const handleInviteUser = () => {
    if (!canAddUser()) {
      const userUsage = planLimits.usage.users;
      setError(t('users.usageText', { current: userUsage.current, limit: userUsage.limit, percentage: userUsage.percentage }) + t('users.upgradePlanAddMore'));
      return;
    }

    resetInviteForm();
    setInviteModalOpen(true);
  };

  // Open edit user modal
  const handleEditUser = (user) => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      phone: user.phone || '',
      role: user.role || 'AGENT',
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    setSelectedUser(user);
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

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = t('users.form.firstNameRequired');
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = t('users.form.lastNameRequired');
    }
    
    if (!formData.email.trim()) {
      errors.email = t('users.form.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('users.form.emailInvalid');
    }
    
    if (!editModalOpen && !formData.password.trim()) {
      errors.password = t('users.form.passwordRequired');
    } else if (formData.password && formData.password.length < 6) {
      errors.password = t('users.form.passwordMinLength');
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
        ? buildApiUrl(`companies/${user.companyId}/users/${selectedUser.id}`)
        : buildApiUrl(`companies/${user.companyId}/users`);
      
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
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh users list and limits
        await fetchUsers();
        await fetchPlanLimits();

        // Close modal and reset form
        setModalOpen(false);
        setEditModalOpen(false);
        resetForm();
        setSelectedUser(null);

        // Show success message
        setError(null);
        showSnackbar(editModalOpen ? t('users.updateSuccess') || 'تم تحديث المستخدم بنجاح' : t('users.createSuccess') || 'تم إنشاء المستخدم بنجاح', 'success');
      } else {
        // Handle limit exceeded error specially
        if (data.error === 'LIMIT_EXCEEDED') {
          setError(`${data.message}\n\n${t('users.filters.limit')}: ${data.details.current}/${data.details.limit} ${t('users.table.user')}`);
        } else {
          setError(data.message || t('users.saveError'));
        }
      }
    } catch (err) {
      setError(t('users.saveError') + ': ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = (userToDelete) => {
    showConfirmDialog(
      t('users.confirmDeleteTitle') || 'تأكيد الحذف',
      t('users.confirmDelete', { name: `${userToDelete.firstName} ${userToDelete.lastName}` }) || `هل أنت متأكد من حذف المستخدم ${userToDelete.firstName} ${userToDelete.lastName}؟`,
      async () => {
        try {
          const response = await fetch(buildApiUrl(`companies/${user.companyId}/users/${userToDelete.id}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.success) {
            await fetchUsers();
            setError(null);
            showSnackbar(t('users.deleteSuccess') || 'تم حذف المستخدم بنجاح', 'success');
          } else {
            setError(data.message || t('users.deleteError'));
            showSnackbar(data.message || t('users.deleteError'), 'error');
          }
        } catch (err) {
          const errorMsg = t('users.deleteError') + ': ' + err.message;
          setError(errorMsg);
          showSnackbar(errorMsg, 'error');
        }
        handleCloseConfirmDialog();
      }
    );
  };
  
  // Bulk delete users
  const handleBulkDelete = () => {
    showConfirmDialog(
      'حذف المستخدمين المحددين',
      `هل أنت متأكد من حذف ${selectedUsers.length} مستخدم؟`,
      async () => {
        try {
          const deletePromises = selectedUsers.map(userId =>
            fetch(buildApiUrl(`companies/${user.companyId}/users/${userId}`), {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json'
              }
            })
          );
          
          await Promise.all(deletePromises);
          await fetchUsers();
          setSelectedUsers([]);
          showSnackbar(`تم حذف ${selectedUsers.length} مستخدم بنجاح`, 'success');
        } catch (err) {
          showSnackbar('حدث خطأ أثناء الحذف الجماعي', 'error');
        }
        handleCloseConfirmDialog();
      }
    );
  };
  
  // Bulk activate/deactivate
  const handleBulkActivate = async (activate) => {
    try {
      const updatePromises = selectedUsers.map(userId => {
        const userToUpdate = users.find(u => u.id === userId);
        return fetch(buildApiUrl(`companies/${user.companyId}/users/${userId}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...userToUpdate, isActive: activate })
        });
      });
      
      await Promise.all(updatePromises);
      await fetchUsers();
      setSelectedUsers([]);
      showSnackbar(`تم ${activate ? 'تفعيل' : 'تعطيل'} ${selectedUsers.length} مستخدم بنجاح`, 'success');
    } catch (err) {
      showSnackbar('حدث خطأ أثناء التحديث الجماعي', 'error');
    }
    setBulkMenuAnchor(null);
  };
  
  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['الاسم الأول', 'الاسم الأخير', 'البريد الإلكتروني', 'الهاتف', 'الدور', 'الحالة', 'رقم الموظف', 'القسم', 'المنصب'];
    const rows = users.map(u => [
      u.firstName,
      u.lastName,
      u.email,
      u.phone || '',
      u.role,
      u.isActive ? 'نشط' : 'غير نشط',
      u.employee?.employeeNumber || '',
      u.employee?.department?.name || '',
      u.employee?.position?.title || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showSnackbar('تم تصدير البيانات بنجاح', 'success');
  };
  
  // Password Reset
  const handlePasswordReset = (userToReset) => {
    setPasswordResetDialog({ open: true, user: userToReset });
  };
  
  const handlePasswordResetSubmit = async () => {
    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/users/${passwordResetDialog.user.id}/reset-password`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSnackbar('تم إرسال رابط إعادة تعيين كلمة المرور بنجاح', 'success');
        setPasswordResetDialog({ open: false, user: null });
      } else {
        showSnackbar(data.message || 'فشل إرسال رابط إعادة التعيين', 'error');
      }
    } catch (err) {
      showSnackbar('حدث خطأ أثناء إعادة تعيين كلمة المرور', 'error');
    }
  };
  
  // View User Details
  const handleViewUser = (userToView) => {
    setUserDetailsDialog({ open: true, user: userToView });
  };

  // Send invitation
  const handleSendInvitation = async () => {
    // Validation
    const errors = {};
    if (!inviteFormData.firstName) errors.firstName = t('users.form.firstNameRequired');
    if (!inviteFormData.lastName) errors.lastName = t('users.form.lastNameRequired');
    if (!inviteFormData.email) errors.email = t('users.form.emailRequired');
    if (!inviteFormData.role) errors.role = t('users.form.roleRequired');

    if (Object.keys(errors).length > 0) {
      setInviteFormErrors(errors);
      return;
    }

    try {
      setInviteSubmitting(true);

      const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteFormData)
      });

      const data = await response.json();

      if (data.success) {
        // Refresh invitations list
        await fetchInvitations();
        await fetchPlanLimits();

        // Close modal and reset form
        setInviteModalOpen(false);
        resetInviteForm();

        // Show success message with invitation link
        setError(null);
        
        // Show different message for existing users
        if (data.data.isExistingUser && data.data.existingUserCompanies?.length > 0) {
          const companiesList = data.data.existingUserCompanies.join('، ');
          showSnackbar(
            `✅ ${data.message}\n\n🏛️ المستخدم موجود حالياً في: ${companiesList}`,
            'info'
          );
        } else {
          showSnackbar(data.message || t('users.inviteSentSuccess') || 'تم إرسال الدعوة بنجاح', 'success');
        }
        
        // Copy invitation link to clipboard
        if (data.data.invitationLink) {
          navigator.clipboard.writeText(data.data.invitationLink);
        }
      } else {
        // Handle different error types
        if (data.error === 'LIMIT_EXCEEDED') {
          setError(`${data.message}\n\n${t('users.filters.limit')}: ${data.details.current}/${data.details.limit} ${t('users.table.user')}`);
          showSnackbar(data.message, 'error');
        } else if (data.code === 'USER_ALREADY_IN_COMPANY') {
          showSnackbar('⚠️ ' + data.message, 'warning');
        } else {
          setError(data.message || t('users.inviteError'));
          showSnackbar(data.message || t('users.inviteError'), 'error');
        }
      }
    } catch (err) {
      setError(t('users.inviteError') + ': ' + err.message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Copy invitation link
  const copyInvitationLink = (invitation) => {
    const link = `${window.location.origin}/auth/accept-invitation?token=${invitation.token}`;
    navigator.clipboard.writeText(link).then(() => {
      showSnackbar(t('users.linkCopied') || 'تم نسخ الرابط', 'success');
    }).catch(() => {
      showSnackbar('فشل نسخ الرابط', 'error');
    });
  };

  // Cancel invitation
  const handleCancelInvitation = async (invitationId) => {
    showConfirmDialog(
      'إلغاء الدعوة',
      'هل أنت متأكد من إلغاء هذه الدعوة؟ لن يتمكن المستخدم من قبولها بعد الإلغاء.',
      async () => {
        try {
          const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations/${invitationId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (data.success) {
            showSnackbar('تم إلغاء الدعوة بنجاح', 'success');
            await fetchInvitations();
          } else {
            showSnackbar(data.message || 'فشل إلغاء الدعوة', 'error');
          }
        } catch (err) {
          showSnackbar('حدث خطأ أثناء إلغاء الدعوة', 'error');
        }
      }
    );
  };

  // Resend invitation
  const handleResendInvitation = async (invitationId) => {
    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations/${invitationId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar('تم إعادة إرسال الدعوة بنجاح', 'success');
        await fetchInvitations();
      } else {
        showSnackbar(data.message || 'فشل إعادة إرسال الدعوة', 'error');
      }
    } catch (err) {
      showSnackbar('حدث خطأ أثناء إعادة إرسال الدعوة', 'error');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Check if invitation is expired
  const isInvitationExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    return roles[role]?.name || role;
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'COMPANY_ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'AGENT': return 'primary';
      default: return 'default';
    }
  };

  // Fetch users statistics
  const fetchUsersStatistics = async () => {
    if (!user?.companyId) return;
    
    try {
      setStatisticsLoading(true);
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(buildApiUrl(`companies/${user.companyId}/users/statistics?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setStatistics(data.data.statistics || []);
        setError(null);
      } else {
        setError(data.message || t('users.fetchStatsError'));
      }
    } catch (err) {
      setError(t('users.fetchDataError') + ': ' + err.message);
    } finally {
      setStatisticsLoading(false);
    }
  };

  // Fetch statistics when tab changes or date range changes
  useEffect(() => {
    if (activeTab === 1 && user?.companyId) {
      fetchUsersStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange.startDate, dateRange.endDate, user?.companyId]);

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
          <Typography variant="h4" component="h1">
            {t('users.title')}
          </Typography>
          {planLimits && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              {t('users.usageText', { current: planLimits.usage.users.current, limit: planLimits.usage.users.limit === -1 ? t('users.unlimited') : planLimits.usage.users.limit, percentage: planLimits.usage.users.percentage })}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
            disabled={!canAddUser()}
          >
            {t('users.addNewUser')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={handleInviteUser}
            disabled={!canAddUser()}
          >
            {t('users.inviteUser')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={users.length === 0}
          >
            تصدير CSV
          </Button>
        </Box>
      </Box>

      {/* Plan Limits Warning */}
      {planLimits && planLimits.usage.users.percentage >= 80 && planLimits.usage.users.limit !== -1 && (
        <Alert
          severity={planLimits.usage.users.percentage >= 95 ? 'error' : 'warning'}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {planLimits.usage.users.percentage >= 95 ? t('users.limitReachedWarning') : t('users.limitNearWarning')}
          </Typography>
          <Typography variant="body2">
            {t('users.usageText', { current: planLimits.usage.users.current, limit: planLimits.usage.users.limit, percentage: planLimits.usage.users.percentage })}
            {planLimits.usage.users.percentage >= 95
              ? t('users.upgradePlanAddMore')
              : t('users.considerUpgradeSoon')
            }
          </Typography>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={t('users.userList')} icon={<PersonIcon />} iconPosition="start" />
          <Tab 
            label={`الدعوات المعلقة ${invitations.length > 0 ? `(${invitations.length})` : ''}`} 
            icon={<MailIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Card>

      {/* Pending Invitations Tab Content */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                📧 الدعوات المعلقة ({invitations.length})
              </Typography>
              {invitationsLoading && <CircularProgress size={20} />}
            </Box>

            {invitationsLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : invitations.length === 0 ? (
              <Box textAlign="center" py={8}>
                <MailIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  لا توجد دعوات معلقة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  جميع الدعوات المرسلة تم قبولها أو انتهت صلاحيتها
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الاسم</TableCell>
                      <TableCell>البريد الإلكتروني</TableCell>
                      <TableCell>الدور</TableCell>
                      <TableCell>تاريخ الإرسال</TableCell>
                      <TableCell>تاريخ الانتهاء</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const expired = isInvitationExpired(invitation.expiresAt);
                      return (
                        <TableRow 
                          key={invitation.id}
                          sx={{ 
                            bgcolor: expired ? 'action.disabledBackground' : 'inherit',
                            opacity: expired ? 0.6 : 1
                          }}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {invitation.firstName[0]}{invitation.lastName[0]}
                              </Avatar>
                              <Typography variant="body2">
                                {invitation.firstName} {invitation.lastName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {invitation.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getRoleDisplayName(invitation.role)}
                              color={getRoleColor(invitation.role)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(invitation.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <AccessTimeIcon sx={{ fontSize: 16, color: expired ? 'error.main' : 'text.secondary' }} />
                              <Typography 
                                variant="body2" 
                                color={expired ? 'error' : 'text.secondary'}
                              >
                                {formatDate(invitation.expiresAt)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {expired ? (
                              <Chip
                                label="منتهية"
                                color="error"
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="معلقة"
                                color="warning"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center">
                              <Tooltip title="نسخ رابط الدعوة">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => copyInvitationLink(invitation)}
                                  disabled={expired}
                                >
                                  <FileDownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="إعادة إرسال الدعوة">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  disabled={expired}
                                >
                                  <MailIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="إلغاء الدعوة">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users List Tab Content */}
      {activeTab === 0 && (
        <Box>
      {/* Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">
                تم تحديد {selectedUsers.length} مستخدم
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleBulkActivate(true)}
                >
                  تفعيل
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={() => handleBulkActivate(false)}
                >
                  تعطيل
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  حذف
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedUsers([])}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  إلغاء التحديد
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('users.filters.search')}
                placeholder={t('users.filters.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchInput('')}>
                        <CloseIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('users.filters.role')}</InputLabel>
                <Select
                  value={filters.role}
                  label={t('users.filters.role')}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <MenuItem value="">{t('users.filters.all')}</MenuItem>
                  {Object.entries(roles).map(([key, role]) => (
                    <MenuItem key={key} value={key}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('users.filters.status')}</InputLabel>
                <Select
                  value={filters.isActive}
                  label={t('users.filters.status')}
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                >
                  <MenuItem value="">{t('users.filters.all')}</MenuItem>
                  <MenuItem value="true">{t('users.filters.active')}</MenuItem>
                  <MenuItem value="false">{t('users.filters.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* ✅ Employee Status Filter */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>حالة الموظف</InputLabel>
                <Select
                  value={filters.employeeStatus}
                  label="حالة الموظف"
                  onChange={(e) => handleFilterChange('employeeStatus', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="ACTIVE">نشط</MenuItem>
                  <MenuItem value="ON_LEAVE">في إجازة</MenuItem>
                  <MenuItem value="SUSPENDED">موقوف</MenuItem>
                  <MenuItem value="TERMINATED">منتهي</MenuItem>
                  <MenuItem value="RESIGNED">مستقيل</MenuItem>
                  <MenuItem value="NO_EMPLOYEE">غير موظف</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('users.filters.limit')}</InputLabel>
                <Select
                  value={limit}
                  label={t('users.filters.limit')}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {t('users.userList')} ({totalCount})
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={isSomeSelected}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>{t('users.table.user')}</TableCell>
                  <TableCell>{t('users.table.email')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('users.table.phone')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>رقم الموظف</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>القسم</TableCell>
                  <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>المنصب</TableCell>
                  <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>حالة الموظف</TableCell>
                  <TableCell>{t('users.table.role')}</TableCell>
                  <TableCell>{t('users.table.status')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('users.table.lastLogin')}</TableCell>
                  <TableCell align="center">{t('users.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id} hover selected={isSelected(userItem.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(userItem.id)}
                        onChange={() => handleSelectUser(userItem.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar src={userItem.avatar}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {userItem.firstName} {userItem.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {userItem.id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {userItem.email}
                      </Typography>
                      {userItem.isEmailVerified && (
                        <Chip
                          label={t('users.table.verified')}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">
                        {userItem.phone || '-'}
                      </Typography>
                    </TableCell>

                    {/* ✅ Employee Number */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {userItem.employee?.employeeNumber || '-'}
                      </Typography>
                    </TableCell>

                    {/* ✅ Department */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {userItem.employee?.department ? (
                        <Chip
                          label={userItem.employee.department.name}
                          size="small"
                          sx={{
                            backgroundColor: userItem.employee.department.color || 'primary.main',
                            color: 'white'
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>

                    {/* ✅ Position */}
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      <Typography variant="body2">
                        {userItem.employee?.position?.title || '-'}
                      </Typography>
                      {userItem.employee?.position?.level && (
                        <Typography variant="caption" color="text.secondary">
                          Level {userItem.employee.position.level}
                        </Typography>
                      )}
                    </TableCell>

                    {/* ✅ Employee Status */}
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      {userItem.employee ? (
                        <Chip
                          label={
                            userItem.employee.status === 'ACTIVE' ? 'نشط' :
                            userItem.employee.status === 'ON_LEAVE' ? 'في إجازة' :
                            userItem.employee.status === 'SUSPENDED' ? 'موقوف' :
                            userItem.employee.status === 'TERMINATED' ? 'منتهي' :
                            userItem.employee.status === 'RESIGNED' ? 'مستقيل' :
                            userItem.employee.status
                          }
                          size="small"
                          color={
                            userItem.employee.status === 'ACTIVE' ? 'success' :
                            userItem.employee.status === 'ON_LEAVE' ? 'warning' :
                            userItem.employee.status === 'SUSPENDED' || userItem.employee.status === 'TERMINATED' ? 'error' :
                            'default'
                          }
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getRoleDisplayName(userItem.role)}
                        color={getRoleColor(userItem.role)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={userItem.isActive ? t('users.filters.active') : t('users.filters.inactive')}
                        color={userItem.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>

                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {userItem.lastLoginAt
                          ? new Date(userItem.lastLoginAt).toLocaleDateString('ar-EG')
                          : t('users.table.neverLoggedIn')
                        }
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          size="small"
                          onClick={() => handleViewUser(userItem)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('users.actions.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(userItem)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="إعادة تعيين كلمة المرور">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handlePasswordReset(userItem)}
                        >
                          <VpnKeyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('users.actions.delete')}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(userItem)}
                            disabled={userItem.role === 'COMPANY_ADMIN' && users.filter(u => u.role === 'COMPANY_ADMIN' && u.isActive).length <= 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {t('users.noUsers')}
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
        </Box>
      )}

      {/* Add/Edit User Modal */}
      <Dialog
        open={modalOpen || editModalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditModalOpen(false);
          resetForm();
          setSelectedUser(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editModalOpen ? t('users.editUser') : t('users.addNewUser')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('users.form.firstName')}
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('users.form.lastName')}
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('users.form.email')}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={editModalOpen ? t('users.form.passwordEdit') : t('users.form.password')}
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('users.form.phone')}
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('users.form.role')}</InputLabel>
                <Select
                  value={formData.role}
                  label={t('users.form.role')}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={submitting}
                >
                  {Object.entries(roles).map(([key, role]) => (
                    <MenuItem key={key} value={key}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>القسم</InputLabel>
                <Select
                  value={formData.departmentId}
                  label="القسم"
                  onChange={(e) => handleInputChange('departmentId', e.target.value)}
                  disabled={submitting}
                >
                  <MenuItem value="">-</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>المنصب</InputLabel>
                <Select
                  value={formData.positionId}
                  label="المنصب"
                  onChange={(e) => handleInputChange('positionId', e.target.value)}
                  disabled={submitting}
                >
                  <MenuItem value="">-</MenuItem>
                  {positions.map(pos => (
                    <MenuItem key={pos.id} value={pos.id}>{pos.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تاريخ التعيين"
                type="date"
                value={formData.hireDate}
                onChange={(e) => handleInputChange('hireDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع العقد</InputLabel>
                <Select
                  value={formData.contractType}
                  label="نوع العقد"
                  onChange={(e) => handleInputChange('contractType', e.target.value)}
                  disabled={submitting}
                >
                  <MenuItem value="FULL_TIME">دوام كامل</MenuItem>
                  <MenuItem value="PART_TIME">دوام جزئي</MenuItem>
                  <MenuItem value="CONTRACT">عقد</MenuItem>
                  <MenuItem value="TEMPORARY">مؤقت</MenuItem>
                  <MenuItem value="INTERNSHIP">تدريب</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الراتب الأساسي"
                type="number"
                value={formData.baseSalary}
                onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    disabled={submitting}
                  />
                }
                label={t('users.form.active')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setModalOpen(false);
              setEditModalOpen(false);
              resetForm();
              setSelectedUser(null);
            }}
            disabled={submitting}
          >
            {t('users.actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? t('users.actions.saving') : (editModalOpen ? t('users.actions.update') : t('users.actions.create'))}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('users.inviteNewUser')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('users.form.firstName')}
                  value={inviteFormData.firstName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  error={!!inviteFormErrors.firstName}
                  helperText={inviteFormErrors.firstName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('users.form.lastName')}
                  value={inviteFormData.lastName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  error={!!inviteFormErrors.lastName}
                  helperText={inviteFormErrors.lastName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('users.form.email')}
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  error={!!inviteFormErrors.email}
                  helperText={inviteFormErrors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!inviteFormErrors.role}>
                  <InputLabel>{t('users.form.role')}</InputLabel>
                  <Select
                    value={inviteFormData.role}
                    label={t('users.form.role')}
                    onChange={(e) => setInviteFormData(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {Object.entries(roles).map(([roleKey, roleData]) => (
                      <MenuItem key={roleKey} value={roleKey}>
                        {roleData.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {inviteFormErrors.role && <FormHelperText>{inviteFormErrors.role}</FormHelperText>}
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteModalOpen(false)}>
            {t('users.actions.cancel')}
          </Button>
          <Button
            onClick={handleSendInvitation}
            variant="contained"
            disabled={inviteSubmitting}
            startIcon={inviteSubmitting ? <CircularProgress size={20} /> : <PersonIcon />}
          >
            {inviteSubmitting ? t('users.actions.saving') : t('users.actions.sendInvite')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.onConfirm) {
                confirmDialog.onConfirm();
              }
            }}
            variant="contained"
            color="error"
            autoFocus
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog
        open={passwordResetDialog.open}
        onClose={() => setPasswordResetDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من إرسال رابط إعادة تعيين كلمة المرور إلى:
            <br />
            <strong>
              {passwordResetDialog.user?.firstName} {passwordResetDialog.user?.lastName}
            </strong>
            <br />
            ({passwordResetDialog.user?.email})
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordResetDialog({ open: false, user: null })}>
            إلغاء
          </Button>
          <Button
            onClick={handlePasswordResetSubmit}
            variant="contained"
            color="warning"
          >
            إرسال رابط إعادة التعيين
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsDialog.open}
        onClose={() => setUserDetailsDialog({ open: false, user: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={userDetailsDialog.user?.avatar} sx={{ width: 56, height: 56 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {userDetailsDialog.user?.firstName} {userDetailsDialog.user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userDetailsDialog.user?.email}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    المعلومات الأساسية
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2"><strong>البريد الإلكتروني:</strong> {userDetailsDialog.user?.email}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}><strong>الهاتف:</strong> {userDetailsDialog.user?.phone || '-'}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}><strong>الدور:</strong> {getRoleDisplayName(userDetailsDialog.user?.role)}</Typography>
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span">
                        <strong>الحالة:</strong>
                      </Typography>
                      <Chip
                        label={userDetailsDialog.user?.isActive ? 'نشط' : 'غير نشط'}
                        color={userDetailsDialog.user?.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>البريد مفعّل:</strong>{' '}
                      {userDetailsDialog.user?.isEmailVerified ? 'نعم ✅' : 'لا ❌'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>آخر تسجيل دخول:</strong>{' '}
                      {userDetailsDialog.user?.lastLoginAt
                        ? new Date(userDetailsDialog.user.lastLoginAt).toLocaleString('ar-EG')
                        : 'لم يسجل دخول بعد'
                      }
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {userDetailsDialog.user?.employee && (
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      معلومات الموظف
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>رقم الموظف:</strong> {userDetailsDialog.user.employee.employeeNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>القسم:</strong> {userDetailsDialog.user.employee.department?.name || '-'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>المنصب:</strong> {userDetailsDialog.user.employee.position?.title || '-'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" component="span">
                          <strong>حالة الموظف:</strong>
                        </Typography>
                        <Chip
                          label={
                            userDetailsDialog.user.employee.status === 'ACTIVE' ? 'نشط' :
                            userDetailsDialog.user.employee.status === 'ON_LEAVE' ? 'في إجازة' :
                            userDetailsDialog.user.employee.status === 'SUSPENDED' ? 'موقوف' :
                            userDetailsDialog.user.employee.status === 'TERMINATED' ? 'منتهي' :
                            userDetailsDialog.user.employee.status === 'RESIGNED' ? 'مستقيل' :
                            userDetailsDialog.user.employee.status
                          }
                          size="small"
                          color={
                            userDetailsDialog.user.employee.status === 'ACTIVE' ? 'success' :
                            userDetailsDialog.user.employee.status === 'ON_LEAVE' ? 'warning' :
                            'default'
                          }
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    معلومات إضافية
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>تاريخ الإنشاء:</strong>{' '}
                      {userDetailsDialog.user?.createdAt
                        ? new Date(userDetailsDialog.user.createdAt).toLocaleString('ar-EG')
                        : '-'
                      }
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>آخر تحديث:</strong>{' '}
                      {userDetailsDialog.user?.updatedAt
                        ? new Date(userDetailsDialog.user.updatedAt).toLocaleString('ar-EG')
                        : '-'
                      }
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>ID:</strong> {userDetailsDialog.user?.id}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsDialog({ open: false, user: null })}>
            إغلاق
          </Button>
          <Button
            onClick={() => {
              handleEditUser(userDetailsDialog.user);
              setUserDetailsDialog({ open: false, user: null });
            }}
            variant="contained"
            startIcon={<EditIcon />}
          >
            تعديل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersManagement;
