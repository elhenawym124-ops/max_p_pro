import React, { useState, useEffect } from 'react';
import {
  Box,
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
  IconButton,
  Chip,
  Typography,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  supplier: {
    id: string;
    name: string;
  };
  _count: {
    items: number;
    payments: number;
  };
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  PARTIALLY_PAID: 'info',
  PAID: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default'
};

const statusLabels: Record<string, string> = {
  PENDING: 'في انتظار الدفع',
  PARTIALLY_PAID: 'مدفوع جزئياً',
  PAID: 'مدفوع بالكامل',
  OVERDUE: 'متأخر',
  CANCELLED: 'ملغي'
};

const PurchaseInvoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInvoices();
  }, [page, searchTerm, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/procurement/purchase-invoices', {
        params: { page, limit: 20, search: searchTerm, status: statusFilter }
      });
      setInvoices(response.data.invoices);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">فواتير الموردين</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/procurement/purchase-invoices/new')}
        >
          إنشاء فاتورة جديدة
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="البحث عن فاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              select
              label="الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم الفاتورة</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell>تاريخ الفاتورة</TableCell>
              <TableCell>تاريخ الاستحقاق</TableCell>
              <TableCell>المبلغ الإجمالي</TableCell>
              <TableCell>المبلغ المدفوع</TableCell>
              <TableCell>المبلغ المتبقي</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.supplier.name}</TableCell>
                <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString('ar-EG')}</TableCell>
                <TableCell>
                  {invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString('ar-EG')
                    : '-'}
                </TableCell>
                <TableCell>{Number(invoice.totalAmount).toFixed(2)} EGP</TableCell>
                <TableCell>{Number(invoice.paidAmount).toFixed(2)} EGP</TableCell>
                <TableCell>{Number(invoice.remainingAmount).toFixed(2)} EGP</TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[invoice.status]}
                    color={statusColors[invoice.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/procurement/purchase-invoices/${invoice.id}`)}
                    title="عرض التفاصيل"
                  >
                    <ViewIcon />
                  </IconButton>
                  {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/procurement/supplier-payments/new?invoiceId=${invoice.id}`)}
                      title="تسجيل دفعة"
                      color="primary"
                    >
                      <PaymentIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default PurchaseInvoices;
