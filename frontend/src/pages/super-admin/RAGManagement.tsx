import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Refresh,
  Delete,
  Speed,
  Storage,
  Analytics,
  Security,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

interface CacheStats {
  faqs: { size: number; hits: number; misses: number };
  policies: { size: number; hits: number; misses: number };
  products: { size: number; hits: number; misses: number };
  search: { size: number; hits: number; misses: number };
}

interface SystemHealth {
  status: string;
  cache: { enabled: boolean; stats: CacheStats };
  analytics: { enabled: boolean; recordsCount: number };
  rateLimiter: { enabled: boolean; activeCompanies: number };
  dataLoader: { enabled: boolean; lastReload: string };
}

const RAGManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
  }>({ open: false, action: '', title: '' });
  const [settings, setSettings] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tabValue === 0) {
        const [healthRes, cacheRes] = await Promise.all([
          apiClient.get('/rag-admin/health'),
          apiClient.get('/rag-admin/cache/stats'),
        ]);
        setSystemHealth(healthRes.data);
        setCacheStats(cacheRes.data);
      } else if (tabValue === 1) {
        const analyticsRes = await apiClient.get('/rag-admin/analytics/search');
        setAnalyticsData(analyticsRes.data.data);
      } else if (tabValue === 2) {
        const performanceRes = await apiClient.get('/rag-admin/analytics/performance');
        setPerformanceData(performanceRes.data.data);
      } else if (tabValue === 3) {
        const settingsRes = await apiClient.get('/rag-admin/settings');
        setSettings(settingsRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async (type?: string) => {
    try {
      await apiClient.post('/rag-admin/cache/invalidate', { type });
      setSuccess(`تم إلغاء الذاكرة المؤقتة ${type ? `(${type})` : 'بالكامل'} بنجاح`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل إلغاء الذاكرة المؤقتة');
    }
    setConfirmDialog({ open: false, action: '', title: '' });
  };

  const handleReloadData = async (type: 'faqs' | 'policies') => {
    try {
      await apiClient.post(`/rag-admin/reload/${type}`);
      setSuccess(`تم إعادة تحميل ${type === 'faqs' ? 'الأسئلة الشائعة' : 'السياسات'} بنجاح`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل إعادة التحميل');
    }
    setConfirmDialog({ open: false, action: '', title: '' });
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      await apiClient.post('/rag-admin/settings/update', newSettings);
      setSuccess('تم تحديث الإعدادات بنجاح');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تحديث الإعدادات');
    }
  };

  const renderCacheCard = (title: string, stats: any, type: string) => {
    if (!stats) stats = { size: 0, hits: 0, misses: 0 };
    const hits = stats.hits || 0;
    const misses = stats.misses || 0;
    const size = stats.size || 0;
    const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(1) : '0';

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{title}</Typography>
            <IconButton
              size="small"
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  action: `invalidate-${type}`,
                  title: `إلغاء ذاكرة ${title}`,
                })
              }
            >
              <Delete />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">الحجم</Typography>
              <Typography variant="h6">{size}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">معدل النجاح</Typography>
              <Typography variant="h6" color="primary">{hitRate}%</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Hits</Typography>
              <Typography variant="body1">{hits}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Misses</Typography>
              <Typography variant="body1">{misses}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const limits = settings?.limits || {};
  const cacheConfig = settings?.cache || {};

  const renderSettingsTab = () => (
    <Box>
      <Typography variant="h5" mb={3}>إعدادات النظام</Typography>
      {settings && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>حدود الطلبات (Rate Limits)</Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">لكل شركة (في الدقيقة)</Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <Typography variant="body1">الحد الأقصى: {limits.perCompany?.maxRequests}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const val = prompt('أدخل الحد الجديد لكل شركة:', limits.perCompany?.maxRequests?.toString());
                          if (val) handleUpdateSettings({
                            limits: { ...limits, perCompany: { ...limits.perCompany, maxRequests: parseInt(val) } }
                          });
                        }}
                      >تعديل</Button>
                    </Grid>
                  </Grid>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">لكل عنوان IP (في الدقيقة)</Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <Typography variant="body1">الحد الأقصى: {limits.perIP?.maxRequests}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const val = prompt('أدخل الحد الجديد لكل IP:', limits.perIP?.maxRequests?.toString());
                          if (val) handleUpdateSettings({
                            limits: { ...limits, perIP: { ...limits.perIP, maxRequests: parseInt(val) } }
                          });
                        }}
                      >تعديل</Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>ميزانية الـ Tokens اليومية</Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">الحد الأقصى للشركة يومياً</Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <Typography variant="body1">{limits.dailyTokens?.maxTokens?.toLocaleString()} Token</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const val = prompt('أدخل حد الـ Tokens الجديد:', limits.dailyTokens?.maxTokens?.toString());
                          if (val) handleUpdateSettings({
                            limits: { ...limits, dailyTokens: { maxTokens: parseInt(val) } }
                          });
                        }}
                      >تعديل</Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>إعدادات الذاكرة المؤقتة (Smart Cache)</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  التحكم في مدة بقاء البيانات في الذاكرة (بالدقائق). زيادة المدة تحسن الأداء ولكن قد تؤخر التحديثات.
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box mb={1}>
                      <Typography variant="subtitle2">ذاكرة البحث (Search TTL)</Typography>
                      <Typography variant="caption" color="text.secondary">المقترحات والنتائج المكررة</Typography>
                    </Box>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={6}>
                        <Typography variant="h6">{(cacheConfig.ttl?.search / 60000).toFixed(0)} دقيقة</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Button size="small" variant="outlined" fullWidth onClick={() => {
                          const val = prompt('أدخل مدة الحفظ بالدقائق:', (cacheConfig.ttl?.search / 60000).toString());
                          if (val) handleUpdateSettings({
                            cache: { ...cacheConfig, ttl: { ...cacheConfig.ttl, search: parseInt(val) * 60000 } }
                          });
                        }}>تعديل</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box mb={1}>
                      <Typography variant="subtitle2">ذاكرة المنتجات (Product TTL)</Typography>
                      <Typography variant="caption" color="text.secondary">تفاصيل المنتجات والأسعار</Typography>
                    </Box>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={6}>
                        <Typography variant="h6">{(cacheConfig.ttl?.product / 60000).toFixed(0)} دقيقة</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Button size="small" variant="outlined" fullWidth onClick={() => {
                          const val = prompt('أدخل مدة الحفظ بالدقائق:', (cacheConfig.ttl?.product / 60000).toString());
                          if (val) handleUpdateSettings({
                            cache: { ...cacheConfig, ttl: { ...cacheConfig.ttl, product: parseInt(val) * 60000 } }
                          });
                        }}>تعديل</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box mb={1}>
                      <Typography variant="subtitle2">الأسئلة والسياسات</Typography>
                      <Typography variant="caption" color="text.secondary">المعلومات الثابتة</Typography>
                    </Box>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={6}>
                        <Typography variant="h6">{(cacheConfig.ttl?.faq / 60000).toFixed(0)} دقيقة</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Button size="small" variant="outlined" fullWidth onClick={() => {
                          const val = prompt('أدخل مدة الحفظ بالدقائق:', (cacheConfig.ttl?.faq / 60000).toString());
                          if (val) handleUpdateSettings({
                            cache: { ...cacheConfig, ttl: { ...cacheConfig.ttl, faq: parseInt(val) * 60000, policy: parseInt(val) * 60000 } }
                          });
                        }}>تعديل</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderAnalyticsTab = () => (
    <Box>
      <Typography variant="h5" mb={3}>تحليلات البحث</Typography>
      {analyticsData && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>إحصائيات النتائج</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="right">النية (Intent)</TableCell>
                        <TableCell align="center">العدد</TableCell>
                        <TableCell align="center">الحالة</TableCell>
                        <TableCell align="center">متوسط السرعة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.stats.map((stat: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell align="right">{stat.intent}</TableCell>
                          <TableCell align="center">{stat._count}</TableCell>
                          <TableCell align="center">{stat.wasSuccessful ? '✅' : '❌'}</TableCell>
                          <TableCell align="center">{stat._avg.responseTime.toFixed(0)} ms</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2} color="error">أبحاث فاشلة حديثاً</Typography>
                {analyticsData.failedSearches.map((item: any, idx: number) => (
                  <Box key={idx} mb={1} p={1} bgcolor="error.light" borderRadius={1}>
                    <Typography variant="body2" color="white">{item.query}</Typography>
                    <Typography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderPerformanceTab = () => (
    <Box>
      <Typography variant="h5" mb={3}>أداء النظام وتكاليف الـ AI</Typography>
      {performanceData && (
        <Grid container spacing={3}>
          {performanceData.stats.map((op: any, idx: number) => (
            <Grid item xs={12} md={4} key={idx}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">{op.operation}</Typography>
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">عدد العمليات: {op._count}</Typography>
                    <Typography variant="body1">متوسط الـ Tokens: {op._avg.tokensUsed?.toFixed(0) || 0}</Typography>
                    <Typography variant="body1">إجمالي الـ Tokens: {op._sum.tokensUsed?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" mt={1}>متوسط الاستجابة: {op._avg.responseTime.toFixed(0)} ms</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderOverviewTab = () => (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}
      {systemHealth && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h5" sx={{ flexGrow: 1 }}>حالة النظام</Typography>
              <Chip
                icon={systemHealth.status === 'healthy' ? <CheckCircle /> : <ErrorIcon />}
                label={systemHealth.status === 'healthy' ? 'يعمل بشكل جيد' : 'يوجد مشاكل'}
                color={systemHealth.status === 'healthy' ? 'success' : 'error'}
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center">
                  <Storage sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Cache</Typography>
                    <Typography variant="body1">{systemHealth.cache?.enabled ? 'مفعّل' : 'معطّل'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center">
                  <Analytics sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Analytics</Typography>
                    <Typography variant="body1">{systemHealth.analytics?.recordsCount || 0} سجل</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center">
                  <Security sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Rate Limiter</Typography>
                    <Typography variant="body1">{systemHealth.rateLimiter?.activeCompanies || 0} شركة</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center">
                  <Speed sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">آخر تحديث</Typography>
                    <Typography variant="body1">
                      {systemHealth.dataLoader?.lastReload ? new Date(systemHealth.dataLoader.lastReload).toLocaleTimeString('ar-EG') : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {cacheStats && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">إحصائيات الذاكرة المؤقتة</Typography>
            <Box>
              <Button variant="outlined" startIcon={<Refresh />} onClick={loadData} sx={{ mr: 1 }}>تحديث</Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                onClick={() => setConfirmDialog({ open: true, action: 'invalidate-all', title: 'إلغاء جميع الذاكرة المؤقتة' })}
              >إلغاء الكل</Button>
            </Box>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>{renderCacheCard('الأسئلة الشائعة', cacheStats.faqs, 'faqs')}</Grid>
            <Grid item xs={12} md={6} lg={3}>{renderCacheCard('السياسات', cacheStats.policies, 'policies')}</Grid>
            <Grid item xs={12} md={6} lg={3}>{renderCacheCard('المنتجات', cacheStats.products, 'products')}</Grid>
            <Grid item xs={12} md={6} lg={3}>{renderCacheCard('البحث', cacheStats.search, 'search')}</Grid>
          </Grid>

          <Box mt={4}>
            <Typography variant="h5" mb={2}>إعادة تحميل البيانات</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" mb={2}>الأسئلة الشائعة</Typography>
                    <Button variant="contained" startIcon={<Refresh />} onClick={() => setConfirmDialog({ open: true, action: 'reload-faqs', title: 'إعادة تحميل الأسئلة الشائعة' })} fullWidth>إعادة تحميل من قاعدة البيانات</Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" mb={2}>السياسات</Typography>
                    <Button variant="contained" startIcon={<Refresh />} onClick={() => setConfirmDialog({ open: true, action: 'reload-policies', title: 'إعادة تحميل السياسات' })} fullWidth>إعادة تحميل من قاعدة البيانات</Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" mb={3}>إدارة نظام RAG</Typography>
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="نظرة عامة" />
        <Tab label="التحليلات" />
        <Tab label="الأداء" />
        <Tab label="الإعدادات" />
      </Tabs>
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <>
          {tabValue === 0 && renderOverviewTab()}
          {tabValue === 1 && renderAnalyticsTab()}
          {tabValue === 2 && renderPerformanceTab()}
          {tabValue === 3 && renderSettingsTab()}
        </>
      )}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: '', title: '' })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent><Typography>هل أنت متأكد من هذا الإجراء؟</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: '', title: '' })}>إلغاء</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (confirmDialog.action === 'invalidate-all') handleInvalidateCache();
              else if (confirmDialog.action.startsWith('invalidate-')) handleInvalidateCache(confirmDialog.action.replace('invalidate-', ''));
              else if (confirmDialog.action === 'reload-faqs') handleReloadData('faqs');
              else if (confirmDialog.action === 'reload-policies') handleReloadData('policies');
            }}
          >تأكيد</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RAGManagement;
