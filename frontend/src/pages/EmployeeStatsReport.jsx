import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
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
  CircularProgress,
  Avatar,
  Grid,
  TextField,
  Button,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../hooks/useAuthSimple';
import { getApiUrl } from '../config/environment';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const EmployeeStatsReport = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // الافتراضي: اليوم
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // دالة لحساب الفترة الزمنية بناءً على الاختيار
  const calculateDateRange = (period) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      
      case 'yesterday':
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        startDate = last7.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        startDate = last30.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      
      case 'thisMonth':
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = firstDayThisMonth.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      
      case 'lastMonth':
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = firstDayLastMonth.toISOString().split('T')[0];
        endDate = lastDayLastMonth.toISOString().split('T')[0];
        break;
      
      case 'custom':
        // سيتم استخدام التواريخ المخصصة من المستخدم
        return dateRange;
      
      default:
        startDate = endDate = today.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  // تحديث الفترة عند تغيير الاختيار
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      const newRange = calculateDateRange(period);
      setDateRange(newRange);
    }
  };

  const fetchStatistics = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`${getApiUrl()}/companies/${user.companyId}/users/statistics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setStatistics(data.data.statistics || []);
      } else {
        setError(data.message || 'فشل في جلب الإحصائيات');
      }
    } catch (err) {
      setError('حدث خطأ أثناء جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchStatistics();
    }
  }, [user?.companyId, selectedPeriod]);

  // تحديث الفترة الزمنية عند تغيير الاختيار
  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const newRange = calculateDateRange(selectedPeriod);
      setDateRange(newRange);
    }
  }, [selectedPeriod]);

  const getRoleDisplayName = (role) => {
    const roleMap = {
      SUPER_ADMIN: 'سوبر أدمن',
      COMPANY_ADMIN: 'مدير الشركة',
      OWNER: 'مالك',
      MANAGER: 'مدير',
      EMPLOYEE: 'موظف',
      AGENT: 'مسوق'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role) => {
    const colorMap = {
      SUPER_ADMIN: 'error',
      COMPANY_ADMIN: 'primary',
      OWNER: 'secondary',
      MANAGER: 'info',
      EMPLOYEE: 'default',
      AGENT: 'success'
    };
    return colorMap[role] || 'default';
  };

  if (loading && statistics.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          📊 تقارير أداء الموظفين
        </Typography>
        <Typography variant="body2" color="text.secondary">
          إحصائيات أداء الموظفين في الرد على رسائل الفيسبوك
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.light' }}>
          <CardContent>
            <Typography color="error.dark">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Date Range Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="الفترة الزمنية"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
              >
                <MenuItem value="today">اليوم</MenuItem>
                <MenuItem value="yesterday">أمس</MenuItem>
                <MenuItem value="last7days">آخر 7 أيام</MenuItem>
                <MenuItem value="last30days">آخر 30 يوم</MenuItem>
                <MenuItem value="thisMonth">الشهر الحالي</MenuItem>
                <MenuItem value="lastMonth">الشهر السابق</MenuItem>
                <MenuItem value="custom">فترة مخصصة</MenuItem>
              </TextField>
            </Grid>
            
            {selectedPeriod === 'custom' && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="من تاريخ"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="إلى تاريخ"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} md={selectedPeriod === 'custom' ? 3 : 9}>
              <Button
                fullWidth
                variant="contained"
                onClick={fetchStatistics}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
              >
                {loading ? 'جاري التحميل...' : 'تحديث الإحصائيات'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {statistics.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي الموظفين
                </Typography>
                <Typography variant="h3" color="primary">
                  {statistics.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي المحادثات
                </Typography>
                <Typography variant="h3" color="info.main">
                  {statistics.reduce((sum, stat) => sum + stat.conversationsCount, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي الطلبات
                </Typography>
                <Typography variant="h3" color="success.main">
                  {statistics.reduce((sum, stat) => sum + (stat.ordersCount || 0), 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  متوسط نسبة التحويل
                </Typography>
                <Typography variant="h3" color="warning.main">
                  {statistics.length > 0 
                    ? (statistics.reduce((sum, stat) => sum + (stat.conversionRate || 0), 0) / statistics.length).toFixed(1)
                    : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Statistics Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              إحصائيات الموظفين ({statistics.length})
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : statistics.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                لا توجد إحصائيات متاحة للفترة المحددة
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الموظف</TableCell>
                    <TableCell align="center">عدد المحادثات</TableCell>
                    <TableCell align="center">عدد الرسائل</TableCell>
                    <TableCell align="center">عدد الطلبات</TableCell>
                    <TableCell align="center">نسبة التحويل</TableCell>
                    <TableCell align="center">متوسط الرسائل/محادثة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statistics.map((stat) => (
                    <TableRow key={stat.userId} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {stat.firstName} {stat.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {stat.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="primary">
                          {stat.conversationsCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="secondary">
                          {stat.messagesCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="success.main">
                          {stat.ordersCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${stat.conversionRate || 0}%`}
                          color={
                            stat.conversionRate >= 50 ? 'success' :
                            stat.conversionRate >= 30 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" color="info.main">
                          {stat.conversationsCount > 0 
                            ? (stat.messagesCount / stat.conversationsCount).toFixed(1)
                            : '0'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {statistics.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  عدد المحادثات لكل موظف
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics.map(stat => ({
                      name: `${stat.firstName} ${stat.lastName}`,
                      conversations: stat.conversationsCount
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="conversations" fill="#8884d8" name="المحادثات" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  عدد الرسائل لكل موظف
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics.map(stat => ({
                      name: `${stat.firstName} ${stat.lastName}`,
                      messages: stat.messagesCount
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="messages" fill="#82ca9d" name="الرسائل" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  عدد الطلبات لكل موظف
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics.map(stat => ({
                      name: `${stat.firstName} ${stat.lastName}`,
                      orders: stat.ordersCount || 0
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#4caf50" name="الطلبات" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  نسبة التحويل لكل موظف
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics.map(stat => ({
                      name: `${stat.firstName} ${stat.lastName}`,
                      conversion: stat.conversionRate || 0
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="conversion" fill="#ff9800" name="نسبة التحويل %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  توزيع المحادثات بين الموظفين
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statistics.map(stat => ({
                        name: `${stat.firstName} ${stat.lastName}`,
                        value: stat.conversationsCount
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statistics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default EmployeeStatsReport;
