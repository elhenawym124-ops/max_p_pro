import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
  MonetizationOn as MoneyIcon,
  HealthAndSafety as HealthIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTheme } from '../hooks/useTheme';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminReports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [growthData, setGrowthData] = useState(null);
  const [companyPerformance, setCompanyPerformance] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [growthRes, performanceRes, revenueRes, healthRes] = await Promise.all([
        fetch(buildApiUrl(`admin/analytics/growth?period=${period}`), { headers }),
        fetch(buildApiUrl('admin/analytics/company-performance'), { headers }),
        fetch(buildApiUrl('admin/analytics/revenue'), { headers }),
        fetch(buildApiUrl('admin/analytics/system-health'), { headers })
      ]);

      const [growth, performance, revenue, health] = await Promise.all([
        growthRes.json(),
        performanceRes.json(),
        revenueRes.json(),
        healthRes.json()
      ]);

      if (growth.success) setGrowthData(growth.data);
      if (performance.success) setCompanyPerformance(performance.data);
      if (revenue.success) setRevenueData(revenue.data);
      if (health.success) setSystemHealth(health.data);

    } catch (err) {
      setError('فشل في جلب بيانات التقارير');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString();
  };

  const getGrowthColor = (growth) => {
    const value = parseFloat(growth);
    if (value > 0) return 'success';
    if (value < 0) return 'error';
    return 'default';
  };

  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const chartTheme = {
    grid: isDark ? '#334155' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    tooltip: {
      bg: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '#334155' : '#e2e8f0',
      text: isDark ? '#f1f5f9' : '#1e293b'
    }
  };

  const colors = isDark
    ? ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa']
    : ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Growth Analytics Tab
  const GrowthTab = () => (
    <Grid container spacing={3}>
      {/* Growth Metrics Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {growthData?.periodGrowth && Object.entries(growthData.periodGrowth).map(([key, data], index) => (
            <Grid item xs={12} sm={6} md={2.4} key={key}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    {key === 'companies' ? 'الشركات' :
                      key === 'users' ? 'المستخدمين' :
                        key === 'customers' ? 'العملاء' :
                          key === 'conversations' ? 'المحادثات' : 'الرسائل'}
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(data.current)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Chip
                      label={`${data.growth}%`}
                      color={getGrowthColor(data.growth)}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      آخر {period} يوم
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Growth Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              نمو النظام اليومي
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={growthData?.dailyGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="date" stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <YAxis stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltip.bg,
                    borderColor: chartTheme.tooltip.border,
                    color: chartTheme.tooltip.text
                  }}
                  itemStyle={{ color: chartTheme.tooltip.text }}
                />
                <Legend />
                <Area type="monotone" dataKey="companies" stackId="1" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} name="شركات" />
                <Area type="monotone" dataKey="users" stackId="1" stroke={colors[1]} fill={colors[1]} fillOpacity={0.6} name="مستخدمين" />
                <Area type="monotone" dataKey="customers" stackId="1" stroke={colors[2]} fill={colors[2]} fillOpacity={0.6} name="عملاء" />
                <Area type="monotone" dataKey="conversations" stackId="1" stroke={colors[3]} fill={colors[3]} fillOpacity={0.6} name="محادثات" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Company Performance Tab
  const PerformanceTab = () => (
    <Grid container spacing={3}>
      {/* Top Performing Companies */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              أداء الشركات حسب نقاط المشاركة
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={companyPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="name" stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <YAxis stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltip.bg,
                    borderColor: chartTheme.tooltip.border,
                    color: chartTheme.tooltip.text
                  }}
                />
                <Bar dataKey="engagementScore" fill={colors[0]} name="نقاط المشاركة" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Plan Distribution */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              توزيع الخطط
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'أساسي', value: companyPerformance.filter(c => c.plan === 'BASIC').length },
                    { name: 'احترافي', value: companyPerformance.filter(c => c.plan === 'PRO').length },
                    { name: 'مؤسسي', value: companyPerformance.filter(c => c.plan === 'ENTERPRISE').length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {colors.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Company Performance Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              تفاصيل أداء الشركات
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {companyPerformance.map((company, index) => (
                <Paper key={company.id} sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">{company.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {company.totalCustomers} عميل • {company.totalConversations} محادثة
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Chip
                      label={`${company.engagementScore} نقطة`}
                      color={company.engagementScore >= 70 ? 'success' : company.engagementScore >= 40 ? 'warning' : 'error'}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {company.plan}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Revenue Tab
  const RevenueTab = () => (
    <Grid container spacing={3}>
      {/* Revenue Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  الإيرادات الشهرية
                </Typography>
                <Typography variant="h4" color="primary">
                  ${formatNumber(revenueData?.totalMRR)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  الإيرادات السنوية المتوقعة
                </Typography>
                <Typography variant="h4" color="success.main">
                  ${formatNumber(revenueData?.projectedARR)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  متوسط الإيراد لكل شركة
                </Typography>
                <Typography variant="h4" color="info.main">
                  ${revenueData?.averageRevenuePerCompany}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي الشركات النشطة
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {revenueData?.revenueByPlan?.reduce((sum, p) => sum + p.companies, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Monthly Revenue Chart */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              نمو الإيرادات الشهرية
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="month" stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <YAxis stroke={chartTheme.text} tick={{ fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltip.bg,
                    borderColor: chartTheme.tooltip.border,
                    color: chartTheme.tooltip.text
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke={colors[0]} strokeWidth={2} name="الإيرادات ($)" />
                <Line type="monotone" dataKey="companies" stroke={colors[1]} strokeWidth={2} name="عدد الشركات" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue by Plan */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              الإيرادات حسب الخطة
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={revenueData?.revenueByPlan?.map(plan => ({
                    name: plan.plan === 'BASIC' ? 'أساسي' : plan.plan === 'PRO' ? 'احترافي' : 'مؤسسي',
                    value: plan.totalRevenue
                  })) || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} $${formatNumber(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {colors.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

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
          <Typography variant="h4" component="h1" gutterBottom>
            التقارير والتحليلات المتقدمة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            تحليلات شاملة لأداء النظام والشركات
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>الفترة</InputLabel>
            <Select
              value={period}
              label="الفترة"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="7">7 أيام</MenuItem>
              <MenuItem value="30">30 يوم</MenuItem>
              <MenuItem value="90">90 يوم</MenuItem>
              <MenuItem value="365">سنة</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAllData}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            تصدير
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* System Health Overview */}
      {systemHealth && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <HealthIcon color="primary" />
                <Box>
                  <Typography variant="h6">صحة النظام</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {systemHealth.activeCompanies} من {systemHealth.totalCompanies} شركة نشطة
                  </Typography>
                </Box>
              </Box>
              <Box textAlign="right">
                <Chip
                  label={`${systemHealth.healthScore}%`}
                  color={systemHealth.status === 'excellent' ? 'success' : systemHealth.status === 'good' ? 'warning' : 'error'}
                  size="large"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  نقاط الصحة
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<TrendingUpIcon />} label="النمو" />
          <Tab icon={<BusinessIcon />} label="أداء الشركات" />
          <Tab icon={<MoneyIcon />} label="الإيرادات" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <GrowthTab />}
      {activeTab === 1 && <PerformanceTab />}
      {activeTab === 2 && <RevenueTab />}
    </Box>
  );
};

export default SuperAdminReports;
