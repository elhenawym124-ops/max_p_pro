import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  FileDownload as FileDownloadIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { apiClient } from '../services/apiClient';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const CompanyActivity = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalActivities, setTotalActivities] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    category: '',
    action: '',
    severity: '',
    isSuccess: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Dialog
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch company activities
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await apiClient.get('/activity/company/activities', {
        params
      });

      if (response.data.success) {
        setActivities(response.data.data.activities);
        setTotalActivities(response.data.data.pagination.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('companyActivity.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch company stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/activity/company/stats');

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  // Export activities
  const handleExport = async () => {
    try {
      const response = await apiClient.get('/activity/export/csv', {
        params: filters,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company-activities-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(t('companyActivity.errors.exportFailed'));
    }
  };

  // Format number based on locale
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
  };

  // View activity details
  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getSeverityLabel = (severity) => {
    return t(`companyActivity.severity.${severity}`) || severity;
  };

  // Get category label in Arabic
  const getCategoryLabel = (category) => {
    return t(`companyActivity.categories.${category}`) || category;
  };

  // Get action label in Arabic
  const getActionLabel = (action) => {
    return t(`companyActivity.actions.${action}`) || action;
  };

  // Prepare chart data
  const prepareCategoryChartData = () => {
    if (!stats || !stats.categoryStats) return [];
    return stats.categoryStats.map(cat => ({
      name: getCategoryLabel(cat._id),
      value: cat.totalCount
    }));
  };

  const prepareDailyChartData = () => {
    if (!stats || !stats.dailyStats) return [];
    return stats.dailyStats.reverse().map(day => ({
      date: format(new Date(day._id), 'dd/MM', { locale: isRtl ? ar : enUS }),
      [t('companyActivity.charts.success')]: day.successCount,
      [t('companyActivity.charts.failure')]: day.failureCount,
      [t('companyActivity.charts.total')]: day.count
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }} align={isRtl ? 'right' : 'left'}>
        📊 {t('companyActivity.title')}
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} dir={isRtl ? 'rtl' : 'ltr'}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={t('companyActivity.tabs.dashboard')} />
          <Tab label={t('companyActivity.tabs.allActivities')} />
          <Tab label={t('companyActivity.tabs.mostActiveUsers')} />
          <Tab label={t('companyActivity.tabs.criticalActivities')} />
        </Tabs>
      </Box>

      {/* Tab 0: Dashboard */}
      {tabValue === 0 && stats && (
        <Box>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.stats.totalActivities')}
                  </Typography>
                  <Typography variant="h4" align={isRtl ? 'right' : 'left'}>
                    {formatNumber(stats.totalActivities)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.stats.activeUsers')}
                  </Typography>
                  <Typography variant="h4" align={isRtl ? 'right' : 'left'}>
                    {formatNumber(stats.mostActiveUsers?.length || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.stats.criticalActivities')}
                  </Typography>
                  <Typography variant="h4" color="error" align={isRtl ? 'right' : 'left'}>
                    {formatNumber(stats.severityStats?.find(s => s._id === 'CRITICAL')?.count || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.stats.highSeverity')}
                  </Typography>
                  <Typography variant="h4" color="warning.main" align={isRtl ? 'right' : 'left'}>
                    {formatNumber(stats.severityStats?.find(s => s._id === 'HIGH')?.count || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom align={isRtl ? 'right' : 'left'}>
                  {t('companyActivity.charts.distributionByCategory')}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareCategoryChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${formatNumber(Math.round(percent * 100))}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareCategoryChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom align={isRtl ? 'right' : 'left'}>
                  {t('companyActivity.charts.dailyActivities')}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareDailyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey={t('companyActivity.charts.total')} stroke="#8884d8" />
                    <Line type="monotone" dataKey={t('companyActivity.charts.success')} stroke="#82ca9d" />
                    <Line type="monotone" dataKey={t('companyActivity.charts.failure')} stroke="#ff8042" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 1: All Activities */}
      {tabValue === 1 && (
        <Box>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('companyActivity.filters.category')}</InputLabel>
                  <Select
                    value={filters.category}
                    label={t('companyActivity.filters.category')}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <MenuItem value="">{t('companyActivity.filters.all')}</MenuItem>
                    <MenuItem value="AUTH">{t('companyActivity.categories.AUTH')}</MenuItem>
                    <MenuItem value="ADS">{t('companyActivity.categories.ADS')}</MenuItem>
                    <MenuItem value="CONVERSATIONS">{t('companyActivity.categories.CONVERSATIONS')}</MenuItem>
                    <MenuItem value="BILLING">{t('companyActivity.categories.BILLING')}</MenuItem>
                    <MenuItem value="SETTINGS">{t('companyActivity.categories.SETTINGS')}</MenuItem>
                    <MenuItem value="SUPPORT">{t('companyActivity.categories.SUPPORT')}</MenuItem>
                    <MenuItem value="FILES">{t('companyActivity.categories.FILES')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('companyActivity.filters.severity')}</InputLabel>
                  <Select
                    value={filters.severity}
                    label={t('companyActivity.filters.severity')}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  >
                    <MenuItem value="">{t('companyActivity.filters.all')}</MenuItem>
                    <MenuItem value="LOW">{t('companyActivity.severity.LOW')}</MenuItem>
                    <MenuItem value="MEDIUM">{t('companyActivity.severity.MEDIUM')}</MenuItem>
                    <MenuItem value="HIGH">{t('companyActivity.severity.HIGH')}</MenuItem>
                    <MenuItem value="CRITICAL">{t('companyActivity.severity.CRITICAL')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('companyActivity.filters.status')}</InputLabel>
                  <Select
                    value={filters.isSuccess}
                    label={t('companyActivity.filters.status')}
                    onChange={(e) => setFilters({ ...filters, isSuccess: e.target.value })}
                  >
                    <MenuItem value="">{t('companyActivity.filters.all')}</MenuItem>
                    <MenuItem value="true">{t('companyActivity.charts.success')}</MenuItem>
                    <MenuItem value="false">{t('companyActivity.charts.failure')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('companyActivity.filters.search')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder={t('companyActivity.filters.searchPlaceholder')}
                  align={isRtl ? 'right' : 'left'}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FileDownloadIcon sx={{ [isRtl ? 'ml' : 'mr']: 1 }} />}
                  onClick={handleExport}
                >
                  {t('companyActivity.filters.exportCsv')}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Activities Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.user')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.dateTime')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.category')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.action')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.description')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.severity')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.status')}</TableCell>
                  <TableCell align={isRtl ? 'right' : 'left'}>{t('companyActivity.table.details')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      {t('companyActivity.table.noActivities')}
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {activity.userId?.name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                            <Typography variant="body2">
                              {activity.userId?.name || t('companyActivity.activityDetails.unknownUser')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {activity.userId?.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>
                        {format(new Date(activity.createdAt), 'PPp', { locale: isRtl ? ar : enUS })}
                      </TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>
                        <Chip
                          label={getCategoryLabel(activity.category)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>{getActionLabel(activity.action)}</TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>{activity.description}</TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>
                        <Chip
                          label={getSeverityLabel(activity.severity)}
                          size="small"
                          color={getSeverityColor(activity.severity)}
                        />
                      </TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>
                        {activity.isSuccess ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </TableCell>
                      <TableCell align={isRtl ? 'right' : 'left'}>
                        <Tooltip title={t('companyActivity.table.details')}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(activity)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalActivities}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage={t('companyActivity.table.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) =>
                t('companyActivity.table.displayedRows', { from, to, count: count !== -1 ? count : `more than ${to}` })
              }
            />
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Most Active Users */}
      {tabValue === 2 && stats && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom align={isRtl ? 'right' : 'left'}>
            {t('companyActivity.tabs.mostActiveUsers')}
          </Typography>
          <List>
            {stats.mostActiveUsers?.map((user, index) => (
              <React.Fragment key={user.userId}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={`${user.email} - ${formatNumber(user.activityCount)} ${t('companyActivity.charts.total')}`}
                    sx={{ textAlign: isRtl ? 'right' : 'left' }}
                  />
                  <Chip
                    icon={<TrendingUpIcon sx={{ [isRtl ? 'ml' : 'mr']: 1 }} />}
                    label={`${formatNumber(user.activityCount)} ${t('companyActivity.charts.total')}`}
                    color="primary"
                  />
                </ListItem>
                {index < stats.mostActiveUsers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Tab 3: Critical Activities */}
      {tabValue === 3 && stats && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom color="error" align={isRtl ? 'right' : 'left'}>
            {t('companyActivity.tabs.criticalActivities')}
          </Typography>
          <List>
            {stats.criticalActivities?.map((activity, index) => (
              <React.Fragment key={activity._id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getSeverityColor(activity.severity) + '.main' }}>
                      <WarningIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.description}
                    secondary={
                      <Box sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                        <Typography component="span" variant="body2">
                          {activity.userId?.name} - {format(new Date(activity.createdAt), 'PPp', { locale: isRtl ? ar : enUS })}
                        </Typography>
                      </Box>
                    }
                    sx={{ textAlign: isRtl ? 'right' : 'left' }}
                  />
                  <Chip
                    label={getSeverityLabel(activity.severity)}
                    size="small"
                    color={getSeverityColor(activity.severity)}
                  />
                </ListItem>
                {index < stats.criticalActivities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Activity Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <DialogTitle sx={{ textAlign: isRtl ? 'right' : 'left' }}>{t('companyActivity.activityDetails.title')}</DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.table.user')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <Avatar>
                      {selectedActivity.userId?.name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                      <Typography variant="body1">
                        {selectedActivity.userId?.name || t('companyActivity.activityDetails.unknownUser')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedActivity.userId?.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.filters.category')}
                  </Typography>
                  <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                    {getCategoryLabel(selectedActivity.category)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.table.action')}
                  </Typography>
                  <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                    {getActionLabel(selectedActivity.action)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.table.description')}
                  </Typography>
                  <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                    {selectedActivity.description}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.table.dateTime')}
                  </Typography>
                  <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                    {format(new Date(selectedActivity.createdAt), 'PPpp', { locale: isRtl ? ar : enUS })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                    {t('companyActivity.table.status')}
                  </Typography>
                  <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                    {selectedActivity.isSuccess ? `${t('companyActivity.charts.success')} ✅` : `${t('companyActivity.charts.failure')} ❌`}
                  </Typography>
                </Grid>
                {selectedActivity.metadata && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                        {t('companyActivity.activityDetails.ipAddress')}
                      </Typography>
                      <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                        {selectedActivity.metadata.ipAddress || t('companyActivity.activityDetails.notAvailable')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary" align={isRtl ? 'right' : 'left'}>
                        {t('companyActivity.activityDetails.browser')}
                      </Typography>
                      <Typography variant="body1" align={isRtl ? 'right' : 'left'}>
                        {selectedActivity.metadata.browser || t('companyActivity.activityDetails.notAvailable')}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
          <Button onClick={() => setDialogOpen(false)}>{t('companyActivity.activityDetails.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompanyActivity;
