import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BellIcon,
  CogIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface NotificationSettings {
  userId: string;
  companyId: string;
  globalEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  channels: {
    push: {
      enabled: boolean;
      sound: boolean;
      vibration: boolean;
      badge: boolean;
    };
    email: {
      enabled: boolean;
      address: string;
      frequency: string;
      format: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber: string;
      frequency: string;
    };
    inApp: {
      enabled: boolean;
      showBadge: boolean;
      autoMarkRead: boolean;
    };
  };
  typeSettings: {
    [key: string]: {
      enabled: boolean;
      channels: string[];
      priority: string;
      customSound: string | null;
    };
  };
}

interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  defaultEnabled: boolean;
  channels: string[];
  canDisable: boolean;
}

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'types' | 'stats'>('general');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user settings
      const settingsResponse = await api.get('/notifications/settings/1');
      if (settingsResponse.data.success) {
        setSettings(settingsResponse.data.data);
      }

      // Load notification types
      const typesResponse = await api.get('/notifications/types?companyId=1');
      if (typesResponse.data.success) {
        setNotificationTypes(typesResponse.data.data);
      }

      // Load stats
      const statsResponse = await api.get('/notifications/stats/1');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await api.put('/notifications/settings/1', settings);

      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async (type: string, channel: string) => {
    try {
      await api.post('/notifications/test', {
        userId: '1',
        testConfig: {
          type,
          channel,
          message: 'هذا إشعار تجريبي',
        },
      });
    } catch (error) {
      console.error('Error testing notification:', error);
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings };
    const keys = path.split('.');
    let current = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setSettings(newSettings);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'push':
        return <DevicePhoneMobileIcon className="h-5 w-5" />;
      case 'email':
        return <EnvelopeIcon className="h-5 w-5" />;
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
      case 'inApp':
        return <BellIcon className="h-5 w-5" />;
      default:
        return <BellIcon className="h-5 w-5" />;
    }
  };

  const getChannelName = (channel: string) => {
    const names = {
      push: 'الإشعارات المنبثقة',
      email: 'البريد الإلكتروني',
      sms: 'الرسائل النصية',
      inApp: 'داخل التطبيق',
    };
    return names[channel] || channel;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CogIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 ml-3" />
            إعدادات الإشعارات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تخصيص تفضيلات الإشعارات وقنوات التواصل
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
          ) : (
            <CheckCircleIcon className="h-4 w-4 ml-2" />
          )}
          حفظ الإعدادات
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CogIcon className="h-5 w-5 inline ml-2" />
            الإعدادات العامة
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'types'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BellIcon className="h-5 w-5 inline ml-2" />
            أنواع الإشعارات
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BellIcon className="h-5 w-5 inline ml-2" />
            الإحصائيات
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Global Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">الإعدادات العامة</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">تفعيل الإشعارات</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تفعيل أو إيقاف جميع الإشعارات</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.globalEnabled}
                    onChange={(e) => updateSettings('globalEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">ساعات الهدوء</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تعطيل الإشعارات في أوقات محددة</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.quietHours.enabled}
                      onChange={(e) => updateSettings('quietHours.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        من الساعة
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.startTime}
                        onChange={(e) => updateSettings('quietHours.startTime', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        إلى الساعة
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.endTime}
                        onChange={(e) => updateSettings('quietHours.endTime', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Channel Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">قنوات الإشعارات</h3>
            
            <div className="space-y-6">
              {/* Push Notifications */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600 ml-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">الإشعارات المنبثقة</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">إشعارات على الجهاز المحمول</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.channels.push.enabled}
                      onChange={(e) => updateSettings('channels.push.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.channels.push.enabled && (
                  <div className="space-y-3 mr-9">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">الصوت</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.channels.push.sound}
                          onChange={(e) => updateSettings('channels.push.sound', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">الاهتزاز</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.channels.push.vibration}
                          onChange={(e) => updateSettings('channels.push.vibration', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">شارة العدد</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.channels.push.badge}
                          onChange={(e) => updateSettings('channels.push.badge', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Notifications */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-6 w-6 text-green-600 ml-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">البريد الإلكتروني</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">إشعارات عبر البريد الإلكتروني</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.channels.email.enabled}
                      onChange={(e) => updateSettings('channels.email.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.channels.email.enabled && (
                  <div className="space-y-3 mr-9">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        عنوان البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={settings.channels.email.address}
                        onChange={(e) => updateSettings('channels.email.address', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="example@domain.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        تكرار الإرسال
                      </label>
                      <select
                        value={settings.channels.email.frequency}
                        onChange={(e) => updateSettings('channels.email.frequency', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="immediate">فوري</option>
                        <option value="hourly">كل ساعة</option>
                        <option value="daily">يومي</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SMS Notifications */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600 ml-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">الرسائل النصية</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">إشعارات عبر الرسائل النصية</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.channels.sms.enabled}
                      onChange={(e) => updateSettings('channels.sms.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.channels.sms.enabled && (
                  <div className="space-y-3 mr-9">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={settings.channels.sms.phoneNumber}
                        onChange={(e) => updateSettings('channels.sms.phoneNumber', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+966501234567"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'types' && (
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">{type.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(type.priority)} dark:text-gray-300`}>
                        {type.priority === 'high' ? 'عالية' : type.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                      {!type.canDisable && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          إجباري
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{type.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تفعيل الإشعار</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.typeSettings[type.id]?.enabled ?? type.defaultEnabled}
                            onChange={(e) => updateSettings(`typeSettings.${type.id}.enabled`, e.target.checked)}
                            disabled={!type.canDisable}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                        </label>
                      </div>

                      {settings.typeSettings[type.id]?.enabled && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">القنوات المفعلة:</span>
                          <div className="flex flex-wrap gap-2">
                            {type.channels.map((channel) => (
                              <label key={channel} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.typeSettings[type.id]?.channels?.includes(channel) ?? false}
                                  onChange={(e) => {
                                    const currentChannels = settings.typeSettings[type.id]?.channels || [];
                                    const newChannels = e.target.checked
                                      ? [...currentChannels, channel]
                                      : currentChannels.filter(c => c !== channel);
                                    updateSettings(`typeSettings.${type.id}.channels`, newChannels);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                  {getChannelIcon(channel)}
                                  <span className="mr-1">{getChannelName(channel)}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mr-4">
                    <button
                      onClick={() => handleTestNotification(type.id, 'push')}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="اختبار الإشعار"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BellIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      إجمالي المرسل
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.delivered.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      معدل الفتح
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {Math.round(stats.engagement.openRate * 100)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      وقت الاستجابة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.engagement.responseTime}ث
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DevicePhoneMobileIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      القناة المفضلة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {getChannelName(stats.preferences.mostUsedChannel)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">توزيع القنوات</h3>
            <div className="space-y-3">
              {Object.entries(stats.delivered.byChannel).map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getChannelIcon(channel)}
                    <span className="mr-2 text-sm font-medium text-gray-900 dark:text-white">
                      {getChannelName(channel)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">الاتجاهات الأسبوعية</h3>
            <div className="space-y-3">
              {stats.trends.map((trend: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{trend.period}</span>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>مرسل: {trend.delivered}</span>
                    <span>مفتوح: {trend.opened}</span>
                    <span>نقرات: {trend.clicked}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
