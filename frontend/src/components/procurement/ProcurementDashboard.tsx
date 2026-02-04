import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ShoppingCart as OrderIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  People as SupplierIcon
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

interface DashboardData {
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchaseOrders: number;
    pendingOrders: number;
    totalInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalPayments: number;
    totalPurchaseAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
  topSuppliers: Array<{
    id: string;
    name: string;
    currentBalance: number;
    _count: {
      purchaseOrders: number;
      purchaseInvoices: number;
    };
  }>;
  recentOrders: Array<any>;
  recentInvoices: Array<any>;
  recentPayments: Array<any>;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ProcurementDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/procurement/reports/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <Box sx={{ p: 3 }}>{t('procurement.dashboard.loading')}</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('procurement.dashboard.title')}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('procurement.dashboard.totalSuppliers')}
            value={data.summary.totalSuppliers}
            icon={<SupplierIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('procurement.dashboard.purchaseOrders')}
            value={data.summary.totalPurchaseOrders}
            icon={<OrderIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('procurement.dashboard.pendingInvoices')}
            value={data.summary.pendingInvoices}
            icon={<InvoiceIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('procurement.dashboard.totalPayments')}
            value={data.summary.totalPayments}
            icon={<PaymentIcon />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.totalPurchases')}
              </Typography>
              {Number(data.summary.totalPurchaseAmount).toFixed(2)} {t('dashboard.egp')}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.totalPaid')}
              </Typography>
              {Number(data.summary.totalPaidAmount).toFixed(2)} {t('dashboard.egp')}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.pendingAmount')}
              </Typography>
              {Number(data.summary.totalPendingAmount).toFixed(2)} {t('dashboard.egp')}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.topSuppliers')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('procurement.dashboard.supplier')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.orders')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.invoices')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.balance')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell align="right">{supplier._count.purchaseOrders}</TableCell>
                        <TableCell align="right">{supplier._count.purchaseInvoices}</TableCell>
                        <TableCell align="right">
                          {Number(supplier.currentBalance).toFixed(2)} {t('dashboard.egp')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.recentPurchaseOrders')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('procurement.dashboard.orderNumber')}</TableCell>
                      <TableCell>{t('procurement.dashboard.supplier')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.amount')}</TableCell>
                      <TableCell>{t('procurement.dashboard.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell align="right">
                          {order.totalAmount.toFixed(2)} {t('dashboard.egp')}
                        </TableCell>
                        <TableCell>
                          <Chip label={order.status} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('procurement.dashboard.recentInvoices')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('procurement.dashboard.invoiceNumber')}</TableCell>
                      <TableCell>{t('procurement.dashboard.supplier')}</TableCell>
                      <TableCell>{t('procurement.dashboard.date')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.totalAmount')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.paid')}</TableCell>
                      <TableCell align="right">{t('procurement.dashboard.remaining')}</TableCell>
                      <TableCell>{t('procurement.dashboard.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.supplier.name}</TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate).toLocaleDateString(i18n.language)}
                        </TableCell>
                        <TableCell align="right">
                          {invoice.totalAmount.toFixed(2)} {t('dashboard.egp')}
                        </TableCell>
                        <TableCell align="right">
                          {invoice.paidAmount.toFixed(2)} {t('dashboard.egp')}
                        </TableCell>
                        <TableCell align="right">
                          {invoice.remainingAmount.toFixed(2)} {t('dashboard.egp')}
                        </TableCell>
                        <TableCell>
                          <Chip label={invoice.status} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProcurementDashboard;
