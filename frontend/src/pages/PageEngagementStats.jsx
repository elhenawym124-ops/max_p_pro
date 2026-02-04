import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/urlHelper';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ThumbUpAlt as LikeIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Visibility as ViewIcon,
  Favorite as HeartIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';

/**
 * Page Engagement Stats
 * صفحة عرض إحصائيات التفاعلات لصفحات Facebook
 */
const PageEngagementStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [period, setPeriod] = useState('7'); // Default 7 days

  // Fetch all pages overview
  const fetchPagesOverview = async () => {
    try {
      setPagesLoading(true);
      const response = await fetch(buildApiUrl('pages/engagement/overview'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      }); 

      if (!response.ok) {
        throw new Error('فشل في جلب الصفحات');
      }

      const result = await response.json();
      if (result.success && result.data.pages.length > 0) {
        setPages(result.data.pages);
        // Select first page by default
        setSelectedPage(result.data.pages[0].pageId);
      } else {
        setPages([]);
      }
    } catch (err) {
      console.error('❌ Error fetching pages:', err);
      setError(err.message);
    } finally {
      setPagesLoading(false);
    }
  };

  // Fetch engagement stats for selected page
  const fetchEngagementStats = async (pageId, selectedPeriod) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        buildApiUrl(`pages/engagement/${pageId}?period=${selectedPeriod}`),
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('فشل في جلب الإحصائيات');
      }

      const result = await response.json();
      if (result.success) {
        setEngagementData(result.data);
      }
    } catch (err) {
      console.error('❌ Error fetching engagement stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagesOverview();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchEngagementStats(selectedPage, period);
    }
  }, [selectedPage, period]);

  const handleRefresh = () => {
    if (selectedPage) {
      fetchEngagementStats(selectedPage, period);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (pagesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (pages.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          لا توجد صفحات Facebook متصلة. يرجى ربط صفحة Facebook أولاً.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
          📊 إحصائيات التفاعلات - Facebook Pages
        </Typography>
        <Typography variant="body1" color="text.secondary">
          عرض شامل لتفاعلات المتابعين على صفحات Facebook (الإعجابات، التعليقات، المشاركات)
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>اختر الصفحة</InputLabel>
              <Select
                value={selectedPage || ''}
                label="اختر الصفحة"
                onChange={(e) => setSelectedPage(e.target.value)}
              >
                {pages.map((page) => (
                  <MenuItem key={page.pageId} value={page.pageId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {page.picture && (
                        <Avatar src={page.picture} sx={{ width: 24, height: 24 }} />
                      )}
                      <Typography>{page.pageName}</Typography>
                      <Chip 
                        label={`${formatNumber(page.fanCount)} متابع`} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>الفترة الزمنية</InputLabel>
              <Select
                value={period}
                label="الفترة الزمنية"
                onChange={(e) => setPeriod(e.target.value)}
              >
                <MenuItem value="1">آخر 24 ساعة</MenuItem>
                <MenuItem value="7">آخر 7 أيام</MenuItem>
                <MenuItem value="14">آخر 14 يوم</MenuItem>
                <MenuItem value="30">آخر 30 يوم</MenuItem>
                <MenuItem value="90">آخر 90 يوم</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              تحديث
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      ) : engagementData ? (
        <>
          {/* Page Info Card */}
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Avatar
                    src={engagementData.page.picture}
                    sx={{ width: 80, height: 80, border: '4px solid white' }}
                  />
                </Grid>
                <Grid item xs>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {engagementData.page.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${formatNumber(engagementData.page.fanCount)} متابع`}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip
                      icon={<HeartIcon />}
                      label={`${formatNumber(engagementData.page.followersCount)} معجب`}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    {engagementData.page.category && (
                      <Chip
                        label={engagementData.page.category}
                        sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item>
                  <IconButton
                    sx={{ color: 'white' }}
                    href={engagementData.page.link}
                    target="_blank"
                  >
                    <OpenIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        إجمالي الإعجابات
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {formatNumber(engagementData.summary.totalLikes)}
                      </Typography>
                    </Box>
                    <LikeIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        إجمالي التعليقات
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {formatNumber(engagementData.summary.totalComments)}
                      </Typography>
                    </Box>
                    <CommentIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        إجمالي المشاركات
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {formatNumber(engagementData.summary.totalShares)}
                      </Typography>
                    </Box>
                    <ShareIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        معدل التفاعل
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {engagementData.summary.engagementRate}%
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Additional Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    📝 إحصائيات المنشورات
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">عدد المنشورات:</Typography>
                    <Typography fontWeight="bold">{engagementData.summary.totalPosts}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">متوسط التفاعل:</Typography>
                    <Typography fontWeight="bold">
                      {engagementData.summary.averageEngagementPerPost}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">إجمالي التفاعلات:</Typography>
                    <Typography fontWeight="bold">
                      {formatNumber(engagementData.summary.totalEngagement)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    ❤️ التفاعلات (Reactions)
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">إجمالي التفاعلات:</Typography>
                    <Typography fontWeight="bold">
                      {formatNumber(engagementData.summary.totalReactions)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    التفاعلات تشمل: إعجاب، حب، ضحك، دهشة، حزن، غضب
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    📅 الفترة الزمنية
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">من:</Typography>
                    <Typography fontWeight="bold">
                      {formatDate(engagementData.period.since)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">إلى:</Typography>
                    <Typography fontWeight="bold">
                      {formatDate(engagementData.period.until)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">المدة:</Typography>
                    <Typography fontWeight="bold">{engagementData.period.days} يوم</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Top Posts Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                🏆 أفضل المنشورات حسب التفاعل
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>المنشور</TableCell>
                      <TableCell align="center">التاريخ</TableCell>
                      <TableCell align="center">👍 إعجابات</TableCell>
                      <TableCell align="center">💬 تعليقات</TableCell>
                      <TableCell align="center">🔗 مشاركات</TableCell>
                      <TableCell align="center">📊 إجمالي</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {engagementData.posts.slice(0, 10).map((post, index) => (
                      <TableRow key={post.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {post.picture && (
                              <Avatar
                                src={post.picture}
                                variant="rounded"
                                sx={{ width: 40, height: 40 }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {post.message || 'منشور بدون نص'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(post.createdTime)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatNumber(post.engagement.likes)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatNumber(post.engagement.comments)}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatNumber(post.engagement.shares)}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="primary">
                            {formatNumber(post.engagement.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="فتح المنشور">
                            <IconButton
                              size="small"
                              href={post.permalinkUrl}
                              target="_blank"
                              color="primary"
                            >
                              <OpenIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {engagementData.posts.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  لا توجد منشورات في الفترة المحددة
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Box>
  );
};

export default PageEngagementStats;

