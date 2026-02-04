/**
 * 📊 Conversion API (CAPI) Dashboard
 * 
 * لوحة تحكم لإدارة وإرسال أحداث التحويل عبر Facebook Conversion API
 */

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Activity,
  Send,
  ShoppingCart,
  UserPlus,
  Eye,
  CreditCard,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  History,
  TrendingUp,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

interface ConversionEvent {
  id: string;
  eventName: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  value?: number;
  currency?: string;
}

const ConversionApiDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'settings'>('send');
  const [recentEvents, setRecentEvents] = useState<ConversionEvent[]>([]);

  const [eventData, setEventData] = useState({
    pixelId: '',
    eventName: 'Purchase',
    eventSourceUrl: '',
    // User Data
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    city: '',
    country: 'SA',
    // Custom Data
    value: 0,
    currency: 'SAR',
    contentIds: '',
    contentType: 'product',
    contentName: '',
    numItems: 1,
    orderId: '',
    // Action Source
    actionSource: 'website' as const
  });

  const eventTypes = [
    { value: 'Purchase', label: 'شراء', icon: CreditCard, color: 'green' },
    { value: 'Lead', label: 'عميل محتمل', icon: UserPlus, color: 'blue' },
    { value: 'AddToCart', label: 'إضافة للسلة', icon: ShoppingCart, color: 'orange' },
    { value: 'ViewContent', label: 'مشاهدة محتوى', icon: Eye, color: 'purple' },
    { value: 'InitiateCheckout', label: 'بدء الدفع', icon: CreditCard, color: 'indigo' },
    { value: 'CompleteRegistration', label: 'إكمال التسجيل', icon: CheckCircle, color: 'teal' },
    { value: 'Contact', label: 'تواصل', icon: Phone, color: 'pink' },
    { value: 'Subscribe', label: 'اشتراك', icon: Mail, color: 'cyan' }
  ];

  const currencies = [
    { code: 'SAR', name: 'ريال سعودي' },
    { code: 'AED', name: 'درهم إماراتي' },
    { code: 'EGP', name: 'جنيه مصري' },
    { code: 'USD', name: 'دولار أمريكي' },
    { code: 'EUR', name: 'يورو' }
  ];

  const actionSources = [
    { value: 'website', label: 'موقع ويب' },
    { value: 'app', label: 'تطبيق' },
    { value: 'phone_call', label: 'مكالمة هاتفية' },
    { value: 'chat', label: 'محادثة' },
    { value: 'email', label: 'بريد إلكتروني' },
    { value: 'physical_store', label: 'متجر فعلي' }
  ];

  const handleSendEvent = async () => {
    if (!eventData.pixelId) {
      toast.error('يرجى إدخال معرف Facebook Pixel');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        pixelId: eventData.pixelId,
        eventName: eventData.eventName,
        actionSource: eventData.actionSource
      };

      // Add event source URL if provided
      if (eventData.eventSourceUrl) {
        payload.eventSourceUrl = eventData.eventSourceUrl;
      }

      // Add user data
      const userData: any = {};
      if (eventData.email) userData.email = eventData.email;
      if (eventData.phone) userData.phone = eventData.phone;
      if (eventData.firstName) userData.firstName = eventData.firstName;
      if (eventData.lastName) userData.lastName = eventData.lastName;
      if (eventData.city) userData.city = eventData.city;
      if (eventData.country) userData.country = eventData.country;
      
      if (Object.keys(userData).length > 0) {
        payload.userData = userData;
      }

      // Add custom data for purchase events
      if (eventData.eventName === 'Purchase' || eventData.value > 0) {
        const customData: any = {};
        if (eventData.value > 0) {
          customData.value = eventData.value;
          customData.currency = eventData.currency;
        }
        if (eventData.contentIds) {
          customData.contentIds = eventData.contentIds.split(',').map(id => id.trim());
        }
        if (eventData.contentType) customData.contentType = eventData.contentType;
        if (eventData.contentName) customData.contentName = eventData.contentName;
        if (eventData.numItems > 0) customData.numItems = eventData.numItems;
        if (eventData.orderId) customData.orderId = eventData.orderId;

        if (Object.keys(customData).length > 0) {
          payload.customData = customData;
        }
      }

      await facebookAdsService.sendConversionEvent(payload);

      // Add to recent events
      const newEvent: ConversionEvent = {
        id: Date.now().toString(),
        eventName: eventData.eventName,
        timestamp: new Date().toISOString(),
        status: 'success',
        value: eventData.value,
        currency: eventData.currency
      };
      setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]);

      toast.success('تم إرسال الحدث بنجاح! ✅');
    } catch (error: any) {
      console.error('Error sending event:', error);
      
      // Add failed event
      const failedEvent: ConversionEvent = {
        id: Date.now().toString(),
        eventName: eventData.eventName,
        timestamp: new Date().toISOString(),
        status: 'failed'
      };
      setRecentEvents(prev => [failedEvent, ...prev.slice(0, 9)]);

      toast.error(error?.response?.data?.error || 'فشل في إرسال الحدث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Conversion API (CAPI)
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إرسال أحداث التحويل مباشرة إلى Facebook لتحسين تتبع الإعلانات</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">نجح اليوم</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">فشل اليوم</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">معدل النجاح</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">92%</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الأحداث</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <div className="flex">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'send'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Send className="w-5 h-5" />
              إرسال حدث
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <History className="w-5 h-5" />
              السجل
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              الإعدادات
            </button>
          </div>
        </div>

        {/* Send Event Tab */}
        {activeTab === 'send' && (
          <div className="p-6 space-y-6">
            {/* Pixel ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">معرف Facebook Pixel *</label>
              <input
                type="text"
                value={eventData.pixelId}
                onChange={(e) => setEventData(prev => ({ ...prev, pixelId: e.target.value }))}
                placeholder="أدخل معرف الـ Pixel"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع الحدث</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {eventTypes.map((event) => {
                  const Icon = event.icon;
                  const isSelected = eventData.eventName === event.value;
                  return (
                    <button
                      key={event.value}
                      onClick={() => setEventData(prev => ({ ...prev, eventName: event.value }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-${event.color}-500 dark:border-${event.color}-400 bg-${event.color}-50 dark:bg-${event.color}-900/20`
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? `text-${event.color}-600` : 'text-gray-400'}`} />
                      <div className={`text-sm font-medium ${isSelected ? `text-${event.color}-700 dark:text-${event.color}-300` : 'text-gray-700 dark:text-gray-300'}`}>
                        {event.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Data */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">بيانات المستخدم (اختياري)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  value={eventData.email}
                  onChange={(e) => setEventData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="البريد الإلكتروني"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="tel"
                  value={eventData.phone}
                  onChange={(e) => setEventData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="رقم الهاتف"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.firstName}
                  onChange={(e) => setEventData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="الاسم الأول"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.lastName}
                  onChange={(e) => setEventData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="اسم العائلة"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Purchase Data */}
            {(eventData.eventName === 'Purchase' || eventData.eventName === 'AddToCart') && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">بيانات الشراء</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">القيمة</label>
                    <input
                      type="number"
                      value={eventData.value}
                      onChange={(e) => setEventData(prev => ({ ...prev, value: Number(e.target.value) }))}
                      placeholder="0"
                      min={0}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">العملة</label>
                    <select
                      value={eventData.currency}
                      onChange={(e) => setEventData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">رقم الطلب</label>
                    <input
                      type="text"
                      value={eventData.orderId}
                      onChange={(e) => setEventData(prev => ({ ...prev, orderId: e.target.value }))}
                      placeholder="ORD-123"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مصدر الحدث</label>
              <select
                value={eventData.actionSource}
                onChange={(e) => setEventData(prev => ({ ...prev, actionSource: e.target.value as any }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {actionSources.map((source) => (
                  <option key={source.value} value={source.value}>{source.label}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleSendEvent}
              disabled={loading || !eventData.pixelId}
              className="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  إرسال الحدث
                </>
              )}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            {recentEvents.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد أحداث مسجلة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        event.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {event.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{event.eventName}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    {event.value && (
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          {event.value.toLocaleString()} {event.currency}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">نصائح لتحسين CAPI</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• أرسل أكبر قدر ممكن من بيانات المستخدم لتحسين المطابقة</li>
                <li>• استخدم نفس Pixel ID المستخدم في موقعك</li>
                <li>• أرسل الأحداث في الوقت الفعلي للحصول على أفضل النتائج</li>
                <li>• تأكد من تشفير البيانات الحساسة قبل الإرسال</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionApiDashboard;
