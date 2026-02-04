/**
 * 📱 WhatsApp Settings Page
 * صفحة إعدادات WhatsApp
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  Settings,
  Bot,
  Copy,
  Database,
  Lock,
  Tag,
  BarChart3,
  Clock,
  Clock3,
  FileText,
  ChevronLeft,
  Bell,
  Package,
  ShoppingCart,
  Megaphone,
  Users
} from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Paper,
  Avatar,
  Badge,
  Drawer,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  PhoneAndroid as PhoneIcon,
  Settings as SettingsIcon,
  SmartToy as AIIcon,
  NotificationsActive as NotificationIcon,
  Storage as StorageIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as ConnectedIcon,
  Cancel as DisconnectedIcon,
  HourglassEmpty as PendingIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient } from '../../services/apiClient';
import useSocket from '../../hooks/useSocket';
import QRCode from 'qrcode.react';
import { MuiThemeWrapper } from '../../components/theme/MuiThemeWrapper';

// Alias for easier usage
const api = apiClient;

type TabId = 'sessions' | 'general' | 'ai' | 'quick-replies' | 'business' | 'privacy' | 'labels' | 'stats' | 'status' | 'hours' | 'templates' | 'notifications';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface Session {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  liveStatus: string;
  qrCode: string | null;
  aiEnabled: boolean;
  autoReply: boolean;
  aiMode: string;
  welcomeMessage: string | null;
  awayMessage: string | null;
  workingHoursEnabled: boolean;
  workingHours: any;
  isDefault: boolean;
  createdAt: string;
  _count: {
    messages: number;
    contacts: number;
  };
}

interface Settings {
  id: string;
  isEnabled: boolean;
  maxSessions: number;
  notificationSound: boolean;
  browserNotifications: boolean;
  defaultAIMode: string;
  aiWelcomeEnabled: boolean;
  aiAwayEnabled: boolean;
  maxImageSize: number;
  maxVideoSize: number;
  maxDocumentSize: number;
  autoCompressImages: boolean;
  autoArchiveDays: number | null;
}

interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string;
  usageCount: number;
  isActive: boolean;
}

const WhatsAppSettingsContent: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get('tab') as TabId) || 'sessions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQR, setCurrentQR] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<Settings | null>(null);

  // Quick Replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [quickReplyDialogOpen, setQuickReplyDialogOpen] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [quickReplyForm, setQuickReplyForm] = useState({
    title: '',
    shortcut: '',
    content: '',
    category: 'general',
  });

  // Business Profile
  const [businessProfile, setBusinessProfile] = useState<{
    description: string;
    email: string;
    websites: string[];
    address: string;
    category: string;
  } | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState<{
    readReceipts: string;
    profilePhoto: string;
    status: string;
    online: string;
    lastSeen: string;
    groupAdd: string;
  } | null>(null);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);

  // Labels
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string; color: string } | null>(null);
  const [labelForm, setLabelForm] = useState({ name: '', color: '#25D366' });
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Statistics
  const [stats, setStats] = useState<{
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    aiResponses: number;
    totalConversations: number;
    activeConversations: number;
    dailyStats: { date: string; sent: number; received: number }[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Status
  const [statusText, setStatusText] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Business Hours
  const [businessHours, setBusinessHours] = useState<{
    timezone: string;
    config: { day: number; mode: string; openTime?: string; closeTime?: string }[];
  } | null>(null);
  const [loadingBusinessHours, setLoadingBusinessHours] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: Tab[] = [
    { id: 'sessions', label: 'الجلسات', icon: Smartphone, description: 'إدارة جلسات WhatsApp' },
    { id: 'general', label: 'الإعدادات العامة', icon: Settings, description: 'الإعدادات الأساسية' },
    { id: 'ai', label: 'إعدادات AI', icon: Bot, description: 'الذكاء الاصطناعي' },
    { id: 'quick-replies', label: 'الردود السريعة', icon: Copy, description: 'قوالب الردود الجاهزة' },
    { id: 'business', label: 'ملف الأعمال', icon: Database, description: 'معلومات النشاط التجاري' },
    { id: 'privacy', label: 'الخصوصية', icon: Lock, description: 'إعدادات الخصوصية' },
    { id: 'labels', label: 'العلامات', icon: Tag, description: 'إدارة العلامات' },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3, description: 'إحصائيات الاستخدام' },
    { id: 'status', label: 'الحالة', icon: Clock, description: 'تحديث الحالة' },
    { id: 'hours', label: 'ساعات العمل', icon: Clock3, description: 'تحديد أوقات العمل' },
    { id: 'templates', label: 'القوالب', icon: FileText, description: 'قوالب الرسائل' },
    { id: 'notifications', label: 'الإشعارات التلقائية', icon: Bell, description: 'إدارة الإشعارات' },
  ];

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    console.log('🔌 Socket status:', socket ? 'Connected' : 'Not connected');
    if (!socket) return;

    console.log('🔌 Setting up WhatsApp Socket listeners...');

    const handleQRCode = (data: { sessionId: string; qr: string }) => {
      console.log('📱 QR Code received:', data.sessionId, 'QR length:', data.qr?.length);

      // Update session with QR code
      setSessions(prev => prev.map(session =>
        session.id === data.sessionId
          ? { ...session, qrCode: data.qr, status: 'QR_PENDING' }
          : session
      ));

      // Show QR dialog
      setCurrentQR(data.qr);
      setQrDialogOpen(true);
      enqueueSnackbar('تم إنشاء رمز الاستجابة السريعة - امسحه بهاتفك', { variant: 'info' });
    };

    const handleConnectionUpdate = (data: { sessionId: string; status: string; phoneNumber?: string }) => {
      console.log('📱 Connection update:', data);

      setSessions(prev => prev.map(session =>
        session.id === data.sessionId
          ? {
            ...session,
            status: data.status,
            liveStatus: data.status.toLowerCase(),
            phoneNumber: data.phoneNumber || session.phoneNumber,
            qrCode: data.status === 'CONNECTED' ? null : session.qrCode
          }
          : session
      ));

      if (data.status === 'CONNECTED') {
        setQrDialogOpen(false);
        enqueueSnackbar('تم ربط WhatsApp بنجاح!', { variant: 'success' });
      } else if (data.status === 'DISCONNECTED') {
        enqueueSnackbar('تم قطع الاتصال مع WhatsApp', { variant: 'warning' });
      }
    };

    socket.on('whatsapp:qr', handleQRCode);
    socket.on('whatsapp:connection', handleConnectionUpdate);

    return () => {
      socket.off('whatsapp:qr', handleQRCode);
      socket.off('whatsapp:connection', handleConnectionUpdate);
    };
  }, [socket, enqueueSnackbar]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, settingsRes, quickRepliesRes] = await Promise.all([
        api.get('/whatsapp/sessions'),
        api.get('/whatsapp/settings'),
        api.get('/whatsapp/quick-replies'),
      ]);

      setSessions(sessionsRes.data.sessions || []);
      setSettings(settingsRes.data.settings);
      setQuickReplies(quickRepliesRes.data.quickReplies || []);
    } catch (error: any) {
      enqueueSnackbar('حدث خطأ أثناء تحميل البيانات', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Session handlers
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      enqueueSnackbar('يرجى إدخال اسم الجلسة', { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/whatsapp/sessions', { name: newSessionName });
      setSessions([...sessions, res.data.session]);
      setSessionDialogOpen(false);
      setNewSessionName('');
      enqueueSnackbar('تم إنشاء الجلسة بنجاح', { variant: 'success' });

      // Show QR code
      if (res.data.session.qrCode) {
        setCurrentQR(res.data.session.qrCode);
        setQrDialogOpen(true);
      }
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectSession = async (sessionId: string) => {
    try {
      await api.post(`/whatsapp/sessions/${sessionId}/connect`);
      enqueueSnackbar('جاري الاتصال...', { variant: 'info' });
      loadData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      await api.post(`/whatsapp/sessions/${sessionId}/disconnect`);
      enqueueSnackbar('تم قطع الاتصال', { variant: 'success' });
      loadData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الجلسة؟')) return;

    try {
      await api.delete(`/whatsapp/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      enqueueSnackbar('تم حذف الجلسة', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  const handleUpdateSession = async (sessionId: string, data: Partial<Session>) => {
    try {
      await api.put(`/whatsapp/sessions/${sessionId}`, data);
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, ...data } : s));
      enqueueSnackbar('تم تحديث الجلسة', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await api.put('/whatsapp/settings', settings);
      enqueueSnackbar('تم حفظ الإعدادات', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Quick Reply handlers
  const handleSaveQuickReply = async () => {
    try {
      setSaving(true);
      if (editingQuickReply) {
        await api.put(`/whatsapp/quick-replies/${editingQuickReply.id}`, quickReplyForm);
        setQuickReplies(quickReplies.map(qr =>
          qr.id === editingQuickReply.id ? { ...qr, ...quickReplyForm } : qr
        ));
      } else {
        const res = await api.post('/whatsapp/quick-replies', quickReplyForm);
        setQuickReplies([...quickReplies, res.data.quickReply]);
      }
      setQuickReplyDialogOpen(false);
      setEditingQuickReply(null);
      setQuickReplyForm({ title: '', shortcut: '', content: '', category: 'general' });
      enqueueSnackbar('تم حفظ الرد السريع', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرد السريع؟')) return;

    try {
      await api.delete(`/whatsapp/quick-replies/${id}`);
      setQuickReplies(quickReplies.filter(qr => qr.id !== id));
      enqueueSnackbar('تم حذف الرد السريع', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  // Business Profile handlers
  const loadBusinessProfile = async (sessionId: string) => {
    setLoadingBusiness(true);
    try {
      const [profileRes, hoursRes] = await Promise.all([
        api.get('/whatsapp/business/profile', { params: { sessionId } }),
        api.get('/whatsapp/business/hours', { params: { sessionId } })
      ]);
      setBusinessProfile(profileRes.data.profile || null);
      setBusinessHours(hoursRes.data.hours || null);
    } catch (error) {
      console.error('Error loading business profile:', error);
    } finally {
      setLoadingBusiness(false);
    }
  };

  const handleSaveBusinessProfile = async () => {
    if (!sessions[0]?.id || !businessProfile) return;
    try {
      setSaving(true);
      await api.post('/whatsapp/business/profile', {
        sessionId: sessions[0].id,
        profileData: businessProfile
      });
      enqueueSnackbar('تم حفظ ملف الأعمال', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Privacy handlers
  const loadPrivacySettings = async (sessionId: string) => {
    setLoadingPrivacy(true);
    try {
      const [privacyRes, blocklistRes] = await Promise.all([
        api.get('/whatsapp/privacy/settings', { params: { sessionId } }),
        api.get('/whatsapp/privacy/blocklist', { params: { sessionId } })
      ]);
      setPrivacySettings(privacyRes.data.settings || null);
      setBlocklist(blocklistRes.data.blocklist || []);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoadingPrivacy(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!sessions[0]?.id || !privacySettings) return;
    try {
      setSaving(true);
      await api.post('/whatsapp/privacy/settings', {
        sessionId: sessions[0].id,
        settings: privacySettings
      });
      enqueueSnackbar('تم حفظ إعدادات الخصوصية', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (jid: string) => {
    if (!sessions[0]?.id) return;
    try {
      await api.post('/whatsapp/contacts/unblock', {
        sessionId: sessions[0].id,
        jid
      });
      setBlocklist(blocklist.filter(b => b !== jid));
      enqueueSnackbar('تم إلغاء الحظر', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  // Labels handlers
  const loadLabels = async (sessionId: string) => {
    setLoadingLabels(true);
    try {
      const res = await api.get('/whatsapp/labels', { params: { sessionId } });
      setLabels(res.data.labels || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!sessions[0]?.id || !labelForm.name.trim()) return;
    try {
      setSaving(true);
      const res = await api.post('/whatsapp/labels', {
        sessionId: sessions[0].id,
        name: labelForm.name,
        color: labelForm.color
      });
      setLabels([...labels, res.data.label]);
      setLabelDialogOpen(false);
      setLabelForm({ name: '', color: '#25D366' });
      enqueueSnackbar('تم إنشاء العلامة', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!sessions[0]?.id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه العلامة؟')) return;
    try {
      await api.delete(`/whatsapp/labels/${labelId}`, {
        data: { sessionId: sessions[0].id }
      });
      setLabels(labels.filter(l => l.id !== labelId));
      enqueueSnackbar('تم حذف العلامة', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    }
  };

  // Statistics handlers
  const loadStats = async (sessionId: string) => {
    setLoadingStats(true);
    try {
      const res = await api.get('/whatsapp/stats', { params: { sessionId } });
      setStats(res.data.stats || null);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Status handlers
  const loadStatus = async (sessionId: string) => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/whatsapp/status', { params: { sessionId } });
      setCurrentStatus(res.data.status || '');
      setStatusText(res.data.status || '');
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSetStatus = async () => {
    if (!sessions[0]?.id || !statusText.trim()) return;
    try {
      setSaving(true);
      await api.post('/whatsapp/status', {
        sessionId: sessions[0].id,
        status: statusText
      });
      setCurrentStatus(statusText);
      enqueueSnackbar('تم تحديث الحالة', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Business Hours handlers
  const loadBusinessHours = async (sessionId: string) => {
    setLoadingBusinessHours(true);
    try {
      const res = await api.get('/whatsapp/business/hours', { params: { sessionId } });
      setBusinessHours(res.data.businessHours || null);
    } catch (error) {
      console.error('Error loading business hours:', error);
    } finally {
      setLoadingBusinessHours(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    if (!sessions[0]?.id || !businessHours) return;
    try {
      setSaving(true);
      await api.post('/whatsapp/business/hours', {
        sessionId: sessions[0].id,
        ...businessHours
      });
      enqueueSnackbar('تم حفظ ساعات العمل', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'حدث خطأ', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Templates handlers
  const loadTemplates = async (sessionId: string) => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/whatsapp/templates', { params: { sessionId } });
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'CONNECTED':
        return <ConnectedIcon color="success" />;
      case 'qr_pending':
      case 'QR_PENDING':
        return <PendingIcon color="warning" />;
      default:
        return <DisconnectedIcon color="error" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
      case 'CONNECTED':
        return 'متصل';
      case 'qr_pending':
      case 'QR_PENDING':
        return 'في انتظار QR';
      case 'connecting':
      case 'CONNECTING':
        return 'جاري الاتصال';
      default:
        return 'غير متصل';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات WhatsApp</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">إدارة إعدادات WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">الإعدادات</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${
                      activeTab === tab.id ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">جلسات WhatsApp</Typography>
            <Box>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{ mr: 1 }}
              >
                تحديث
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setSessionDialogOpen(true)}
                disabled={sessions.length >= (settings?.maxSessions || 3)}
              >
                إضافة جلسة
              </Button>
            </Box>
          </Box>

          {sessions.length === 0 ? (
          <Alert severity="info">
            لا توجد جلسات. اضغط على "إضافة جلسة" لربط رقم WhatsApp جديد.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {sessions.map((session) => (
              <Grid item xs={12} md={6} lg={4} key={session.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={getStatusIcon(session.liveStatus || session.status)}
                        >
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <PhoneIcon />
                          </Avatar>
                        </Badge>
                        <Box>
                          <Typography variant="h6">{session.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {session.phoneNumber || 'غير متصل'}
                          </Typography>
                        </Box>
                      </Box>
                      {session.isDefault && (
                        <Chip label="افتراضي" size="small" color="primary" />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        size="small"
                        label={getStatusText(session.liveStatus || session.status)}
                        color={session.liveStatus === 'connected' ? 'success' : 'default'}
                      />
                      {session.aiEnabled && (
                        <Chip size="small" label="AI" color="info" icon={<AIIcon />} />
                      )}
                      {session.autoReply && (
                        <Chip size="small" label="رد تلقائي" color="warning" />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {session._count?.contacts || 0} جهة اتصال • {session._count?.messages || 0} رسالة
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(session.liveStatus || session.status) === 'connected' || (session.liveStatus || session.status) === 'CONNECTED' ? (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<LinkOffIcon />}
                          onClick={() => handleDisconnectSession(session.id)}
                        >
                          قطع الاتصال
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="success"
                          startIcon={<LinkIcon />}
                          onClick={() => handleConnectSession(session.id)}
                        >
                          اتصال
                        </Button>
                      )}

                      {session.qrCode && (
                        <Button
                          size="small"
                          startIcon={<QrCodeIcon />}
                          onClick={() => {
                            setCurrentQR(session.qrCode);
                            setQrDialogOpen(true);
                          }}
                        >
                          QR Code
                        </Button>
                      )}

                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => setSelectedSession(session)}
                      >
                        تعديل
                      </Button>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        </>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && settings && (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إعدادات عامة
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.isEnabled}
                        onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                      />
                    }
                    label="تفعيل WhatsApp"
                  />

                  <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>الحد الأقصى للجلسات: {settings.maxSessions}</Typography>
                    <Slider
                      value={settings.maxSessions}
                      onChange={(_, v) => setSettings({ ...settings, maxSessions: v as number })}
                      min={1}
                      max={10}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <NotificationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    الإشعارات
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notificationSound}
                        onChange={(e) => setSettings({ ...settings, notificationSound: e.target.checked })}
                      />
                    }
                    label="صوت الإشعارات"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.browserNotifications}
                        onChange={(e) => setSettings({ ...settings, browserNotifications: e.target.checked })}
                      />
                    }
                    label="إشعارات المتصفح"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إعدادات الوسائط
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>حد حجم الصور: {settings.maxImageSize} MB</Typography>
                    <Slider
                      value={settings.maxImageSize}
                      onChange={(_, v) => setSettings({ ...settings, maxImageSize: v as number })}
                      min={1}
                      max={50}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>حد حجم الفيديو: {settings.maxVideoSize} MB</Typography>
                    <Slider
                      value={settings.maxVideoSize}
                      onChange={(_, v) => setSettings({ ...settings, maxVideoSize: v as number })}
                      min={1}
                      max={100}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoCompressImages}
                        onChange={(e) => setSettings({ ...settings, autoCompressImages: e.target.checked })}
                      />
                    }
                    label="ضغط الصور تلقائياً"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : 'حفظ الإعدادات'}
              </Button>
            </Grid>
          </Grid>
      )}

      {/* AI Settings Tab */}
      {activeTab === 'ai' && settings && (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إعدادات الذكاء الصناعي
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>وضع AI الافتراضي</InputLabel>
                    <Select
                      value={settings.defaultAIMode}
                      onChange={(e) => setSettings({ ...settings, defaultAIMode: e.target.value })}
                      label="وضع AI الافتراضي"
                    >
                      <MenuItem value="off">إيقاف</MenuItem>
                      <MenuItem value="suggest">اقتراح (بدون إرسال تلقائي)</MenuItem>
                      <MenuItem value="auto">رد تلقائي</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.aiWelcomeEnabled}
                        onChange={(e) => setSettings({ ...settings, aiWelcomeEnabled: e.target.checked })}
                      />
                    }
                    label="رسالة ترحيب تلقائية"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.aiAwayEnabled}
                        onChange={(e) => setSettings({ ...settings, aiAwayEnabled: e.target.checked })}
                      />
                    }
                    label="رسالة عدم التواجد"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : 'حفظ الإعدادات'}
              </Button>
            </Grid>
          </Grid>
      )}

      {/* Quick Replies Tab */}
      {activeTab === 'quick-replies' && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">الردود السريعة</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingQuickReply(null);
                setQuickReplyForm({ title: '', shortcut: '', content: '', category: 'general' });
                setQuickReplyDialogOpen(true);
              }}
            >
              إضافة رد سريع
            </Button>
          </Box>

          {quickReplies.length === 0 ? (
          <Alert severity="info">
            لا توجد ردود سريعة. اضغط على "إضافة رد سريع" لإنشاء قوالب جاهزة.
          </Alert>
        ) : (
          <List>
            {quickReplies.map((qr) => (
              <Paper key={qr.id} sx={{ mb: 1 }}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {qr.title}
                        {qr.shortcut && (
                          <Chip size="small" label={qr.shortcut} variant="outlined" />
                        )}
                        <Chip size="small" label={qr.category} color="primary" />
                      </Box>
                    }
                    secondary={qr.content.substring(0, 100) + (qr.content.length > 100 ? '...' : '')}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="caption" sx={{ mr: 2 }}>
                      استخدم {qr.usageCount} مرة
                    </Typography>
                    <IconButton
                      onClick={() => {
                        setEditingQuickReply(qr);
                        setQuickReplyForm({
                          title: qr.title,
                          shortcut: qr.shortcut || '',
                          content: qr.content,
                          category: qr.category,
                        });
                        setQuickReplyDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteQuickReply(qr.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
        </>
      )}

      {/* Business Profile Tab */}
      {activeTab === 'business' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              يرجى اختيار جلسة متصلة لتحميل ملف الأعمال. هذه الميزة متاحة فقط لحسابات WhatsApp Business.
            </Alert>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadBusinessProfile(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingBusiness ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : businessProfile ? (
            <>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>معلومات النشاط التجاري</Typography>

                    <TextField
                      fullWidth
                      label="وصف النشاط"
                      multiline
                      rows={3}
                      value={businessProfile.description || ''}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, description: e.target.value })}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="البريد الإلكتروني"
                      value={businessProfile.email || ''}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="العنوان"
                      value={businessProfile.address || ''}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                      sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>فئة النشاط</InputLabel>
                      <Select
                        value={businessProfile.category || ''}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, category: e.target.value })}
                        label="فئة النشاط"
                      >
                        <MenuItem value="RETAIL">تجارة التجزئة</MenuItem>
                        <MenuItem value="RESTAURANT">مطعم</MenuItem>
                        <MenuItem value="HEALTH">صحة</MenuItem>
                        <MenuItem value="EDUCATION">تعليم</MenuItem>
                        <MenuItem value="FINANCE">مالية</MenuItem>
                        <MenuItem value="PROFESSIONAL_SERVICES">خدمات مهنية</MenuItem>
                        <MenuItem value="OTHER">أخرى</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>المواقع الإلكترونية</Typography>
                    {(businessProfile.websites || []).map((website, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={website}
                          onChange={(e) => {
                            const newWebsites = [...(businessProfile.websites || [])];
                            newWebsites[index] = e.target.value;
                            setBusinessProfile({ ...businessProfile, websites: newWebsites });
                          }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newWebsites = (businessProfile.websites || []).filter((_, i) => i !== index);
                            setBusinessProfile({ ...businessProfile, websites: newWebsites });
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      onClick={() => setBusinessProfile({
                        ...businessProfile,
                        websites: [...(businessProfile.websites || []), '']
                      })}
                    >
                      + إضافة موقع
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveBusinessProfile}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'حفظ ملف الأعمال'}
                </Button>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="warning">
                لم يتم العثور على ملف أعمال. تأكد من أن الحساب هو WhatsApp Business.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Privacy Settings Tab */}
      {activeTab === 'privacy' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadPrivacySettings(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingPrivacy ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : privacySettings ? (
            <>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>إعدادات الخصوصية</Typography>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>آخر ظهور</InputLabel>
                      <Select
                        value={privacySettings.lastSeen || 'all'}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, lastSeen: e.target.value })}
                        label="آخر ظهور"
                      >
                        <MenuItem value="all">الجميع</MenuItem>
                        <MenuItem value="contacts">جهات الاتصال</MenuItem>
                        <MenuItem value="contact_blacklist">جهات الاتصال ما عدا...</MenuItem>
                        <MenuItem value="none">لا أحد</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>صورة الملف الشخصي</InputLabel>
                      <Select
                        value={privacySettings.profilePhoto || 'all'}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, profilePhoto: e.target.value })}
                        label="صورة الملف الشخصي"
                      >
                        <MenuItem value="all">الجميع</MenuItem>
                        <MenuItem value="contacts">جهات الاتصال</MenuItem>
                        <MenuItem value="contact_blacklist">جهات الاتصال ما عدا...</MenuItem>
                        <MenuItem value="none">لا أحد</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>الحالة</InputLabel>
                      <Select
                        value={privacySettings.status || 'all'}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, status: e.target.value })}
                        label="الحالة"
                      >
                        <MenuItem value="all">الجميع</MenuItem>
                        <MenuItem value="contacts">جهات الاتصال</MenuItem>
                        <MenuItem value="contact_blacklist">جهات الاتصال ما عدا...</MenuItem>
                        <MenuItem value="none">لا أحد</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>من يمكنه إضافتي للمجموعات</InputLabel>
                      <Select
                        value={privacySettings.groupAdd || 'all'}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, groupAdd: e.target.value })}
                        label="من يمكنه إضافتي للمجموعات"
                      >
                        <MenuItem value="all">الجميع</MenuItem>
                        <MenuItem value="contacts">جهات الاتصال</MenuItem>
                        <MenuItem value="contact_blacklist">جهات الاتصال ما عدا...</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>قائمة المحظورين ({blocklist.length})</Typography>
                    {blocklist.length === 0 ? (
                      <Typography color="text.secondary">لا يوجد أرقام محظورة</Typography>
                    ) : (
                      <List dense>
                        {blocklist.map((jid, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={jid.split('@')[0]} />
                            <ListItemSecondaryAction>
                              <Button size="small" onClick={() => handleUnblock(jid)}>
                                إلغاء الحظر
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePrivacy}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'حفظ إعدادات الخصوصية'}
                </Button>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">اختر جلسة متصلة لعرض إعدادات الخصوصية</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Labels Tab */}
      {activeTab === 'labels' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">إدارة العلامات</Typography>
              <Box>
                <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                  <InputLabel>اختر الجلسة</InputLabel>
                  <Select
                    value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        loadLabels(e.target.value);
                      }
                    }}
                    label="اختر الجلسة"
                  >
                    {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingLabel(null);
                    setLabelForm({ name: '', color: '#25D366' });
                    setLabelDialogOpen(true);
                  }}
                >
                  إضافة علامة
                </Button>
              </Box>
            </Box>
          </Grid>

          {loadingLabels ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : labels.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">لا توجد علامات. اختر جلسة متصلة وأضف علامات جديدة.</Alert>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Paper>
                <List>
                  {labels.map((label) => (
                    <ListItem key={label.id}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: label.color || '#25D366',
                          mr: 2
                        }}
                      />
                      <ListItemText primary={label.name} />
                      <ListItemSecondaryAction>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteLabel(label.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadStats(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingStats ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : stats ? (
            <>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h3" align="center">{stats.totalMessages}</Typography>
                    <Typography variant="subtitle1" align="center">إجمالي الرسائل</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h3" align="center">{stats.sentMessages}</Typography>
                    <Typography variant="subtitle1" align="center">رسائل مرسلة</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h3" align="center">{stats.receivedMessages}</Typography>
                    <Typography variant="subtitle1" align="center">رسائل مستلمة</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center" color="secondary">{stats.aiResponses}</Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">ردود AI</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center" color="primary">{stats.totalConversations}</Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">إجمالي المحادثات</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center" color="success.main">{stats.activeConversations}</Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">محادثات نشطة</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {stats.dailyStats && stats.dailyStats.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>إحصائيات الأيام الأخيرة</Typography>
                      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 2 }}>
                        {stats.dailyStats.map((day, index) => (
                          <Paper key={index} sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{day.date}</Typography>
                            <Typography variant="body2" color="success.main">↑ {day.sent}</Typography>
                            <Typography variant="body2" color="info.main">↓ {day.received}</Typography>
                          </Paper>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">اختر جلسة متصلة لعرض الإحصائيات</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Label Dialog */}
      <Dialog open={labelDialogOpen} onClose={() => setLabelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingLabel ? 'تعديل العلامة' : 'إضافة علامة جديدة'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="اسم العلامة"
            value={labelForm.name}
            onChange={(e) => setLabelForm({ ...labelForm, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <Typography variant="subtitle2" gutterBottom>اللون:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['#25D366', '#128C7E', '#075E54', '#34B7F1', '#00A884', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'].map(color => (
              <Box
                key={color}
                onClick={() => setLabelForm({ ...labelForm, color })}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: labelForm.color === color ? '3px solid #000' : 'none'
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabelDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateLabel} disabled={saving || !labelForm.name.trim()}>
            {saving ? <CircularProgress size={20} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadStatus(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingStatus ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            <>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>الحالة الحالية</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {currentStatus || 'لا توجد حالة'}
                    </Typography>

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="الحالة الجديدة"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="اكتب حالتك هنا..."
                      sx={{ mb: 2 }}
                    />

                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSetStatus}
                      disabled={saving || !statusText.trim()}
                    >
                      {saving ? <CircularProgress size={20} /> : 'تحديث الحالة'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* Business Hours Tab */}
      {activeTab === 'hours' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadBusinessHours(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingBusinessHours ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : businessHours ? (
            <>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>ساعات العمل</Typography>

                    <TextField
                      fullWidth
                      label="المنطقة الزمنية"
                      value={businessHours.timezone || 'Africa/Cairo'}
                      onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
                      sx={{ mb: 3 }}
                    />

                    {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => {
                      const dayConfig = businessHours.config?.find((c: { day: number; mode: string; openTime?: string; closeTime?: string }) => c.day === index) || { day: index, mode: 'closed' };
                      return (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography sx={{ minWidth: 80 }}>{day}</Typography>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={dayConfig.mode}
                              onChange={(e) => {
                                const newConfig = businessHours.config?.filter((c: { day: number; mode: string; openTime?: string; closeTime?: string }) => c.day !== index) || [];
                                newConfig.push({ ...dayConfig, mode: e.target.value });
                                setBusinessHours({ ...businessHours, config: newConfig });
                              }}
                            >
                              <MenuItem value="open_24h">مفتوح 24 ساعة</MenuItem>
                              <MenuItem value="appointment_only">بموعد فقط</MenuItem>
                              <MenuItem value="specific_hours">ساعات محددة</MenuItem>
                              <MenuItem value="closed">مغلق</MenuItem>
                            </Select>
                          </FormControl>
                          {dayConfig.mode === 'specific_hours' && (
                            <>
                              <TextField
                                size="small"
                                type="time"
                                label="من"
                                value={dayConfig.openTime || '09:00'}
                                onChange={(e) => {
                                  const newConfig = businessHours.config?.filter((c: { day: number; mode: string; openTime?: string; closeTime?: string }) => c.day !== index) || [];
                                  newConfig.push({ ...dayConfig, openTime: e.target.value });
                                  setBusinessHours({ ...businessHours, config: newConfig });
                                }}
                                InputLabelProps={{ shrink: true }}
                              />
                              <TextField
                                size="small"
                                type="time"
                                label="إلى"
                                value={dayConfig.closeTime || '17:00'}
                                onChange={(e) => {
                                  const newConfig = businessHours.config?.filter((c: { day: number; mode: string; openTime?: string; closeTime?: string }) => c.day !== index) || [];
                                  newConfig.push({ ...dayConfig, closeTime: e.target.value });
                                  setBusinessHours({ ...businessHours, config: newConfig });
                                }}
                                InputLabelProps={{ shrink: true }}
                              />
                            </>
                          )}
                        </Box>
                      );
                    })}

                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveBusinessHours}
                      disabled={saving}
                      sx={{ mt: 2 }}
                    >
                      {saving ? <CircularProgress size={20} /> : 'حفظ ساعات العمل'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">اختر جلسة متصلة لعرض ساعات العمل</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>اختر الجلسة</InputLabel>
              <Select
                value={sessions.find(s => s.liveStatus === 'connected')?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadTemplates(e.target.value);
                  }
                }}
                label="اختر الجلسة"
              >
                {sessions.filter(s => s.liveStatus === 'connected').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loadingTemplates ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : templates.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                لا توجد قوالب رسائل. يمكنك إنشاء قوالب من خلال WhatsApp Business Manager.
              </Alert>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>قوالب الرسائل المعتمدة</Typography>
              {templates.map((template, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          اللغة: {template.language} | الفئة: {template.category}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {template.content || template.body}
                        </Typography>
                      </Box>
                      <Chip
                        label={template.status === 'APPROVED' ? 'معتمد' : template.status}
                        color={template.status === 'APPROVED' ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          )}
        </Grid>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Bell className="w-8 h-8 text-green-600" />
                  <Box>
                    <Typography variant="h5">الإشعارات التلقائية</Typography>
                    <Typography variant="body2" color="text.secondary">
                      إرسال إشعارات تلقائية للعملاء والموظفين عبر WhatsApp
                    </Typography>
                  </Box>
                </Box>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  يمكنك إعداد إشعارات تلقائية للطلبات، المنتجات، العربة المتروكة، التسويق، والموارد البشرية.
                </Alert>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip icon={<Package size={16} />} label="إشعارات الطلبات" />
                  <Chip icon={<ShoppingCart size={16} />} label="العربة المتروكة" />
                  <Chip icon={<Megaphone size={16} />} label="التسويق" />
                  <Chip icon={<Users size={16} />} label="الموارد البشرية" />
                </Box>
                
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    color="success"
                    onClick={() => navigate('/whatsapp/notifications')}
                    startIcon={<Bell />}
                  >
                    فتح إعدادات الإشعارات
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialogs */}
      {/* Create Session Dialog */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)}>
        <DialogTitle>إضافة جلسة WhatsApp جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="اسم الجلسة"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="مثال: رقم المبيعات"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateSession} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
        <DialogTitle>امسح QR Code بهاتفك</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          {currentQR && (
            <Box>
              <QRCode value={currentQR} size={256} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                افتح WhatsApp على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل الجلسة: {selectedSession?.name}</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="اسم الجلسة"
                value={selectedSession.name}
                onChange={(e) => setSelectedSession({ ...selectedSession, name: e.target.value })}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={selectedSession.aiEnabled}
                    onChange={(e) => setSelectedSession({ ...selectedSession, aiEnabled: e.target.checked })}
                  />
                }
                label="تفعيل الذكاء الصناعي"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={selectedSession.autoReply}
                    onChange={(e) => setSelectedSession({ ...selectedSession, autoReply: e.target.checked })}
                  />
                }
                label="الرد التلقائي"
              />

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>وضع AI</InputLabel>
                <Select
                  value={selectedSession.aiMode}
                  onChange={(e) => setSelectedSession({ ...selectedSession, aiMode: e.target.value })}
                  label="وضع AI"
                >
                  <MenuItem value="off">إيقاف</MenuItem>
                  <MenuItem value="suggest">اقتراح</MenuItem>
                  <MenuItem value="auto">تلقائي</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="رسالة الترحيب"
                value={selectedSession.welcomeMessage || ''}
                onChange={(e) => setSelectedSession({ ...selectedSession, welcomeMessage: e.target.value })}
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="رسالة عدم التواجد"
                value={selectedSession.awayMessage || ''}
                onChange={(e) => setSelectedSession({ ...selectedSession, awayMessage: e.target.value })}
                sx={{ mt: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={selectedSession.isDefault}
                    onChange={(e) => setSelectedSession({ ...selectedSession, isDefault: e.target.checked })}
                  />
                }
                label="جعلها الجلسة الافتراضية"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSession(null)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedSession) {
                handleUpdateSession(selectedSession.id, selectedSession);
                setSelectedSession(null);
              }
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Reply Dialog */}
      <Dialog
        open={quickReplyDialogOpen}
        onClose={() => setQuickReplyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingQuickReply ? 'تعديل الرد السريع' : 'إضافة رد سريع جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="العنوان"
              value={quickReplyForm.title}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, title: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="الاختصار"
              value={quickReplyForm.shortcut}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, shortcut: e.target.value })}
              placeholder="/welcome"
              helperText="اختصار للوصول السريع (اختياري)"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={quickReplyForm.category}
                onChange={(e) => setQuickReplyForm({ ...quickReplyForm, category: e.target.value })}
                label="التصنيف"
              >
                <MenuItem value="general">عام</MenuItem>
                <MenuItem value="welcome">ترحيب</MenuItem>
                <MenuItem value="thanks">شكر</MenuItem>
                <MenuItem value="apology">اعتذار</MenuItem>
                <MenuItem value="info">معلومات</MenuItem>
                <MenuItem value="order">طلبات</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="المحتوى"
              value={quickReplyForm.content}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, content: e.target.value })}
              helperText="يمكنك استخدام المتغيرات: {customer_name}, {order_number}, {product_name}"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickReplyDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveQuickReply} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      </div>
        </div>
      </div>
    </div>
  );
};


const WhatsAppSettings: React.FC = () => {
  return (
    <MuiThemeWrapper>
      <WhatsAppSettingsContent />
    </MuiThemeWrapper>
  );
};

export default WhatsAppSettings;

