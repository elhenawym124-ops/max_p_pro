import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Grid,
  Badge,
  Tabs,
  Tab,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

const WalletManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    icon: '',
    color: '#000000'
  });

  // Company Wallets State
  const [companyWallets, setCompanyWallets] = useState([]);
  const [filteredWallets, setFilteredWallets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [fundsData, setFundsData] = useState({
    amount: '',
    bonus: '',
    notes: ''
  });

  useEffect(() => {
    if (activeTab === 0) fetchWalletNumbers();
    if (activeTab === 1) fetchPendingReceipts();
    if (activeTab === 2) fetchCompanyWallets();
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWallets(companyWallets);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = companyWallets.filter(wallet =>
        wallet.companyName.toLowerCase().includes(lowerQuery) ||
        wallet.companyEmail.toLowerCase().includes(lowerQuery)
      );
      setFilteredWallets(filtered);
    }
  }, [searchQuery, companyWallets]);

  const fetchWalletNumbers = async () => {
    try {
      const response = await apiClient.get('/wallet-payment/admin/wallet-numbers');

      if (response.data.success) {
        setWalletNumbers(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب أرقام المحافظ:', error);
    }
  };

  const fetchPendingReceipts = async () => {
    try {
      const response = await apiClient.get('/wallet-payment/admin/pending-receipts');

      if (response.data.success) {
        setPendingReceipts(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب الإيصالات:', error);
    }
  };

  const fetchCompanyWallets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/wallet/companies');
      if (response.data.success) {
        setCompanyWallets(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب محافظ الشركات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFundsSubmit = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      const payload = {
        companyId: selectedCompany.companyId,
        amount: parseFloat(fundsData.amount),
        bonus: fundsData.bonus ? parseFloat(fundsData.bonus) : 0,
        notes: fundsData.notes
      };

      await apiClient.post('/admin/wallet/add-funds', payload);

      setAddFundsDialogOpen(false);
      setFundsData({ amount: '', bonus: '', notes: '' });
      fetchCompanyWallets();
      alert('تم إضافة الرصيد بنجاح');
    } catch (error) {
      console.error('خطأ في إضافة الرصيد:', error);
      alert('فشل في إضافة الرصيد');
    } finally {
      setLoading(false);
    }
  };

  const openAddFundsDialog = (company) => {
    setSelectedCompany(company);
    setFundsData({ amount: '', bonus: '', notes: '' });
    setAddFundsDialogOpen(true);
  };

  const handleSaveWallet = async () => {
    try {
      setLoading(true);
      if (editingWallet) {
        await apiClient.put(`/wallet-payment/admin/wallet-numbers/${editingWallet.id}`, formData);
      } else {
        await apiClient.post('/wallet-payment/admin/wallet-numbers', formData);
      }

      setDialogOpen(false);
      setEditingWallet(null);
      setFormData({ name: '', number: '', icon: '', color: '#000000' });
      fetchWalletNumbers();
    } catch (error) {
      console.error('خطأ في حفظ المحفظة:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      const wallet = walletNumbers.find(w => w.id === id);
      await apiClient.put(`/wallet-payment/admin/wallet-numbers/${id}`, {
        ...wallet,
        isActive: !isActive
      });
      fetchWalletNumbers();
    } catch (error) {
      console.error('خطأ في تحديث حالة المحفظة:', error);
    }
  };

  const handleDeleteWallet = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المحفظة؟')) {
      try {
        await apiClient.delete(`/wallet-payment/admin/wallet-numbers/${id}`);
        fetchWalletNumbers();
      } catch (error) {
        console.error('خطأ في حذف المحفظة:', error);
      }
    }
  };

  const handleReviewReceipt = async (receiptId, action, notes = '') => {
    try {
      await apiClient.post(`/wallet-payment/admin/review-receipt/${receiptId}`, {
        action,
        notes
      });

      setReceiptDialogOpen(false);
      setSelectedReceipt(null);
      fetchPendingReceipts();
    } catch (error) {
      console.error('خطأ في مراجعة الإيصال:', error);
    }
  };

  const openEditDialog = (wallet = null) => {
    if (wallet) {
      setEditingWallet(wallet);
      setFormData({
        name: wallet.name,
        number: wallet.number,
        icon: wallet.icon,
        color: wallet.color
      });
    } else {
      setEditingWallet(null);
      setFormData({ name: '', number: '', icon: '', color: '#000000' });
    }
    setDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        💳 إدارة المحافظ والمدفوعات
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="أرقام المحافظ" />
        <Tab
          label={
            <Badge badgeContent={pendingReceipts.length} color="error">
              الإيصالات المعلقة
            </Badge>
          }
        />
        <Tab label="محافظ الشركات" />
      </Tabs>

      {/* تبويب أرقام المحافظ */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">أرقام المحافظ</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openEditDialog()}
              >
                إضافة محفظة جديدة
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المحفظة</TableCell>
                    <TableCell>الرقم</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تاريخ الإضافة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletNumbers.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <span style={{ marginRight: 8 }}>{wallet.icon}</span>
                          <Typography variant="body2" fontWeight="bold">
                            {wallet.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {wallet.number}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={wallet.isActive ? 'نشط' : 'غير نشط'}
                          color={wallet.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(wallet.createdAt)}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEditDialog(wallet)}>
                          <EditIcon />
                        </IconButton>
                        <Switch
                          checked={wallet.isActive}
                          onChange={(e) => handleToggleActive(wallet.id, e.target.checked)}
                          color="primary"
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteWallet(wallet.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* تبويب الإيصالات المعلقة */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              الإيصالات المعلقة
            </Typography>

            {pendingReceipts.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                لا توجد إيصالات معلقة
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الشركة</TableCell>
                      <TableCell>الفاتورة</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>المحفظة</TableCell>
                      <TableCell>تاريخ الإرسال</TableCell>
                      <TableCell>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {receipt.invoice.company.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {receipt.invoice.company.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {receipt.invoice.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {formatCurrency(receipt.invoice.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {receipt.walletNumber.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {receipt.walletNumber.number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {formatDate(receipt.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setReceiptDialogOpen(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* تبويب محافظ الشركات */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">أرصدة الشركات</Typography>
              <TextField
                size="small"
                placeholder="بحث عن شركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الشركة</TableCell>
                    <TableCell>الرصيد الحالي</TableCell>
                    <TableCell>إجمالي الإيداع</TableCell>
                    <TableCell>العملة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.companyId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {wallet.companyName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {wallet.companyEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold" color={wallet.balance > 0 ? "success.main" : "text.primary"}>
                          {formatCurrency(wallet.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(wallet.totalDeposited)}
                      </TableCell>
                      <TableCell>
                        {wallet.currency}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<MoneyIcon />}
                          onClick={() => openAddFundsDialog(wallet)}
                        >
                          إضافة رصيد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWallets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        لا توجد نتائج
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog for Adding Funds */}
      <Dialog open={addFundsDialogOpen} onClose={() => setAddFundsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          إضافة رصيد - {selectedCompany?.companyName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المبلغ"
                type="number"
                value={fundsData.amount}
                onChange={(e) => setFundsData(prev => ({ ...prev, amount: e.target.value }))}
                required
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="بونص (إضافي)"
                type="number"
                value={fundsData.bonus}
                onChange={(e) => setFundsData(prev => ({ ...prev, bonus: e.target.value }))}
                helperText="مبلغ إضافي يضاف للرصيد كهدية (اختياري)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={3}
                value={fundsData.notes}
                onChange={(e) => setFundsData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFundsDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleAddFundsSubmit} variant="contained" color="success" disabled={loading || !fundsData.amount}>
            {loading ? 'جاري الإضافة...' : 'تأكيد إضافة الرصيد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for adding/editing wallet */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingWallet ? 'تعديل المحفظة' : 'إضافة محفظة جديدة'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المحفظة"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم المحفظة"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رمز المحفظة (رمز تعبيري)"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اللون"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveWallet} variant="contained" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for reviewing receipt */}
      <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>مراجعة الإيصال</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الشركة</Typography>
                <Typography variant="body1">{selectedReceipt.invoice.company.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedReceipt.invoice.company.email}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الفاتورة</Typography>
                <Typography variant="body1">{selectedReceipt.invoice.invoiceNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المبلغ</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedReceipt.invoice.totalAmount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المحفظة</Typography>
                <Typography variant="body1">{selectedReceipt.walletNumber.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedReceipt.walletNumber.number}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">تاريخ الإرسال</Typography>
                <Typography variant="body1">{formatDate(selectedReceipt.submittedAt)}</Typography>
              </Grid>
              {selectedReceipt.receiptImage && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">صورة الإيصال</Typography>
                  <img
                    src={selectedReceipt.receiptImage}
                    alt="إيصال الدفع"
                    style={{ maxWidth: '100%', height: 'auto', marginTop: 8 }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => handleReviewReceipt(selectedReceipt?.id, 'reject')}
            variant="outlined"
            color="error"
          >
            رفض
          </Button>
          <Button
            onClick={() => handleReviewReceipt(selectedReceipt?.id, 'approve')}
            variant="contained"
            color="primary"
          >
            موافقة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletManagement;