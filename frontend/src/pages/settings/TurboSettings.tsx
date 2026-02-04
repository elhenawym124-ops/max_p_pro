import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RocketLaunchIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  KeyIcon,
  LinkIcon,
  ArrowLeftIcon,
  TicketIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface TurboSettings {
  turboEnabled: boolean;
  turboAutoCreate: boolean;
  turboApiKey: string;
  turboMainClientCode: number | null;
  turboSenderNumber: string;
  turboWebhookUrl: string;
  turboWebhookToken: string;
  hasApiKey: boolean;
  maskedApiKey: string;
}

const TurboSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TurboSettings>({
    turboEnabled: false,
    turboAutoCreate: false,
    turboApiKey: '',
    turboMainClientCode: null,
    turboSenderNumber: '',
    turboWebhookUrl: '',
    turboWebhookToken: '',
    hasApiKey: false,
    maskedApiKey: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketType, setTicketType] = useState(1); // Default to inquiry type
  const [inquiryTypeId, setInquiryTypeId] = useState<number | null>(null);
  const [sendingTicket, setSendingTicket] = useState(false);
  const [inquiriesTypes, setInquiriesTypes] = useState<Array<{id: number, name: string, nameEn?: string}>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  // Removed selectedTicket, ticketLog, loadingTicketLog since we navigate to separate page now
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState({ tickets: 0, missions: 0, orders: 0 });
  const [activeTab, setActiveTab] = useState<'settings' | 'tickets'>('settings');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.turboEnabled) {
      loadInquiriesTypes();
      loadTickets();
      loadUnreadCount();
    }
  }, [settings.turboEnabled]);

  useEffect(() => {
    if (settings.turboEnabled) {
      loadTickets();
    }
  }, [ticketsPage]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/store-settings/turbo');
      if (response.data.success) {
        setSettings({
          turboEnabled: response.data.data.turboEnabled || false,
          turboAutoCreate: response.data.data.turboAutoCreate || false,
          turboApiKey: '',
          turboMainClientCode: response.data.data.turboMainClientCode || null,
          turboSenderNumber: response.data.data.turboSenderNumber || '',
          turboWebhookUrl: response.data.data.turboWebhookUrl || '',
          turboWebhookToken: response.data.data.turboWebhookToken || '',
          hasApiKey: response.data.data.hasApiKey || false,
          maskedApiKey: response.data.data.maskedApiKey || ''
        });
      }
    } catch (error: any) {
      console.error('Error loading Turbo settings:', error);
      toast.error('فشل تحميل إعدادات Turbo');
    } finally {
      setLoading(false);
    }
  };

  const loadInquiriesTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await apiClient.get('/turbo/inquiries-types');
      if (response.data.success && response.data.data?.types) {
        const typesData = response.data.data.types;
        const typesArray = Array.isArray(typesData) ? typesData : [];
        setInquiriesTypes(typesArray);
        // Set default inquiry_type_id to first type if available
        if (typesArray.length > 0) {
          setInquiryTypeId(typesArray[0].id || typesArray[0].type || null);
        }
      } else {
        // Fallback to default types
        setInquiriesTypes([
          { id: 1, name: 'شكوى' },
          { id: 2, name: 'استفسار' },
          { id: 3, name: 'شكر' }
        ]);
      }
    } catch (error: any) {
      console.error('Error loading inquiries types:', error);
      // Fallback to default types
      setInquiriesTypes([
        { id: 1, name: 'شكوى' },
        { id: 2, name: 'استفسار' },
        { id: 3, name: 'شكر' }
      ]);
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadTickets = async () => {
    if (!settings.turboEnabled) return;
    
    try {
      setLoadingTickets(true);
      const response = await apiClient.get(`/turbo/tickets?page=${ticketsPage}&per_page=${ticketsPerPage}`);
      
      console.log('📋 Tickets response:', response.data);
      
      if (response.data.success) {
        const ticketsData = response.data.data?.tickets || [];
        const paginationData = response.data.data?.pagination || {};
        
        console.log('📊 Tickets data:', ticketsData);
        console.log('📄 Pagination:', paginationData);
        
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
        setTicketsTotal(paginationData.total || 0);
      } else {
        console.error('❌ Tickets API failed:', response.data);
        setTickets([]);
        setTicketsTotal(0);
      }
    } catch (error: any) {
      console.error('❌ Error loading tickets:', error);
      toast.error('فشل تحميل التذاكر');
      setTickets([]);
      setTicketsTotal(0);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!settings.turboEnabled) return;
    
    try {
      const response = await apiClient.get('/turbo/tickets/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data.counts || { tickets: 0, missions: 0, orders: 0 });
      }
    } catch (error: any) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleViewTicket = (ticketId: number) => {
    // Navigate to ticket details page
    navigate(`/settings/turbo/ticket/${ticketId}`);
  };

  const handleSendTicket = async () => {
    if (!ticketDescription.trim()) {
      toast.error('يرجى إدخال وصف التذكرة');
      return;
    }

    // Validate required fields based on type
    if (ticketType === 1 && !inquiryTypeId) {
      toast.error('يرجى اختيار نوع الاستفسار');
      return;
    }

    try {
      setSendingTicket(true);
      const requestData: any = {
        description: ticketDescription.trim(),
        type: ticketType
      };

      // type 1 (inquiry) requires inquiry_type_id
      if (ticketType === 1 && inquiryTypeId) {
        requestData.inquiryTypeId = inquiryTypeId;
      }

      const response = await apiClient.post('/turbo/tickets', requestData);

      if (response.data.success) {
        toast.success('تم إرسال التذكرة بنجاح');
        setTicketDescription('');
        setTicketType(1);
        setInquiryTypeId(null);
        loadTickets();
        loadUnreadCount();
      } else {
        toast.error(response.data.message || 'فشل إرسال التذكرة');
      }
    } catch (error: any) {
      console.error('Error sending ticket:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'فشل إرسال التذكرة');
    } finally {
      setSendingTicket(false);
    }
  };

  const handleSave = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error('يرجى إدخال Turbo API Key');
      return;
    }

    if (settings.turboEnabled && !settings.turboApiKey && !settings.hasApiKey) {
      toast.error('يرجى إدخال Turbo API Key لتفعيل Turbo');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put('/store-settings/turbo', {
        turboApiKey: settings.turboApiKey || undefined,
        turboMainClientCode: settings.turboMainClientCode || undefined,
        turboSenderNumber: settings.turboSenderNumber || undefined,
        turboEnabled: settings.turboEnabled,
        turboAutoCreate: settings.turboAutoCreate,
        turboWebhookUrl: settings.turboWebhookUrl || undefined,
        turboWebhookToken: settings.turboWebhookToken || undefined
      });

      if (response.data.success) {
        toast.success('تم حفظ إعدادات Turbo بنجاح');
        loadSettings(); // Reload to get updated masked key
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حفظ الإعدادات');
      console.error('Error saving Turbo settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error('يرجى إدخال Turbo API Key أولاً');
      return;
    }

    try {
      setSaving(true);
      // Test by trying to calculate shipping cost (simple test)
      const response = await apiClient.post('/turbo/calculate', {
        city: 'القاهرة',
        address: 'test',
        items: [{ weight: 1, dimensions: { length: 10, width: 10, height: 10 } }]
      });
      if (response.data.success) {
        toast.success('✅ الاتصال بـ Turbo يعمل بشكل صحيح!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل الاتصال بـ Turbo. تحقق من API Key');
      console.error('Error testing Turbo connection:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/store-settings')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 ml-2" />
          العودة لإعدادات المتجر
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <RocketLaunchIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          إعدادات Turbo للشحن
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          تكامل مع شركة Turbo للشحن - إدارة API Key والإعدادات
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <KeyIcon className="h-5 w-5 ml-2" />
            الإعدادات
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`${
              activeTab === 'tickets'
                ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center relative`}
          >
            <TicketIcon className="h-5 w-5 ml-2" />
            التذاكر
            {unreadCount.tickets > 0 && (
              <span className="mr-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded-full">
                {unreadCount.tickets}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'settings' && (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
        {/* Status Card */}
        <div className={`p-4 rounded-lg border-2 ${
          settings.turboEnabled 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {settings.turboEnabled ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 ml-2" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 ml-2" />
              )}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {settings.turboEnabled ? 'Turbo مفعّل' : 'Turbo معطّل'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.turboEnabled 
                    ? 'خدمة Turbo للشحن نشطة وجاهزة للاستخدام'
                    : 'قم بتفعيل Turbo وإدخال API Key للبدء'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.turboEnabled}
                onChange={(e) => setSettings({ ...settings, turboEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* API Key Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Turbo API Key</h3>
          </div>
          
          <div className="space-y-4">
            {settings.hasApiKey && settings.maskedApiKey && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">API Key الحالي:</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                    {settings.maskedApiKey}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {showApiKey ? 'إخفاء' : 'تحديث API Key'}
                  </button>
                </div>
              </div>
            )}

            {(showApiKey || !settings.hasApiKey) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {settings.hasApiKey ? 'API Key جديد' : 'Turbo API Key'}
                </label>
                <input
                  type="password"
                  value={settings.turboApiKey}
                  onChange={(e) => setSettings({ ...settings, turboApiKey: e.target.value })}
                  placeholder="أدخل Turbo API Key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  يمكنك الحصول على API Key من{' '}
                  <a 
                    href="https://portal.turbo-eg.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    بوابة Turbo
                  </a>
                </p>
              </div>
            )}

            <button
              onClick={handleTestConnection}
              disabled={saving || (!settings.turboApiKey && !settings.hasApiKey)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <InformationCircleIcon className="h-4 w-4 ml-1" />
              اختبار الاتصال
            </button>
          </div>
        </div>

        {/* Main Client Code Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Main Client Code</h3>
          </div>
          
          <div className="space-y-2">
            <input
              type="number"
              value={settings.turboMainClientCode || ''}
              onChange={(e) => setSettings({ ...settings, turboMainClientCode: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="37321"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Main Client Code الخاص بك من Turbo (مثال: 37321)
            </p>
          </div>
        </div>

        {/* Sender Number Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">رقم الراسل</h3>
          </div>
          
          <div className="space-y-2">
            <input
              type="text"
              value={settings.turboSenderNumber || ''}
              onChange={(e) => setSettings({ ...settings, turboSenderNumber: e.target.value })}
              placeholder="01000000000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              رقم هاتف الراسل الذي سيتم إرساله مع كل شحنة Turbo (مثال: 01000000000)
            </p>
          </div>
        </div>

        {/* Auto Create Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                الشحن التلقائي
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إنشاء شحنة Turbo تلقائياً لأي طلب يتم تأكيده. إذا كان معطلاً، يجب إنشاء الشحنة يدوياً من صفحة تفاصيل الطلب.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.turboAutoCreate}
                onChange={(e) => setSettings({ ...settings, turboAutoCreate: e.target.checked })}
                disabled={!settings.turboEnabled}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!settings.turboEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
            </label>
          </div>
        </div>

        {/* Webhook URL Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Webhook URL (اختياري)</h3>
          </div>
          
          <div className="space-y-2">
            <input
              type="url"
              value={settings.turboWebhookUrl}
              onChange={(e) => setSettings({ ...settings, turboWebhookUrl: e.target.value })}
              placeholder="https://yourdomain.com/api/v1/turbo/webhook"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              رابط لاستقبال تحديثات حالة الشحنات من Turbo تلقائياً
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              مثال: {window.location.origin}/api/v1/turbo/webhook
            </p>
          </div>
        </div>

        {/* Webhook Token Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Webhook Token (اختياري)</h3>
          </div>
          
          <div className="space-y-2">
            <input
              type="password"
              value={settings.turboWebhookToken}
              onChange={(e) => setSettings({ ...settings, turboWebhookToken: e.target.value })}
              placeholder="Bearer Token"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Token اختياري للتحقق من صحة webhook requests من Turbo
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              سيتم استخدام هذا الـ Token للبحث عن الشركة عند استقبال webhook
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-800 dark:text-indigo-300">
                <h4 className="font-medium mb-2">معلومات مهمة:</h4>
                <ul className="list-disc list-inside space-y-1 text-indigo-700 dark:text-indigo-400">
                  <li>يجب الحصول على Turbo API Key من بوابة Turbo أولاً</li>
                  <li>رقم الراسل سيتم إرساله كـ api_followup_phone مع كل شحنة Turbo</li>
                  <li>عند تفعيل "الشحن التلقائي"، سيتم إنشاء شحنة تلقائياً عند تأكيد أي طلب</li>
                  <li>إذا كان الشحن التلقائي معطلاً، يجب إنشاء الشحنات يدوياً من صفحة تفاصيل الطلب</li>
                  <li>Webhook URL اختياري - يستخدم لتلقي تحديثات حالة الشحنات تلقائياً</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving || (settings.turboEnabled && !settings.turboApiKey && !settings.hasApiKey)}
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
        {/* Send Ticket Section */}
        <div>
          <div className="flex items-center mb-4">
            <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">إرسال تذكرة جديدة</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع التذكرة
              </label>
              <select
                value={ticketType}
                onChange={(e) => {
                  setTicketType(parseInt(e.target.value));
                  if (parseInt(e.target.value) !== 1) {
                    setInquiryTypeId(null);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
              >
                <option value={1}>استفسار (Inquiry)</option>
                <option value={2}>شكوى (Complain)</option>
                <option value={3}>شكر (Gratitude)</option>
                <option value={4}>اقتراح (Suggestion)</option>
              </select>
            </div>

            {/* Show inquiry type selector only when type = 1 (inquiry) */}
            {ticketType === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع الاستفسار <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                {loadingTypes ? (
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    جاري تحميل الأنواع...
                  </div>
                ) : (
                  <select
                    value={inquiryTypeId || ''}
                    onChange={(e) => setInquiryTypeId(parseInt(e.target.value))}
                    disabled={!Array.isArray(inquiriesTypes) || inquiriesTypes.length === 0}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">اختر نوع الاستفسار</option>
                    {Array.isArray(inquiriesTypes) && inquiriesTypes.length > 0 ? (
                      inquiriesTypes.map((type) => (
                        <option key={type.id || type.type} value={type.id || type.type}>
                          {type.name || type.nameEn || `نوع ${type.id || type.type}`}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>نوع 1</option>
                        <option value={2}>نوع 2</option>
                        <option value={3}>نوع 3</option>
                      </>
                    )}
                  </select>
                )}
                {(!Array.isArray(inquiriesTypes) || inquiriesTypes.length === 0) && !loadingTypes && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    جاري تحميل أنواع الاستفسارات...
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                وصف التذكرة
              </label>
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={5}
                placeholder="اكتب وصف التذكرة هنا..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {ticketDescription.length} حرف
              </p>
            </div>

            <button
              onClick={handleSendTicket}
              disabled={sendingTicket || !ticketDescription.trim() || !settings.turboEnabled}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <PaperAirplaneIcon className="h-4 w-4 ml-1" />
              {sendingTicket ? 'جاري الإرسال...' : 'إرسال التذكرة'}
            </button>

            {!settings.turboEnabled && (
              <p className="text-xs text-red-500 dark:text-red-400">
                يجب تفعيل Turbo أولاً لإرسال التذاكر
              </p>
            )}
          </div>
        </div>

        {/* Tickets List Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">قائمة التذاكر</h3>
              {unreadCount.tickets > 0 && (
                <span className="mr-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded-full">
                  {unreadCount.tickets} غير مقروء
                </span>
              )}
            </div>
            <button
              onClick={loadTickets}
              disabled={loadingTickets}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {loadingTickets ? 'جاري التحديث...' : 'تحديث'}
            </button>
          </div>

          {loadingTickets ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">جاري تحميل التذاكر...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد تذاكر</div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(tickets) && tickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => handleViewTicket(ticket.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">#{ticket.id}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.status === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          ticket.status === 1 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {ticket.status === 0 ? 'جديد' : ticket.status === 1 ? 'قيد المعالجة' : 'مغلق'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ticket.description || 'لا يوجد وصف'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {ticketsTotal > ticketsPerPage && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <button
                    onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                    disabled={ticketsPage === 1 || loadingTickets}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    صفحة {ticketsPage} من {Math.ceil(ticketsTotal / ticketsPerPage)}
                  </span>
                  <button
                    onClick={() => setTicketsPage(p => p + 1)}
                    disabled={ticketsPage >= Math.ceil(ticketsTotal / ticketsPerPage) || loadingTickets}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
};

export default TurboSettings;


