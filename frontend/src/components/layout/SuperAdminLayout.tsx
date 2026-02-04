import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  alpha,
  Badge
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  AttachMoney as PlansIcon,
  AccountBalanceWallet as WalletIcon,
  AutoAwesome as PromptIcon,
  Psychology as ModelsIcon,
  Timeline as TimelineIcon,
  Palette as PaletteIcon,
  Web as WebIcon,
  SupportAgent as SupportIcon,
  ConfirmationNumber as TicketIcon,
  ExpandLess,
  ExpandMore,
  BusinessCenter as BusinessCenterIcon,
  LocalOffer as LocalOfferIcon,
  Analytics as AnalyticsIcon,
  Build as BuildIcon,
  MonitorHeart as MonitorHeartIcon,
  SettingsApplications as SettingsApplicationsIcon,
  HeadsetMic as HeadsetMicIcon,
  Image as ImageIcon,
  Facebook as FacebookIcon,
  EmojiEvents as TrophyIcon,
  AccountTree as AccountTreeIcon,
  Lightbulb as LightbulbIcon,
  AccessTime as ClockIcon,
  Storage as HardDriveIcon
} from '@mui/icons-material';
import { ArrowDownTrayIcon, UserGroupIcon, CodeBracketIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';
import { useTheme } from '../../hooks/useTheme';
import { apiClient } from '../../services/apiClient';
import ThemeToggle from '../ui/theme-toggle';
import ActiveUsersMonitor from '../ActiveUsersMonitor';
import GlobalTimer from '../common/GlobalTimer';

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { actualTheme } = useTheme();
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    'الرئيسية': true,
    'إدارة الشركات والاشتراكات': false,
    'الخطط والأسعار': false,
    'التقارير والتحليلات': false,
    'إدارة النماذج والمفاتيح': false,
    'المتابعة والمراقبة': false,
    'إدارة النظام': false,
    'الدعم الفني': false
  });

  const isDark = actualTheme === 'dark';

  // جلب عدد المستخدمين النشطين
  useEffect(() => {
    const fetchActiveUsersCount = async () => {
      try {
        if (!user) return; // Don't fetch if no user

        const response = await apiClient.get('/admin/active-users');

        if (response.status === 200) {
          setActiveUsersCount(response.data.data?.count || 0);
        } else {
          // Silently fail - don't log 401 errors
          if (response.status !== 401) {
            console.error('Error fetching active users:', response.status);
          }
          setActiveUsersCount(0);
        }
      } catch (error: any) {
        // Silently fail - don't spam console
        if (error.response?.status !== 401) {
          console.error('Failed to fetch active users count', error);
        }
        setActiveUsersCount(0);
      }
    };

    // Only fetch if user is authenticated and loaded
    if (user && !isLoading) {
      fetchActiveUsersCount();
      const interval = setInterval(fetchActiveUsersCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user, isLoading]);

  // التحقق من صلاحيات السوبر أدمن
  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    // Wait for auth to finish loading
    if (isLoading) {
      if (isDev) console.debug('⏳ [SUPER-ADMIN-LAYOUT] Still loading auth...');
      return;
    }

    // Debug log
    if (isDev) {
      console.debug('🔍 [SUPER-ADMIN-LAYOUT] Auth check:', {
        hasUser: !!user,
        userRole: user?.role,
        isLoading,
      });
    }

    // If no user, redirect to login
    // We relaxed the role check because we now support dynamic roles (Project Manager, Team Lead, etc.)
    // Backend "requireSuperAdmin" middleware should handle strict RBAC.
    if (!user) {
      const hasToken = !!localStorage.getItem('accessToken');
      if (isDev && !hasToken) {
        console.warn('⚠️ [SUPER-ADMIN-LAYOUT] Unauthorized access attempt:', {
          hasUser: !!user,
          userRole: (user as any)?.role,
          isLoading
        });
      }
      // Small delay to avoid race conditions
      timer = setTimeout(() => {
        navigate('/auth/login');
      }, 100);
    } else {
      if (isDev) console.debug('✅ [SUPER-ADMIN-LAYOUT] User authorized:', (user as any)?.role);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
        <Typography sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>جاري التحميل...</Typography>
      </Box>
    );
  }

  // Show unauthorized message if no user
  if (!user) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b', p: 4 }}
      >
        <Typography variant="h4" gutterBottom sx={{ color: '#ef4444', fontWeight: 700 }}>⚠️ غير مصرح</Typography>
        <Typography variant="h6" gutterBottom sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          هذه الصفحة مخصصة للسوبر أدمن فقط
        </Typography>
        <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha('#ef4444', 0.1), border: '1px solid', borderColor: alpha('#ef4444', 0.2) }}>
          <Typography variant="body1">
            صلاحيتك الحالية: <strong style={{ color: '#ef4444' }}>{(user as any)?.role || 'غير معروف'}</strong>
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 3, color: isDark ? '#64748b' : '#94a3b8' }}>
          سيتم تحويلك لصفحة تسجيل الدخول خلال 3 ثواني...
        </Typography>
      </Box>
    );
  }

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleCollapseToggle = () => setIsCollapsed(!isCollapsed);
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
    handleProfileMenuClose();
  };

  const handleGroupToggle = (groupTitle: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const menuGroups = [
    {
      title: 'الرئيسية',
      icon: <DashboardIcon />,
      items: [
        { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/super-admin/dashboard' },
        { text: 'سجل التغييرات', icon: <TimelineIcon />, path: '/super-admin/changelog' }
      ]
    },
    {
      title: 'إدارة الشركات',
      icon: <BusinessIcon />,
      items: [
        { text: 'إدارة الشركات', icon: <BusinessIcon />, path: '/super-admin/companies' }
      ]
    },
    {
      title: '💰 إدارة الاشتراكات والفوترة',
      icon: <BusinessCenterIcon />,
      items: [
        { text: 'إدارة المحافظ', icon: <WalletIcon />, path: '/super-admin/wallet-management' },
        { text: 'مركز إدارة الاشتراكات', icon: <PlansIcon />, path: '/super-admin/plans' },
        { text: 'اشتراكات العملاء', icon: <LocalOfferIcon />, path: '/super-admin/subscriptions' },
        { text: 'فواتير العملاء', icon: <AssessmentIcon />, path: '/super-admin/invoices' },
        { text: 'مدفوعات العملاء', icon: <PlansIcon />, path: '/super-admin/payments' },
        { text: 'إيرادات المنصة والتحليلات', icon: <AssessmentIcon />, path: '/super-admin/billing-overview' }
      ]
    },
    {
      title: 'التقارير والتحليلات',
      icon: <AnalyticsIcon />,
      items: [
        { text: 'التقارير والتحليلات', icon: <AssessmentIcon />, path: '/super-admin/reports' },
        { text: 'إحصائيات استهلاك الصور', icon: <ImageIcon />, path: '/super-admin/image-stats' }
      ]
    },
    {
      title: 'إدارة النماذج والمفاتيح',
      icon: <BuildIcon />,
      items: [
        { text: 'مكتبة البرومبتات', icon: <PromptIcon />, path: '/super-admin/prompt-library' },

        { text: 'استديو توليد الصور', icon: <ImageIcon />, path: '/super-admin/image-studio' }
      ]
    },
    {
      title: 'المتابعة والمراقبة',
      icon: <MonitorHeartIcon />,
      items: [


        { text: 'سجل استخدام AI', icon: <TimelineIcon />, path: '/super-admin/ai-logs' },
        { text: 'استهلاك السيرفر', icon: <HardDriveIcon />, path: '/super-admin/server-usage' }
      ]
    },
    {
      title: 'إدارة النظام',
      icon: <SettingsApplicationsIcon />,
      items: [
        { text: 'إدارة أنظمة النظام', icon: <SettingsIcon />, path: '/super-admin/system-management' },
        { text: 'إدارة الثيمات', icon: <PaletteIcon />, path: '/super-admin/themes' },
        { text: 'قوالب الصفحة الرئيسية', icon: <WebIcon />, path: '/super-admin/homepage-templates' },
        { text: 'إعدادات Facebook OAuth', icon: <FacebookIcon />, path: '/super-admin/facebook-oauth' },

        { text: 'مزودي الذكاء الاصطناعي', icon: <ModelsIcon />, path: '/super-admin/ai-providers' },
        { text: 'المساعد الذكي (Chat)', icon: <PromptIcon />, path: '/super-admin/ai-chat' },
        { text: 'الوصول للشركات (Staff)', icon: <BusinessCenterIcon />, path: '/super-admin/staff-access' },
        { text: 'إدارة مستخدمي السوبر أدمن', icon: <AdminIcon />, path: '/super-admin/users' }
      ]
    },
    {
      title: 'الدعم الفني',
      icon: <HeadsetMicIcon />,
      items: [
        { text: 'إدارة الدعم الفني', icon: <SupportIcon />, path: '/admin/support' },
        { text: 'جميع التذاكر', icon: <TicketIcon />, path: '/admin/support' }
      ]
    },
    {
      title: '🛠️ إدارة التطوير',
      icon: <BuildIcon />,
      items: [
        { text: 'لوحة الأبطال', icon: <TrophyIcon />, path: '/super-admin/dev-leaderboard' },
        { text: 'خريطة المشروع', icon: <AccountTreeIcon />, path: '/super-admin/project-map' },
        { text: 'استيراد البيانات', icon: <ArrowDownTrayIcon />, path: '/super-admin/db-migration' },
        { text: 'لوحة التحكم والتقارير', icon: <DashboardIcon />, path: '/super-admin/dev-dashboard' },
        { text: 'المهام', icon: <AssessmentIcon />, path: '/super-admin/dev-tasks' },
        { text: 'Kanban Board', icon: <DashboardIcon />, path: '/super-admin/dev-kanban' },
        { text: 'المؤقتات النشطة', icon: <ClockIcon />, path: '/super-admin/active-timers' },
        { text: 'تتبع الوقت والإنتاجية', icon: <TimelineIcon />, path: '/super-admin/time-tracking' },
        { text: 'مراقبة الموقتات', icon: <MonitorHeartIcon />, path: '/super-admin/system-monitoring' },
        { text: 'إدارة مشاريع التطوير', icon: <CodeBracketIcon />, path: '/super-admin/dev-projects' },
        { text: 'فريق التطوير', icon: <UserGroupIcon />, path: '/super-admin/dev/team' },
        { text: 'إصدارات النظام', icon: <RocketLaunchIcon />, path: '/super-admin/dev-releases' },
        { text: 'سجل التصعيدات', icon: <ClockIcon />, path: '/super-admin/dev/escalations' },
        { text: 'إعدادات المهام', icon: <SettingsIcon />, path: '/super-admin/dev-settings' }
      ]
    }
  ];

  const sidebarColors = {
    bg: isDark ? '#0f172a' : '#ffffff',
    text: isDark ? '#f1f5f9' : '#1e293b',
    border: isDark ? alpha('#eceef2', 0.1) : '#e2e8f0',
    groupBgActive: isDark ? alpha('#3b82f6', 0.1) : alpha('#3b82f6', 0.05),
    groupTextActive: '#3b82f6',
    itemText: isDark ? '#94a3b8' : '#64748b',
    itemHoverBg: isDark ? alpha('#3b82f6', 0.08) : alpha('#3b82f6', 0.04),
    footerBg: isDark ? alpha('#1e293b', 0.5) : '#f8fafc',
  };

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: sidebarColors.bg,
      color: sidebarColors.text,
      overflowX: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderLeft: isDark ? 'none' : '1px solid',
      borderColor: sidebarColors.border
    }}>
      {/* Brand Section */}
      <Box sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid',
        borderColor: sidebarColors.border,
        mb: 2
      }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          <AdminIcon sx={{ fontSize: 24 }} />
        </Avatar>
        {!isCollapsed && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: isDark ? '#f8fafc' : '#1e293b' }}>
              التحكم الذكي
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
              السوبر أدمن
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation List */}
      <List
        sx={{
          flexGrow: 1,
          px: 1.5,
          '& .MuiListItem-root': { py: 0.5 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: alpha(isDark ? '#fff' : '#000', 0.1), borderRadius: '4px' }
        }}
      >
        {menuGroups.map((group) => {
          const isOpen = openGroups[group.title];
          const hasActiveItem = group.items.some(item => location.pathname === item.path);

          return (
            <React.Fragment key={group.title}>
              {/* Group Header */}
              <ListItemButton
                onClick={() => handleGroupToggle(group.title)}
                sx={{
                  py: 1.2,
                  px: isCollapsed ? 2 : 2,
                  mb: 0.5,
                  borderRadius: '12px',
                  justifyContent: isCollapsed ? 'center' : 'initial',
                  bgcolor: hasActiveItem && !isOpen ? sidebarColors.groupBgActive : 'transparent',
                  color: hasActiveItem ? sidebarColors.groupTextActive : sidebarColors.itemText,
                  '&:hover': {
                    bgcolor: sidebarColors.itemHoverBg,
                    color: isDark ? '#f8fafc' : '#1e293b'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 0 : 36,
                    color: hasActiveItem ? sidebarColors.groupTextActive : 'inherit',
                    transition: 'color 0.2s'
                  }}
                >
                  {group.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <>
                    <ListItemText
                      primary={group.title}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontWeight: hasActiveItem ? 700 : 500, fontSize: '0.875rem' }
                      }}
                    />
                    {isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                  </>
                )}
              </ListItemButton>

              {/* Group Items */}
              <Collapse in={!!isOpen && !isCollapsed} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mt: 0.5, mb: 1 }}>
                  {group.items.map((item) => {
                    const isSelected = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
                        <ListItemButton
                          component={Link}
                          to={item.path}
                          selected={isSelected}
                          sx={{
                            borderRadius: '10px',
                            py: 0.8,
                            pl: 4.5,
                            pr: 2,
                            mb: 0.25,
                            color: isSelected ? '#fff' : sidebarColors.itemText,
                            bgcolor: isSelected ? '#3b82f6 !important' : 'transparent',
                            boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
                            '&:hover': {
                              bgcolor: isSelected ? '#2563eb !important' : sidebarColors.itemHoverBg,
                              color: isSelected ? '#fff' : (isDark ? '#f8fafc' : '#1e293b'),
                              transform: 'translateX(-4px)'
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 400 }
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer User Profile */}
      <Box sx={{
        p: 2,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: sidebarColors.border,
        bgcolor: sidebarColors.footerBg
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          p: 1,
          borderRadius: '12px',
          '&:hover': { bgcolor: alpha(isDark ? '#fff' : '#000', 0.05) }
        }} onClick={handleProfileMenuOpen}>
          <Avatar
            sx={{ width: 36, height: 36, bgcolor: '#3b82f6', fontSize: '0.875rem', fontWeight: 700 }}
          >
            {user?.firstName?.charAt(0)}
          </Avatar>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: sidebarColors.itemText, display: 'block' }}>
                {user?.email}
              </Typography>
              {user?.devStats && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 'bold' }}>
                    Lvl {user.devStats.level}
                  </Typography>
                  <Typography variant="caption" sx={{ color: sidebarColors.itemText }}>
                    • {user.devStats.xp} XP
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          {!isCollapsed && <SettingsIcon sx={{ fontSize: 16, color: isDark ? '#475569' : '#94a3b8' }} />}
        </Box>
      </Box>
    </Box>
  );

  const currentDrawerWidth = isCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', direction: 'rtl', minHeight: '100vh', bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          mr: { sm: `${currentDrawerWidth}px` },
          bgcolor: isDark ? alpha('#0f172a', 0.8) : alpha('#fff', 0.8),
          backdropFilter: 'blur(12px)',
          color: isDark ? '#f1f5f9' : '#1e293b',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: isDark ? alpha('#eceef2', 0.1) : '#e2e8f0',
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleCollapseToggle}
              sx={{ display: { xs: 'none', sm: 'flex' }, color: isDark ? '#94a3b8' : '#64748b' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              {menuGroups.find(g => g.items.some(i => i.path === location.pathname))?.title || 'لوحة التحكم'}
            </Typography>
            <Box sx={{ ml: 2, display: { xs: 'none', md: 'block' } }}>
              <GlobalTimer />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => setShowActiveUsers(true)}
              sx={{
                color: activeUsersCount > 0 ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'),
                position: 'relative',
                '&:hover': { bgcolor: isDark ? alpha('#10b981', 0.1) : alpha('#10b981', 0.05) }
              }}
              title="المستخدمون النشطون"
            >
              <Badge
                badgeContent={activeUsersCount}
                color="success"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: '18px',
                    minWidth: '18px',
                    fontWeight: 700
                  }
                }}
              >
                <LightbulbIcon
                  sx={{
                    fontSize: 24,
                    animation: activeUsersCount > 0 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 }
                    }
                  }}
                />
              </Badge>
            </IconButton>
            <ThemeToggle />
            <IconButton
              size="large"
              onClick={handleProfileMenuOpen}
              sx={{ p: 0.5, border: '2px solid transparent', '&:hover': { borderColor: '#3b82f6' } }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: '#3b82f6', fontWeight: 700, fontSize: '0.9rem' }}>
                {user?.firstName?.charAt(0)}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 180,
                borderRadius: '12px',
                bgcolor: isDark ? '#1e293b' : '#fff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                border: '1px solid',
                borderColor: isDark ? alpha('#fff', 0.1) : '#e2e8f0'
              }
            }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ef4444', fontWeight: 600 }}>
              <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
              تسجيل الخروج
            </MenuItem>
          </Menu>

          <IconButton
            color="inherit"
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ ml: 2, display: { sm: 'none' }, color: isDark ? '#94a3b8' : '#64748b' }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              border: 'none',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 4 },
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          mt: 8,
          transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      {/* Active Users Monitor */}
      {showActiveUsers && (
        <ActiveUsersMonitor
          isOpen={showActiveUsers}
          onClose={() => setShowActiveUsers(false)}
        />
      )}
    </Box>
  );
};

export default SuperAdminLayout;
