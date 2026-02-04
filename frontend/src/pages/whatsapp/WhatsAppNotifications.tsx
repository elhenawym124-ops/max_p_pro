import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
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
  TablePagination,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Bell,
  Package,
  ShoppingCart,
  Megaphone,
  Users,
  FileText,
  BarChart3,
  Settings,
  Send,
  TestTube,
  ChevronLeft,
  Save,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Smartphone,
  Mail,
  Calendar,
  TrendingUp,
  Briefcase,
  UserCheck,
  DollarSign,
  Gift,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 الأنواع والثوابت
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationSettings {
  id: string;
  companyId: string;
  isEnabled: boolean;
  defaultSessionId: string | null;
  // الطلبات
  orderNotificationsEnabled: boolean;
  orderCreatedEnabled: boolean;
  orderConfirmedEnabled: boolean;
  orderProcessingEnabled: boolean;
  orderShippedEnabled: boolean;
  orderDeliveredEnabled: boolean;
  orderCancelledEnabled: boolean;
  paymentReminderEnabled: boolean;
  paymentReminderHours: number;
  // المنتجات
  productNotificationsEnabled: boolean;
  backInStockEnabled: boolean;
  priceDropEnabled: boolean;
  newProductEnabled: boolean;
  // العربة المتروكة
  abandonedCartEnabled: boolean;
  abandonedCartFirstReminder: number;
  abandonedCartSecondReminder: number;
  abandonedCartThirdReminder: number;
  abandonedCartDiscountEnabled: boolean;
  abandonedCartDiscountPercent: number;
  // التسويق
  marketingNotificationsEnabled: boolean;
  promotionalEnabled: boolean;
  couponEnabled: boolean;
  birthdayEnabled: boolean;
  loyaltyEnabled: boolean;
  // الموارد البشرية
  hrNotificationsEnabled: boolean;
  attendanceReminderEnabled: boolean;
  leaveApprovalEnabled: boolean;
  payrollEnabled: boolean;
  birthdayWishEnabled: boolean;
  warningNotificationEnabled: boolean;
  // الحماية
  rateLimitPerMinute: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface Session {
  id: string;
  name: string;
  phoneNumber: string;
}

interface Template {
  id: string | null;
  name: string;
  category: string;
  eventType: string;
  content: string;
  isActive: boolean;
  isDefault: boolean;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
}

interface NotificationLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  category: string;
  eventType: string;
  content: string;
  status: string;
  sentAt: string;
  createdAt: string;
  template?: { name: string };
  order?: { orderNumber: string };
  customer?: { firstName: string; lastName: string };
}

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: string;
  readRate: string;
  byCategory: Record<string, number>;
  byEvent: Record<string, number>;
}

const WhatsAppNotifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const TABS = [
    { id: 'general', label: t('whatsappNotifications.tabs.general'), icon: Settings },
    { id: 'orders', label: t('whatsappNotifications.tabs.orders'), icon: Package },
    { id: 'products', label: t('whatsappNotifications.tabs.products'), icon: ShoppingCart },
    { id: 'abandoned-cart', label: t('whatsappNotifications.tabs.abandonedCart'), icon: ShoppingCart },
    { id: 'marketing', label: t('whatsappNotifications.tabs.marketing'), icon: Megaphone },
    { id: 'hr', label: t('whatsappNotifications.tabs.hr'), icon: Users },
    { id: 'templates', label: t('whatsappNotifications.tabs.templates'), icon: FileText }
  ];

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('whatsappNotifications.status.pending'),
    QUEUED: t('whatsappNotifications.status.queued'),
    SENDING: t('whatsappNotifications.status.sending'),
    SENT: t('whatsappNotifications.status.sent'),
    DELIVERED: t('whatsappNotifications.status.delivered'),
    READ: t('whatsappNotifications.status.read'),
    FAILED: t('whatsappNotifications.status.failed'),
    CANCELLED: t('whatsappNotifications.status.cancelled')
  };

  const CATEGORY_LABELS: Record<string, string> = {
    ORDERS: t('whatsappNotifications.tabs.orders'),
    PRODUCTS: t('whatsappNotifications.tabs.products'),
    MARKETING: t('whatsappNotifications.tabs.marketing'),
    ABANDONED_CART: t('whatsappNotifications.tabs.abandonedCart'),
    HR: t('whatsappNotifications.tabs.hr'),
    SYSTEM: t('common.system')
  };

  const EVENT_LABELS: Record<string, string> = {
    ORDER_CREATED: t('whatsappNotifications.orders.orderCreated'),
    ORDER_CONFIRMED: t('whatsappNotifications.orders.orderConfirmed'),
    ORDER_PROCESSING: t('whatsappNotifications.orders.orderProcessing'),
    ORDER_SHIPPED: t('whatsappNotifications.orders.orderShipped'),
    ORDER_OUT_FOR_DELIVERY: t('whatsappNotifications.orders.orderShipped'), // Assuming same
    ORDER_DELIVERED: t('whatsappNotifications.orders.orderDelivered'),
    ORDER_CANCELLED: t('whatsappNotifications.orders.orderCancelled'),
    PAYMENT_REMINDER: t('whatsappNotifications.orders.paymentReminder'),
    BACK_IN_STOCK: t('whatsappNotifications.products.backInStock'),
    PRICE_DROP: t('whatsappNotifications.products.priceDrop'),
    NEW_PRODUCT: t('whatsappNotifications.products.newProduct'),
    CART_ABANDONED_1H: t('whatsappNotifications.abandonedCart.firstReminder'),
    CART_ABANDONED_24H: t('whatsappNotifications.abandonedCart.secondReminder'),
    CART_ABANDONED_72H: t('whatsappNotifications.abandonedCart.thirdReminder'),
    CART_ABANDONED_WITH_DISCOUNT: t('whatsappNotifications.abandonedCart.incentiveDiscount'),
    PROMOTIONAL: t('whatsappNotifications.marketing.promotional'),
    COUPON_SENT: t('whatsappNotifications.marketing.coupons'),
    BIRTHDAY_WISH: t('whatsappNotifications.marketing.birthday'),
    REVIEW_REQUEST: t('whatsappNotifications.products.priceDrop'), // Placeholder
    ATTENDANCE_REMINDER: t('whatsappNotifications.hr.attendance'),
    LEAVE_APPROVED: t('whatsappNotifications.hr.leave'),
    LEAVE_REJECTED: t('whatsappNotifications.hr.leave'),
    PAYROLL_READY: t('whatsappNotifications.hr.payroll'),
    BIRTHDAY_EMPLOYEE: t('whatsappNotifications.hr.birthday'),
    WARNING_ISSUED: t('whatsappNotifications.hr.warnings'),
    ANNOUNCEMENT: t('whatsappNotifications.marketing.promotional'),
    OTP: 'كود الواتساب لتسجيل الدخول'
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Dialogs
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testEventType, setTestEventType] = useState('ORDER_CREATED');
  const [sendingTest, setSendingTest] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📡 جلب البيانات
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/whatsapp/notifications/settings');
      setSettings(response.data.settings);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSnackbar({ open: true, message: 'فشل في جلب الإعدادات', severity: 'error' });
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/whatsapp/notifications/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSettings();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 💾 حفظ الإعدادات
  // ═══════════════════════════════════════════════════════════════════════════════

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await apiClient.put('/whatsapp/notifications/settings', settings);
      setSnackbar({ open: true, message: 'تم حفظ الإعدادات بنجاح', severity: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'فشل في حفظ الإعدادات', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📤 إرسال اختباري
  // ═══════════════════════════════════════════════════════════════════════════════

  const sendTestNotification = async () => {
    if (!testPhone) {
      setSnackbar({ open: true, message: 'يرجى إدخال رقم الهاتف', severity: 'error' });
      return;
    }

    setSendingTest(true);
    try {
      await apiClient.post('/whatsapp/notifications/test', {
        phone: testPhone,
        eventType: testEventType
      });
      setSnackbar({ open: true, message: 'تم إرسال الإشعار الاختباري بنجاح', severity: 'success' });
      setTestDialogOpen(false);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'فشل في إرسال الإشعار',
        severity: 'error'
      });
    } finally {
      setSendingTest(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 تبويب الإعدادات العامة
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderGeneralTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Bell className="w-6 h-6 text-green-600" />
              <Typography variant="h6">{t('whatsappNotifications.general.enableNotifications')}</Typography>
            </Box>
            <Switch
              checked={settings?.isEnabled || false}
              onChange={(e) => updateSetting('isEnabled', e.target.checked)}
              color="success"
            />
          </Box>

          {!settings?.isEnabled && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('whatsappNotifications.general.notificationsDisabledWarning')}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t('whatsappNotifications.general.defaultSession')}</InputLabel>
            <Select
              value={settings?.defaultSessionId || ''}
              onChange={(e) => updateSetting('defaultSessionId', e.target.value)}
              label={t('whatsappNotifications.general.defaultSession')}
            >
              <MenuItem value="">{t('whatsappNotifications.general.selectSession')}</MenuItem>
              {sessions.map((session) => (
                <MenuItem key={session.id} value={session.id}>
                  {session.name} ({session.phoneNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {sessions.length === 0 && (
            <Alert severity="info">
              {t('whatsappNotifications.general.noSessionsWarning')}{' '}
              <a href="/whatsapp/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>
                {t('header.settings')} WhatsApp
              </a>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock className="w-5 h-5" />
            {t('whatsappNotifications.general.quietHours')}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings?.quietHoursEnabled || false}
                onChange={(e) => updateSetting('quietHoursEnabled', e.target.checked)}
              />
            }
            label={t('whatsappNotifications.general.quietHoursDesc')}
            sx={{ mb: 2 }}
          />

          {settings?.quietHoursEnabled && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={t('whatsappNotifications.general.fromTime')}
                  type="time"
                  value={settings?.quietHoursStart || '22:00'}
                  onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={t('whatsappNotifications.general.toTime')}
                  type="time"
                  value={settings?.quietHoursEnd || '08:00'}
                  onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertTriangle className="w-5 h-5" />
            {t('whatsappNotifications.general.antiBan')}
          </Typography>

          <TextField
            fullWidth
            label={t('whatsappNotifications.general.maxMessagesPerMinute')}
            type="number"
            value={settings?.rateLimitPerMinute || 30}
            onChange={(e) => updateSetting('rateLimitPerMinute', parseInt(e.target.value))}
            helperText={t('whatsappNotifications.general.antiBanHelp')}
            inputProps={{ min: 1, max: 60 }}
          />
        </CardContent>
      </Card>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📦 تبويب إشعارات الطلبات
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderOrdersTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Package className="w-6 h-6 text-blue-600" />
              <Typography variant="h6">{t('whatsappNotifications.orders.title')}</Typography>
            </Box>
            <Switch
              checked={settings?.orderNotificationsEnabled || false}
              onChange={(e) => updateSetting('orderNotificationsEnabled', e.target.checked)}
              color="primary"
            />
          </Box>

          {settings?.orderNotificationsEnabled && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderCreatedEnabled || false}
                      onChange={(e) => updateSetting('orderCreatedEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderCreated')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderConfirmedEnabled || false}
                      onChange={(e) => updateSetting('orderConfirmedEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderConfirmed')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderProcessingEnabled || false}
                      onChange={(e) => updateSetting('orderProcessingEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderProcessing')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderShippedEnabled || false}
                      onChange={(e) => updateSetting('orderShippedEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderShipped')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderDeliveredEnabled || false}
                      onChange={(e) => updateSetting('orderDeliveredEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderDelivered')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.orderCancelledEnabled || false}
                      onChange={(e) => updateSetting('orderCancelledEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.orders.orderCancelled')}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DollarSign className="w-5 h-5" />
            {t('whatsappNotifications.orders.paymentReminder')}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings?.paymentReminderEnabled || false}
                onChange={(e) => updateSetting('paymentReminderEnabled', e.target.checked)}
              />
            }
            label={t('whatsappNotifications.orders.paymentReminderDesc')}
            sx={{ mb: 2 }}
          />

          {settings?.paymentReminderEnabled && (
            <TextField
              fullWidth
              label={t('whatsappNotifications.orders.reminderAfterHours')}
              type="number"
              value={settings?.paymentReminderHours || 24}
              onChange={(e) => updateSetting('paymentReminderHours', parseInt(e.target.value))}
              inputProps={{ min: 1, max: 168 }}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🛍️ تبويب إشعارات المنتجات
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderProductsTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <Typography variant="h6">{t('whatsappNotifications.products.title')}</Typography>
            </Box>
            <Switch
              checked={settings?.productNotificationsEnabled || false}
              onChange={(e) => updateSetting('productNotificationsEnabled', e.target.checked)}
              color="secondary"
            />
          </Box>

          {settings?.productNotificationsEnabled && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.backInStockEnabled || false}
                      onChange={(e) => updateSetting('backInStockEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.products.backInStock')}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mx: 4 }}>
                  {t('whatsappNotifications.products.backInStockHelp')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.priceDropEnabled || false}
                      onChange={(e) => updateSetting('priceDropEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.products.priceDrop')}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mx: 4 }}>
                  {t('whatsappNotifications.products.priceDropHelp')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.newProductEnabled || false}
                      onChange={(e) => updateSetting('newProductEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.products.newProduct')}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mx: 4 }}>
                  {t('whatsappNotifications.products.newProductHelp')}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🛒 تبويب العربة المتروكة
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderAbandonedCartTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShoppingCart className="w-6 h-6 text-orange-600" />
              <Typography variant="h6">{t('whatsappNotifications.abandonedCart.title')}</Typography>
            </Box>
            <Switch
              checked={settings?.abandonedCartEnabled || false}
              onChange={(e) => updateSetting('abandonedCartEnabled', e.target.checked)}
              color="warning"
            />
          </Box>

          {settings?.abandonedCartEnabled && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                {t('whatsappNotifications.abandonedCart.desc')}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('whatsappNotifications.abandonedCart.firstReminder')}
                    type="number"
                    value={settings?.abandonedCartFirstReminder || 1}
                    onChange={(e) => updateSetting('abandonedCartFirstReminder', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 24 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('whatsappNotifications.abandonedCart.secondReminder')}
                    type="number"
                    value={settings?.abandonedCartSecondReminder || 24}
                    onChange={(e) => updateSetting('abandonedCartSecondReminder', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 72 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('whatsappNotifications.abandonedCart.thirdReminder')}
                    type="number"
                    value={settings?.abandonedCartThirdReminder || 72}
                    onChange={(e) => updateSetting('abandonedCartThirdReminder', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 168 }}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {settings?.abandonedCartEnabled && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Gift className="w-5 h-5" />
              {t('whatsappNotifications.abandonedCart.incentiveDiscount')}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.abandonedCartDiscountEnabled || false}
                  onChange={(e) => updateSetting('abandonedCartDiscountEnabled', e.target.checked)}
                />
              }
              label={t('whatsappNotifications.abandonedCart.incentiveDiscountDesc')}
              sx={{ mb: 2 }}
            />

            {settings?.abandonedCartDiscountEnabled && (
              <TextField
                fullWidth
                label={t('whatsappNotifications.abandonedCart.discountPercent')}
                type="number"
                value={settings?.abandonedCartDiscountPercent || 10}
                onChange={(e) => updateSetting('abandonedCartDiscountPercent', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 50 }}
                helperText={t('whatsappNotifications.abandonedCart.discountHelp')}
              />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📢 تبويب التسويق
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderMarketingTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Megaphone className="w-6 h-6 text-pink-600" />
              <Typography variant="h6">{t('whatsappNotifications.marketing.title')}</Typography>
            </Box>
            <Switch
              checked={settings?.marketingNotificationsEnabled || false}
              onChange={(e) => updateSetting('marketingNotificationsEnabled', e.target.checked)}
              color="error"
            />
          </Box>

          {settings?.marketingNotificationsEnabled && (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                {t('whatsappNotifications.marketing.complianceWarning')}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings?.promotionalEnabled || false}
                        onChange={(e) => updateSetting('promotionalEnabled', e.target.checked)}
                      />
                    }
                    label={t('whatsappNotifications.marketing.promotional')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings?.couponEnabled || false}
                        onChange={(e) => updateSetting('couponEnabled', e.target.checked)}
                      />
                    }
                    label={t('whatsappNotifications.marketing.coupons')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings?.birthdayEnabled || false}
                        onChange={(e) => updateSetting('birthdayEnabled', e.target.checked)}
                      />
                    }
                    label={t('whatsappNotifications.marketing.birthday')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings?.loyaltyEnabled || false}
                        onChange={(e) => updateSetting('loyaltyEnabled', e.target.checked)}
                      />
                    }
                    label={t('whatsappNotifications.marketing.loyalty')}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 👥 تبويب الموارد البشرية
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderHRTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Users className="w-6 h-6 text-teal-600" />
              <Typography variant="h6">{t('whatsappNotifications.hr.title')}</Typography>
            </Box>
            <Switch
              checked={settings?.hrNotificationsEnabled || false}
              onChange={(e) => updateSetting('hrNotificationsEnabled', e.target.checked)}
              color="info"
            />
          </Box>

          {settings?.hrNotificationsEnabled && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.attendanceReminderEnabled || false}
                      onChange={(e) => updateSetting('attendanceReminderEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.hr.attendance')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.leaveApprovalEnabled || false}
                      onChange={(e) => updateSetting('leaveApprovalEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.hr.leave')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.payrollEnabled || false}
                      onChange={(e) => updateSetting('payrollEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.hr.payroll')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.birthdayWishEnabled || false}
                      onChange={(e) => updateSetting('birthdayWishEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.hr.birthday')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.warningNotificationEnabled || false}
                      onChange={(e) => updateSetting('warningNotificationEnabled', e.target.checked)}
                    />
                  }
                  label={t('whatsappNotifications.hr.warnings')}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📝 تبويب القوالب
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderTemplatesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">قوالب الإشعارات</Typography>
        <Button
          variant="contained"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditingTemplate(null);
            setTemplateDialogOpen(true);
          }}
        >
          قالب جديد
        </Button>
      </Box>

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} key={template.eventType}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {template.name || EVENT_LABELS[template.eventType] || template.eventType}
                    </Typography>
                    <Chip
                      label={CATEGORY_LABELS[template.category] || template.category}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  <Box>
                    {template.id ? (
                      <>
                        <IconButton size="small" onClick={() => {
                          setEditingTemplate(template);
                          setTemplateDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4" />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </>
                    ) : (
                      <Chip label="افتراضي" size="small" color="info" />
                    )}
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {template.content}
                </Typography>

                {template.sentCount !== undefined && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      مرسل: {template.sentCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      مستلم: {template.deliveredCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      مقروء: {template.readCount}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 العرض الرئيسي
  // ═══════════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/whatsapp/settings')}>
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </IconButton>
          <Bell className="w-8 h-8 text-green-600" />
          <Box>
            <Typography variant="h5" fontWeight="bold">{t('whatsappNotifications.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('whatsappNotifications.general.notificationsDisabledWarning')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TestTube className="w-4 h-4" />}
            onClick={() => setTestDialogOpen(true)}
          >
            {t('whatsappNotifications.test.sendTest')}
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save className="w-4 h-4" />}
            onClick={saveSettings}
            disabled={saving}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setSearchParams({ tab: newValue })}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
      <Box>
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'abandoned-cart' && renderAbandonedCartTab()}
        {activeTab === 'marketing' && renderMarketingTab()}
        {activeTab === 'hr' && renderHRTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
      </Box>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('whatsappNotifications.test.sendTest')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label={t('common.phone')}
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('whatsappNotifications.test.eventLabel')}</InputLabel>
              <Select
                value={testEventType}
                onChange={(e) => setTestEventType(e.target.value)}
                label={t('whatsappNotifications.test.eventLabel')}
              >
                {Object.entries(EVENT_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={sendTestNotification}
            disabled={sendingTest}
            startIcon={sendingTest ? <CircularProgress size={16} /> : <Send className="w-4 h-4" />}
          >
            {t('common.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WhatsAppNotifications;
