import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildApiUrl } from '../utils/urlHelper';
import api from '../services/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  ThemeProvider,
  createTheme,
  useMediaQuery
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Person as CustomersIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';

/**
 * Company Dashboard Page
 * 
 * Main dashboard for company users showing overview, usage, and limits
 */

const CompanyDashboard = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if dark mode is active
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark') || prefersDarkMode
  );

  // Listen for dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') || prefersDarkMode);
    };

    // Check initially
    checkDarkMode();

    // Watch for class changes on documentElement
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also listen to media query changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
        checkDarkMode();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [prefersDarkMode]);

  // Create MUI theme based on dark mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
        },
      }),
    [isDarkMode]
  );

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company/dashboard');

      if (response.data.success) {
        setDashboardData(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || t('companyDashboard.errors.fetchFailed'));
      }
    } catch (err) {
      setError(t('companyDashboard.errors.fetchFailed') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.companyId]);

  // Get plan display name
  const getPlanDisplayName = (plan) => {
    const plans = {
      BASIC: t('companyDashboard.plan.basic'),
      PRO: t('companyDashboard.plan.pro'),
      ENTERPRISE: t('companyDashboard.plan.enterprise')
    };
    return plans[plan] || plan;
  };

  // Get plan color
  const getPlanColor = (plan) => {
    const colors = {
      BASIC: 'primary',
      PRO: 'warning',
      ENTERPRISE: 'error'
    };
    return colors[plan] || 'default';
  };

  // Get usage color based on percentage
  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (num === -1) return t('companyDashboard.usage.unlimited');
    return num.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">{t('common.noData')}</Alert>
      </Box>
    );
  }

  const { company, counts, usage, limits, recentActivity } = dashboardData;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }} dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom align={isRtl ? 'right' : 'left'}>
            {t('companyDashboard.title')} {company.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={2} justifyContent={isRtl ? 'flex-start' : 'flex-start'}>
            <Chip
              label={getPlanDisplayName(company.plan)}
              color={getPlanColor(company.plan)}
              icon={<BusinessIcon />}
            />
            <Chip
              label={company.isActive ? t('companyDashboard.status.active') : t('companyDashboard.status.inactive')}
              color={company.isActive ? 'success' : 'default'}
              icon={company.isActive ? <CheckCircleIcon /> : <WarningIcon />}
            />
          </Box>
        </Box>

        {/* Usage Overview Cards */}
        <Grid container spacing={3} mb={4}>
          {/* Users Usage */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2} flexDirection={isRtl ? 'row' : 'row'}>
                  <PeopleIcon color="primary" sx={{ [isRtl ? 'ml' : 'mr']: 1 }} />
                  <Typography variant="h6">{t('companyDashboard.usage.users')}</Typography>
                </Box>

                <Typography variant="h4" color="primary" gutterBottom>
                  {formatNumber(usage.users.current)}
                  {usage.users.limit !== -1 && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      / {formatNumber(usage.users.limit)}
                    </Typography>
                  )}
                </Typography>

                {usage.users.limit !== -1 && (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usage.users.percentage, 100)}
                      color={getUsageColor(usage.users.percentage)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usage.users.percentage}% {t('companyDashboard.usage.used')}
                    </Typography>
                  </>
                )}

                {recentActivity.newUsers > 0 && (
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" sx={{ [isRtl ? 'mr' : 'ml']: 0.5 }}>
                      +{recentActivity.newUsers} {t('companyDashboard.usage.thisWeek')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Customers Usage */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CustomersIcon color="secondary" sx={{ [isRtl ? 'ml' : 'mr']: 1 }} />
                  <Typography variant="h6">{t('companyDashboard.usage.customers')}</Typography>
                </Box>

                <Typography variant="h4" color="secondary" gutterBottom>
                  {formatNumber(usage.customers.current)}
                  {usage.customers.limit !== -1 && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      / {formatNumber(usage.customers.limit)}
                    </Typography>
                  )}
                </Typography>

                {usage.customers.limit !== -1 && (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usage.customers.percentage, 100)}
                      color={getUsageColor(usage.customers.percentage)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usage.customers.percentage}% {t('companyDashboard.usage.used')}
                    </Typography>
                  </>
                )}

                {recentActivity.newCustomers > 0 && (
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" sx={{ [isRtl ? 'mr' : 'ml']: 0.5 }}>
                      +{recentActivity.newCustomers} {t('companyDashboard.usage.thisWeek')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Conversations Usage */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <ChatIcon color="info" sx={{ [isRtl ? 'ml' : 'mr']: 1 }} />
                  <Typography variant="h6">{t('companyDashboard.usage.conversations')}</Typography>
                </Box>

                <Typography variant="h4" color="info.main" gutterBottom>
                  {formatNumber(usage.conversations.current)}
                  {usage.conversations.limit !== -1 && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      / {formatNumber(usage.conversations.limit)}
                    </Typography>
                  )}
                </Typography>

                {usage.conversations.limit !== -1 && (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usage.conversations.percentage, 100)}
                      color={getUsageColor(usage.conversations.percentage)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usage.conversations.percentage}% {t('companyDashboard.usage.used')}
                    </Typography>
                  </>
                )}

                {recentActivity.newConversations > 0 && (
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" sx={{ [isRtl ? 'mr' : 'ml']: 0.5 }}>
                      +{recentActivity.newConversations} {t('companyDashboard.usage.thisWeek')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Usage Warnings */}
        {(usage.users.percentage >= 80 || usage.customers.percentage >= 80 || usage.conversations.percentage >= 80) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom align={isRtl ? 'right' : 'left'}>
              {t('companyDashboard.warnings.title')}
            </Typography>
            <Typography variant="body2" align={isRtl ? 'right' : 'left'}>
              {t('companyDashboard.warnings.message')}
            </Typography>
          </Alert>
        )}

        {/* Additional Stats */}
        <Grid container spacing={3}>
          {/* Quick Stats */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom align={isRtl ? 'right' : 'left'}>
                  {t('companyDashboard.stats.title')}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary">
                        {counts.products || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('companyDashboard.stats.products')}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="secondary">
                        {counts.orders || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('companyDashboard.stats.orders')}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">
                        {counts.conversations || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('companyDashboard.usage.conversations')}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {counts.users || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('companyDashboard.usage.users')}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom align={isRtl ? 'right' : 'left'}>
                  {t('companyDashboard.activity.title')}
                </Typography>

                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PeopleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${formatNumber(recentActivity.newUsers)} ${t('companyDashboard.activity.newUsers')}`}
                      secondary={t('companyDashboard.activity.addedThisWeek')}
                      sx={{ textAlign: isRtl ? 'right' : 'left' }}
                    />
                  </ListItem>

                  <Divider />

                  <ListItem>
                    <ListItemIcon>
                      <CustomersIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${formatNumber(recentActivity.newCustomers)} ${t('companyDashboard.activity.newCustomers')}`}
                      secondary={t('companyDashboard.activity.registeredThisWeek')}
                      sx={{ textAlign: isRtl ? 'right' : 'left' }}
                    />
                  </ListItem>

                  <Divider />

                  <ListItem>
                    <ListItemIcon>
                      <ChatIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${formatNumber(recentActivity.newConversations)} ${t('companyDashboard.activity.newConversations')}`}
                      secondary={t('companyDashboard.activity.startedThisWeek')}
                      sx={{ textAlign: isRtl ? 'right' : 'left' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default CompanyDashboard;
