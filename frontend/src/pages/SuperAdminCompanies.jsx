import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../utils/tokenManager';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  TablePagination,
  InputAdornment,
  TableSortLabel,
  Toolbar,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Facebook as FacebookIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Login as LoginIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  DeleteOutline as DeleteOutlineIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapHorizIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompanyId, setEditingCompanyId] = useState(null); // New state to store company ID for edit operations
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // create, edit, view
  const [submitting, setSubmitting] = useState(false);
  const [facebookPagesModalOpen, setFacebookPagesModalOpen] = useState(false);
  const [selectedCompanyPages, setSelectedCompanyPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  // Pagination & Filtering & Sorting State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPlan, setFilterPlan] = useState('ALL');
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // New State for Owner Transfer & Add Employee
  const [changeOwnerModalOpen, setChangeOwnerModalOpen] = useState(false);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false); // New state for users modal
  const [actionLoading, setActionLoading] = useState(false);
  // Users dropdown state
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [changeOwnerData, setChangeOwnerData] = useState({ newOwnerEmail: '' });
  const [addEmployeeData, setAddEmployeeData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'COMPANY_ADMIN'
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    plan: 'BASIC',
    currency: 'EGP',
    useModernAgent: false,
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('admin/companies'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setCompanies(data.data.companies);
      } else {
        setError(data.message || 'فشل في جلب الشركات');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, company) => {
    console.log('Opening menu for company:', company); // Debug log
    if (!company || !company.id) {
      console.error('Invalid company data:', company);
      setError('بيانات الشركة غير صحيحة');
      return;
    }
    setAnchorEl(event.currentTarget);
    setSelectedCompany(company);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreateCompany = () => {
    setModalType('create');
    setEditingCompanyId(null); // Reset editing company ID
    setFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      plan: 'BASIC',
      currency: 'EGP',
      useModernAgent: false,
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setModalOpen(true);
    handleMenuClose();
  };

  const handleEditCompany = () => {
    console.log('Editing company, selectedCompany:', selectedCompany); // Debug log

    if (!selectedCompany) {
      setError('لم يتم تحديد شركة للتعديل');
      handleMenuClose();
      return;
    }

    // Validate that the selected company has required properties
    if (!selectedCompany.id || !selectedCompany.name) {
      setError('بيانات الشركة غير مكتملة');
      handleMenuClose();
      return;
    }

    setModalType('edit');
    setEditingCompanyId(selectedCompany.id); // Store the company ID for edit operations
    setFormData({
      name: selectedCompany.name,
      email: selectedCompany.email,
      phone: selectedCompany.phone || '',
      website: selectedCompany.website || '',
      plan: selectedCompany.plan,
      currency: selectedCompany.currency,
      useModernAgent: selectedCompany.aiSettings?.useModernAgent || false,
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setModalOpen(true);
    handleMenuClose();
  };

  const handleViewCompany = () => {
    setModalType('view');
    setEditingCompanyId(null); // Reset editing company ID
    setModalOpen(true);
    handleMenuClose();
  };

  const onRequestDelete = () => {
    if (!selectedCompany) return;
    setDeleteModalOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        setDeleteModalOpen(false);
        return;
      }

      // Delete company
      const response = await fetch(buildApiUrl(`admin/companies/${selectedCompany.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh companies list
        await fetchCompanies();
        setError(null);
      } else {
        setError(data.message || 'فشل في حذف الشركة');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
      setSelectedCompany(null);
    }
  };

  // Sorting & Filtering Logic
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      (company.name && company.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' ? company.isActive : !company.isActive);

    const matchesPlan = filterPlan === 'ALL' || company.plan === filterPlan;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    // Handle nested properties or specific sorts
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // Handle counts
    if (orderBy === 'users') aValue = a._count?.users || 0;
    if (orderBy === 'users') bValue = b._count?.users || 0;
    if (orderBy === 'customers') aValue = a._count?.customers || 0;
    if (orderBy === 'customers') bValue = b._count?.customers || 0;
    if (orderBy === 'facebookPages') aValue = a._count?.facebookPages || 0;
    if (orderBy === 'facebookPages') bValue = b._count?.facebookPages || 0;

    if (bValue < aValue) {
      return order === 'asc' ? 1 : -1;
    }
    if (bValue > aValue) {
      return order === 'asc' ? -1 : 1;
    }
    return 0;
  });

  const paginatedCompanies = sortedCompanies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Handle Select All
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelecteds = paginatedCompanies.map((n) => n.id);
      setSelectedIds(newSelecteds);
      return;
    }
    setSelectedIds([]);
  };

  // Handle Select One
  const handleClick = (event, id) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelected = newSelected.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1),
      );
    }

    setSelectedIds(newSelected);
  };

  const isSelected = (id) => selectedIds.indexOf(id) !== -1;

  // Bulk Actions
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} شركات؟`)) return;
    }

    try {
      setBulkActionLoading(true);
      const token = localStorage.getItem('accessToken');

      let url = '';
      let method = '';
      let body = { companyIds: selectedIds };

      if (action === 'delete') {
        url = buildApiUrl('admin/companies/bulk-delete');
        method = 'POST';
      } else if (action === 'activate') {
        url = buildApiUrl('admin/companies/bulk-status');
        method = 'PUT';
        body.isActive = true;
      } else if (action === 'deactivate') {
        url = buildApiUrl('admin/companies/bulk-status');
        method = 'PUT';
        body.isActive = false;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        await fetchCompanies();
        setSelectedIds([]); // Clear selection
        setError(null);
      } else {
        setError(data.message || 'فشل في تنفيذ الإجراء الجماعي');
      }

    } catch (err) {
      console.error('Bulk action error:', err);
      setError('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export Data
  const handleExport = () => {
    // Define CSV headers
    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Website',
      'Plan',
      'Is Active',
      'Created At'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...filteredCompanies.map(company => [
        company.id,
        `"${company.name}"`,
        company.email,
        company.phone || '',
        company.website || '',
        company.plan,
        company.isActive ? 'Active' : 'Inactive',
        new Date(company.createdAt).toISOString()
      ].join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `companies_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setSubmitting(false);
        return;
      }

      // Validate that we have a selected company for edit operations
      if (modalType === 'edit') {
        if (!editingCompanyId) {
          console.error('No company ID for edit operation');
          setError('لم يتم تحديد شركة للتعديل');
          setSubmitting(false);
          return;
        }
      }

      console.log('Submitting company data:', { modalType, selectedCompany, editingCompanyId, formData }); // Debug log

      const url = modalType === 'create'
        ? buildApiUrl('admin/companies')
        : buildApiUrl(`admin/companies/${editingCompanyId}`);

      const method = modalType === 'create' ? 'POST' : 'PUT';

      const body = modalType === 'create' ? formData : {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        plan: formData.plan,
        currency: formData.currency,
        useModernAgent: formData.useModernAgent
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        await fetchCompanies();
        setModalOpen(false);
        setEditingCompanyId(null); // Reset editing company ID on successful submission
        setError(null);
      } else {
        setError(data.message || 'فشل في حفظ الشركة');
      }
    } catch (err) {
      console.error('Error submitting company:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFacebookPages = async (company) => {
    console.log('Viewing Facebook pages for company:', company); // Debug log

    // Validate company parameter
    if (!company || !company.id) {
      setError('بيانات الشركة غير صحيحة');
      return;
    }

    try {
      setLoadingPages(true);
      setError(null);
      setSelectedCompany(company);
      setFacebookPagesModalOpen(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoadingPages(false);
        return;
      }

      // جلب صفحات الفيسبوك للشركة المحددة
      console.log(`Fetching Facebook pages for company ID: ${company.id}`);
      const response = await fetch(buildApiUrl(`admin/companies/${company.id}/facebook-pages`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response body: ${errorText}`);
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Facebook pages data:', data);
      if (data.success) {
        setSelectedCompanyPages(data.data || []);
      } else {
        setSelectedCompanyPages([]);
        setError(data.message || 'فشل في جلب صفحات الفيسبوك');
      }
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      setSelectedCompanyPages([]);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleLoginAsCompanyAdmin = async (company) => {
    // Use the company parameter passed to the function instead of selectedCompany
    if (!company) {
      setError('لم يتم تحديد شركة');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      // طلب تسجيل الدخول كأدمن الشركة
      const response = await fetch(buildApiUrl(`admin/companies/${company.id}/login-as-admin`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // ✅ Save Super Admin context before switching
        localStorage.setItem('superAuth', token);
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          localStorage.setItem('superUser', currentUser);
        }

        // حفظ بيانات تسجيل الدخول الجديدة - using tokenManager to update both session and local storage
        tokenManager.setAccessToken(data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // إعادة توجيه إلى لوحة تحكم الشركة
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'فشل في تسجيل الدخول كأدمن الشركة');
      }
    } catch (err) {
      console.error('Error logging in as company admin:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
      handleMenuClose();
    }

  };

  const handleViewUsers = (company) => {
    if (!company) return;
    setSelectedCompany(company);
    setUsersModalOpen(true);
    fetchCompanyUsers(company.id);
    handleMenuClose();
  };

  const handleDeleteUser = async (userId) => {
    if (!selectedCompany) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`admin/companies/${selectedCompany.id}/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Refresh users list
        await fetchCompanyUsers(selectedCompany.id);
        alert('تم حذف العضو بنجاح');
      } else {
        alert(data.message || 'فشل في حذف العضو');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('حدث خطأ أثناء حذف العضو');
    } finally {
      setActionLoading(false);
    }
  };

  // --- New Handlers for Owner Transfer & Add Employee ---



  const fetchCompanyUsers = async (companyId) => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`admin/companies/${companyId}/users`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        // Filter out the current user (admin) if needed, but usually good to show all
        setCompanyUsers(data.data.users || []);
      } else {
        console.error('Failed to fetch users:', data.message);
        setCompanyUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setCompanyUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenChangeOwner = () => {
    if (!selectedCompany) return;
    setChangeOwnerData({ targetUserId: '' }); // Reset selection
    setChangeOwnerModalOpen(true);
    handleMenuClose();
    // Fetch users for the dropdown
    fetchCompanyUsers(selectedCompany.id);
  };

  const handleOpenAddEmployee = () => {
    if (!selectedCompany) return;
    setAddEmployeeData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'COMPANY_ADMIN'
    });
    setAddEmployeeModalOpen(true);
    handleMenuClose();
  };

  const handleSubmitChangeOwner = async () => {
    if (!selectedCompany) return;
    if (!changeOwnerData.targetUserId) {
      setError('الرجاء اختيار المالك الجديد');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl(`admin/companies/${selectedCompany.id}/transfer-ownership`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: changeOwnerData.targetUserId })
      });

      const data = await response.json();

      if (data.success) {
        setChangeOwnerModalOpen(false);
        await fetchCompanies(); // Refresh list to see updates
        alert('تم نقل الملكية بنجاح');
      } else {
        setError(data.message || 'فشل في نقل الملكية');
      }
    } catch (err) {
      console.error('Error transferring ownership:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAddEmployee = async () => {
    if (!selectedCompany) return;
    const { firstName, lastName, email, password } = addEmployeeData;
    if (!firstName || !lastName || !email || !password) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl(`admin/companies/${selectedCompany.id}/employees`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addEmployeeData)
      });

      const data = await response.json();

      if (data.success) {
        setAddEmployeeModalOpen(false);
        await fetchCompanies(); // Refresh list if needed (e.g. user count)
        alert('تم إضافة الموظف بنجاح');
      } else {
        setError(data.message || 'فشل في إضافة الموظف');
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'BASIC': return 'info';
      case 'PRO': return 'warning';
      case 'ENTERPRISE': return 'success';
      default: return 'default';
    }
  };

  const getPlanName = (plan) => {
    switch (plan) {
      case 'BASIC': return 'أساسي';
      case 'PRO': return 'احترافي';
      case 'ENTERPRISE': return 'مؤسسي';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل الشركات...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            إدارة الشركات
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة جميع الشركات في النظام
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={filteredCompanies.length === 0}
          >
            تصدير البيانات
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCompany}
          >
            إضافة شركة جديدة
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters & Search Toolbar */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="بحث باسم الشركة أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                label="الحالة"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="ALL">الكل</MenuItem>
                <MenuItem value="ACTIVE">نشط</MenuItem>
                <MenuItem value="INACTIVE">غير نشط</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الخطة</InputLabel>
              <Select
                value={filterPlan}
                label="الخطة"
                onChange={(e) => setFilterPlan(e.target.value)}
              >
                <MenuItem value="ALL">الكل</MenuItem>
                <MenuItem value="BASIC">أساسي</MenuItem>
                <MenuItem value="PRO">احترافي</MenuItem>
                <MenuItem value="ENTERPRISE">مؤسسي</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" justifyContent="flex-end">
              <Typography variant="body2" color="text.secondary">
                النتائج: {filteredCompanies.length}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Bulk Actions Toolbar */}
      {
        selectedIds.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'primary.light',
              color: 'primary.contrastText'
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              تم تحديد {selectedIds.length} عنصر
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="تفعيل المحدد">
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                >
                  تفعيل
                </Button>
              </Tooltip>
              <Tooltip title="تعطيل المحدد">
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  startIcon={<BlockIcon />}
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                >
                  تعطيل
                </Button>
              </Tooltip>
              <Tooltip title="حذف المحدد">
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionLoading}
                >
                  حذف
                </Button>
              </Tooltip>
              <IconButton size="small" onClick={() => setSelectedIds([])} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Paper>
        )
      }

      {/* Companies Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < paginatedCompanies.length}
                      checked={paginatedCompanies.length > 0 && selectedIds.length === paginatedCompanies.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      اسم الشركة
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'email'}
                      direction={orderBy === 'email' ? order : 'asc'}
                      onClick={() => handleRequestSort('email')}
                    >
                      البريد الإلكتروني
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'plan'}
                      direction={orderBy === 'plan' ? order : 'asc'}
                      onClick={() => handleRequestSort('plan')}
                    >
                      الخطة
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'users'}
                      direction={orderBy === 'users' ? order : 'asc'}
                      onClick={() => handleRequestSort('users')}
                    >
                      المستخدمين
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'customers'}
                      direction={orderBy === 'customers' ? order : 'asc'}
                      onClick={() => handleRequestSort('customers')}
                    >
                      العملاء
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'facebookPages'}
                      direction={orderBy === 'facebookPages' ? order : 'asc'}
                      onClick={() => handleRequestSort('facebookPages')}
                    >
                      صفحات الفيسبوك
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'isActive'}
                      direction={orderBy === 'isActive' ? order : 'asc'}
                      onClick={() => handleRequestSort('isActive')}
                    >
                      الحالة
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <BusinessIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          لا توجد شركات
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          جرب تغيير فلاتر البحث أو أضف شركة جديدة
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      hover
                      selected={isSelected(company.id)}
                      onClick={(event) => handleClick(event, company.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected(company.id)} />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <BusinessIcon color="action" fontSize="small" />
                          <Typography variant="body2" fontWeight={500}>
                            {company.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getPlanName(company.plan)}
                          color={getPlanColor(company.plan)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{company._count?.users || 0}</TableCell>
                      <TableCell>{company._count?.customers || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={company._count?.facebookPages || 0}
                          color={company._count?.facebookPages > 0 ? 'primary' : 'default'}
                          size="small"
                          onClick={() => handleViewFacebookPages(company)}
                          sx={{ cursor: 'pointer' }}
                          variant={company._count?.facebookPages > 0 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={company.isActive ? 'نشط' : 'غير نشط'}
                          color={company.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            handleMenuOpen(e, company);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredCompanies.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="الصفوف في الصفحة:"
            labelDisplayedRows={({ from, to, count }) => `${from} - ${to} من ${count}`}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon />
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من رغبتك في حذف شركة <strong>{selectedCompany?.name}</strong>؟
            <br />
            <Typography variant="caption" color="error">
              لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع البيانات المرتبطة بالشركة.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>إلغاء</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" autoFocus>
            حذف نهائي
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleViewCompany();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={() => {
          handleEditCompany();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem onClick={() => handleViewUsers(selectedCompany)}>
          <GroupIcon sx={{ mr: 1 }} />
          مشاهدة الأعضاء
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleOpenChangeOwner}>
          <SwapHorizIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography color="warning.main">نقل الملكية</Typography>
        </MenuItem>

        <MenuItem onClick={handleOpenAddEmployee}>
          <PersonAddIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography color="info.main">إضافة موظف</Typography>
        </MenuItem>

        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedCompany) {
              const company = selectedCompany; // Capture the company before closing menu
              handleMenuClose(); // Close menu first
              handleLoginAsCompanyAdmin(company); // Then proceed with login
            } else {
              setError('لم يتم تحديد شركة');
              handleMenuClose();
            }
          }}
          sx={{ color: 'primary.main' }}
          disabled={!selectedCompany}
        >
          <LoginIcon sx={{ mr: 1 }} />
          دخول كأدمن الشركة
        </MenuItem>
        <MenuItem
          onClick={() => {
            onRequestDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Company Modal */}
      <Dialog open={modalOpen} onClose={() => {
        setModalOpen(false);
        setEditingCompanyId(null); // Reset editing company ID when modal is closed
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          {modalType === 'create' && 'إضافة شركة جديدة'}
          {modalType === 'edit' && 'تعديل الشركة'}
          {modalType === 'view' && 'تفاصيل الشركة'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="اسم الشركة"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={modalType === 'view'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={modalType === 'view'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>الخطة</InputLabel>
                  <Select
                    value={formData.plan}
                    label="الخطة"
                    onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                    disabled={modalType === 'view'}
                  >
                    <MenuItem value="BASIC">أساسي</MenuItem>
                    <MenuItem value="PRO">احترافي</MenuItem>
                    <MenuItem value="ENTERPRISE">مؤسسي</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>العملة</InputLabel>
                  <Select
                    value={formData.currency}
                    label="العملة"
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    disabled={modalType === 'view'}
                  >
                    <MenuItem value="EGP">جنيه مصري</MenuItem>
                    <MenuItem value="USD">دولار أمريكي</MenuItem>
                    <MenuItem value="EUR">يورو</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {modalType === 'edit' && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useModernAgent}
                        onChange={(e) => setFormData(prev => ({ ...prev, useModernAgent: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          🚀 نظام AI الحديث (Function Calling)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formData.useModernAgent
                            ? '✅ تم التفعيل - يستخدم Function Calling (2026)'
                            : '🕰️ معطل - يستخدم النظام القديم (2023)'}
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              )}

              {modalType === 'create' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                      بيانات مدير الشركة
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأول للمدير"
                      value={formData.adminFirstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأخير للمدير"
                      value={formData.adminLastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="بريد المدير الإلكتروني"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="كلمة مرور المدير"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>
            إلغاء
          </Button>
          {modalType !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Facebook Pages Modal */}
      <Dialog
        open={facebookPagesModalOpen}
        onClose={() => setFacebookPagesModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <FacebookIcon color="primary" />
            صفحات الفيسبوك - {selectedCompany?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPages ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>جاري تحميل صفحات الفيسبوك...</Typography>
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              {selectedCompanyPages.length === 0 ? (
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  لا توجد صفحات فيسبوك مربوطة بهذه الشركة
                </Typography>
              ) : (
                <List>
                  {selectedCompanyPages.map((page, index) => (
                    <React.Fragment key={page.id}>
                      <ListItem>
                        <ListItemIcon>
                          {page.status === 'connected' || page.status === 'active' ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <ErrorIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6">{page.pageName}</Typography>
                              <Chip
                                label={page.status === 'connected' || page.status === 'active' ? 'متصل' : 'غير متصل'}
                                color={page.status === 'connected' || page.status === 'active' ? 'success' : 'error'}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>معرف الصفحة:</strong> {page.pageId}
                              </Typography>
                              {page.connectedAt && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>تاريخ الربط:</strong> {new Date(page.connectedAt).toLocaleDateString('ar-EG')}
                                </Typography>
                              )}
                              {page.updatedAt && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>آخر نشاط:</strong> {new Date(page.updatedAt).toLocaleDateString('ar-EG')}
                                </Typography>
                              )}
                              {page.messageCount !== undefined && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>عدد الرسائل:</strong> {page.messageCount}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < selectedCompanyPages.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFacebookPagesModalOpen(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Owner Modal */}
      <Dialog open={changeOwnerModalOpen} onClose={() => setChangeOwnerModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="warning" />
          نقل ملكية الشركة: {selectedCompany?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Alert severity="warning" sx={{ mb: 3 }}>
              تحذير: هذا الإجراء سيقوم بنقل صلاحيات "المالك" إلى المستخدم الجديد، وسيتم تخفيض رتبة المالك الحالي إلى "مدير شركة".
            </Alert>

            <FormControl fullWidth disabled={loadingUsers}>
              <InputLabel>اختر المالك الجديد</InputLabel>
              <Select
                value={changeOwnerData.targetUserId || ''}
                label="اختر المالك الجديد"
                onChange={(e) => setChangeOwnerData({ targetUserId: e.target.value })}
                startAdornment={
                  loadingUsers ? (
                    <InputAdornment position="start">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null
                }
              >
                {companyUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body1">
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email} - ({user.role})
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                {!loadingUsers && companyUsers.length === 0 && (
                  <MenuItem disabled value="">
                    لا يوجد موظفين مؤهلين
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeOwnerModalOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSubmitChangeOwner}
            variant="contained"
            color="warning"
            disabled={actionLoading || !changeOwnerData.targetUserId}
          >
            {actionLoading ? 'جاري النقل...' : 'تأكيد النقل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Modal */}
      <Dialog open={addEmployeeModalOpen} onClose={() => setAddEmployeeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="info" />
          إضافة موظف لشركة: {selectedCompany?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الاسم الأول"
                  value={addEmployeeData.firstName}
                  onChange={(e) => setAddEmployeeData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الاسم الأخير"
                  value={addEmployeeData.lastName}
                  onChange={(e) => setAddEmployeeData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={addEmployeeData.email}
                  onChange={(e) => setAddEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="كلمة المرور"
                  type="password"
                  value={addEmployeeData.password}
                  onChange={(e) => setAddEmployeeData(prev => ({ ...prev, password: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>الصلاحية</InputLabel>
                  <Select
                    value={addEmployeeData.role}
                    label="الصلاحية"
                    onChange={(e) => setAddEmployeeData(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <MenuItem value="COMPANY_ADMIN">مدير شركة (Company Admin)</MenuItem>
                    <MenuItem value="MANAGER">مدير (Manager)</MenuItem>
                    <MenuItem value="AGENT">عميل (Agent)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEmployeeModalOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSubmitAddEmployee}
            variant="contained"
            color="info"
            disabled={actionLoading}
          >
            {actionLoading ? 'جاري الإضافة...' : 'إضافة الموظف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Users List Modal */}
      <Dialog
        open={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          أعضاء شركة {selectedCompany?.name}
        </DialogTitle>
        <DialogContent dividers>
          {loadingUsers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>البريد الإلكتروني</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companyUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        لا يوجد أعضاء في هذه الشركة
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.firstName} {user.lastName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role === 'OWNER' ? 'مالك' : (user.role === 'COMPANY_ADMIN' ? 'مدير' : 'موظف')}
                            color={user.role === 'OWNER' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Chip label="نشط" color="success" size="small" variant="outlined" />
                          ) : (
                            <Chip label="غير نشط" color="error" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="حذف العضو">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading || user.role === 'OWNER'}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsersModalOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default SuperAdminCompanies;