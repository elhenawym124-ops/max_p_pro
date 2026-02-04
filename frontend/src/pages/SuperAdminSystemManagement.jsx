import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuthSimple';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Alert,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon,
  Key as KeyIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';

import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminSystemManagement = () => {
  const { user } = useAuth();
  const [systems, setSystems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(new Set());
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl('admin/systems'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSystems(data.data.systems);
        setStats(data.data.stats);
      } else {
        setError(data.message || 'فشل في جلب الأنظمة');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
      console.error('Error fetching systems:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSystem = async (systemName, currentStatus) => {
    try {
      setUpdating(prev => new Set(prev).add(systemName));
      setError(null);
      setSuccess(null);

      const response = await fetch(buildApiUrl(`admin/systems/${systemName}/toggle`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: !currentStatus })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} النظام بنجاح`);
        await fetchSystems(); // إعادة تحميل البيانات
      } else {
        setError(data.message || 'فشل في تغيير حالة النظام');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
      console.error('Error toggling system:', err);
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(systemName);
        return newSet;
      });
    }
  };

  const initializeSystems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl('admin/systems/initialize'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('تم تهيئة الأنظمة بنجاح');
        await fetchSystems();
      } else {
        setError(data.message || 'فشل في تهيئة الأنظمة');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
      console.error('Error initializing systems:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'ai_learning':
        return <PsychologyIcon />;
      case 'monitoring':
        return <MonitorIcon />;
      case 'security':
        return <SecurityIcon />;
      case 'api_keys':
        return <VpnKeyIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'ai_learning':
        return 'primary';
      case 'monitoring':
        return 'secondary';
      case 'security':
        return 'error';
      case 'api_keys':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getResourceUsageColor = (usage) => {
    switch (usage) {
      case 'very_high':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      case 'none':
        return 'default';
      default:
        return 'default';
    }
  };

  const groupedSystems = systems.reduce((acc, system) => {
    if (!acc[system.category]) {
      acc[system.category] = [];
    }
    acc[system.category].push(system);
    return acc;
  }, {});

  if (loading && systems.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          🔧 إدارة أنظمة النظام
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSystems}
            disabled={loading}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={initializeSystems}
            disabled={loading}
          >
            تهيئة الأنظمة
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الأنظمة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.enabled}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أنظمة مفعلة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {stats.disabled}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أنظمة معطلة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {Object.keys(stats.byCategory).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  فئات الأنظمة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Systems by Category */}
      {Object.entries(groupedSystems).map(([category, categorySystems]) => (
        <Card key={category} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {getCategoryIcon(category)}
              <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                {category === 'ai_learning' && '🤖 أنظمة الذكاء الاصطناعي والتعلم'}
                {category === 'monitoring' && '📊 أنظمة المراقبة'}
                {category === 'security' && '🔒 أنظمة الأمان'}
                {category === 'api_keys' && '🔑 أنظمة مفاتيح API'}
                {category === 'general' && '⚙️ أنظمة عامة'}
              </Typography>
              <Chip
                label={`${categorySystems.length} نظام`}
                size="small"
                color={getCategoryColor(category)}
                sx={{ ml: 2 }}
              />
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>النظام</TableCell>
                    <TableCell>الوصف</TableCell>
                    <TableCell align="center">استهلاك الموارد</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categorySystems.map((system) => (
                    <TableRow key={system.systemName}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {system.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {system.systemName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {system.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {system.config && (
                          <Chip
                            label={system.config.resourceUsage || 'غير محدد'}
                            size="small"
                            color={getResourceUsageColor(system.config.resourceUsage)}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={system.isEnabled ? 'مفعل' : 'معطل'}
                          color={system.isEnabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={system.isEnabled ? 'تعطيل النظام' : 'تفعيل النظام'}>
                          <span>
                            <IconButton
                              onClick={() => toggleSystem(system.systemName, system.isEnabled)}
                              disabled={updating.has(system.systemName)}
                              color={system.isEnabled ? 'error' : 'success'}
                            >
                              {updating.has(system.systemName) ? (
                                <CircularProgress size={20} />
                              ) : (
                                <PowerIcon />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}

      {systems.length === 0 && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              لا توجد أنظمة مكونة
            </Typography>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={initializeSystems}
              sx={{ mt: 2 }}
            >
              تهيئة الأنظمة
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SuperAdminSystemManagement;
