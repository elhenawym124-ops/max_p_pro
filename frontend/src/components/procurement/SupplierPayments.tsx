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
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  supplier: {
    id: string;
    name: string;
  };
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
  };
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'نقدي',
  BANK_TRANSFER: 'تحويل بنكي',
  CHECK: 'شيك',
  CREDIT_CARD: 'بطاقة ائتمان',
  OTHER: 'أخرى'
};

const SupplierPayments: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPayments();
  }, [page, searchTerm, methodFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/procurement/supplier-payments', {
        params: { page, limit: 20, search: searchTerm, paymentMethod: methodFilter }
      });
      setPayments(response.data.payments);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">إدارة المدفوعات</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/procurement/supplier-payments/new')}
        >
          تسجيل دفعة جديدة
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="البحث عن دفعة..."
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
              label="طريقة الدفع"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
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
              <TableCell>رقم الدفعة</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell>رقم الفاتورة</TableCell>
              <TableCell>تاريخ الدفع</TableCell>
              <TableCell>المبلغ</TableCell>
              <TableCell>طريقة الدفع</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.paymentNumber}</TableCell>
                <TableCell>{payment.supplier.name}</TableCell>
                <TableCell>
                  {payment.purchaseInvoice?.invoiceNumber || 'دفعة مقدمة'}
                </TableCell>
                <TableCell>{new Date(payment.paymentDate).toLocaleDateString('ar-EG')}</TableCell>
                <TableCell>{Number(payment.amount).toFixed(2)} EGP</TableCell>
                <TableCell>
                  <Chip
                    label={paymentMethodLabels[payment.paymentMethod]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/procurement/supplier-payments/${payment.id}`)}
                    title="عرض التفاصيل"
                  >
                    <ViewIcon />
                  </IconButton>
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

export default SupplierPayments;
