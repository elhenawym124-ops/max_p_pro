import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Bell, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { config } from '../../config';

interface ScheduledOrderSettings {
  enabled: boolean;
  minScheduleDays: number;
  maxScheduleDays: number;
  autoTransitionDaysBefore: number;
  targetStatusAfterTransition: string;
  sendCustomerNotification: boolean;
  sendStaffNotification: boolean;
  allowTimeSelection: boolean;
}

interface Stats {
  total: number;
  pending: number;
  upcoming: number;
  overdue: number;
}

const ScheduledOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ScheduledOrderSettings>({
    enabled: true,
    minScheduleDays: 1,
    maxScheduleDays: 90,
    autoTransitionDaysBefore: 0,
    targetStatusAfterTransition: 'CONFIRMED',
    sendCustomerNotification: true,
    sendStaffNotification: true,
    allowTimeSelection: true
  });
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    upcoming: 0,
    overdue: 0
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`${config.apiUrl}/scheduled-orders/settings`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`${config.apiUrl}/scheduled-orders/stats`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`${config.apiUrl}/scheduled-orders/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'تم حفظ الإعدادات بنجاح');
        loadStats();
      } else {
        showMessage('error', 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const runManualTransition = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`${config.apiUrl}/scheduled-orders/transition`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', `تم معالجة ${data.processed} طلب بنجاح`);
        loadStats();
      }
    } catch (error) {
      console.error('Error running transition:', error);
      showMessage('error', 'فشل في تشغيل التحويل اليدوي');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الطلبات المجدولة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">قيد الانتظار</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">قادمة (7 أيام)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.upcoming}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">متأخرة</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.overdue}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">الإعدادات العامة</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">تفعيل الطلبات المجدولة</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">السماح للموظفين بإنشاء طلبات مجدولة</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                الحد الأدنى للجدولة (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={settings.minScheduleDays}
                onChange={(e) => setSettings({ ...settings, minScheduleDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الحد الأدنى للمدة قبل موعد الاستلام</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                الحد الأقصى للجدولة (أيام)
              </label>
              <input
                type="number"
                min="1"
                value={settings.maxScheduleDays}
                onChange={(e) => setSettings({ ...settings, maxScheduleDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">أقصى مدة يمكن جدولة الطلب فيها</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              التحويل التلقائي قبل الموعد (أيام)
            </label>
            <input
              type="number"
              min="0"
              value={settings.autoTransitionDaysBefore}
              onChange={(e) => setSettings({ ...settings, autoTransitionDaysBefore: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0 = التحويل في نفس اليوم، 1 = قبل يوم واحد، إلخ
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              الحالة المستهدفة بعد التحويل
            </label>
            <select
              value={settings.targetStatusAfterTransition}
              onChange={(e) => setSettings({ ...settings, targetStatusAfterTransition: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="CONFIRMED">مؤكد</option>
              <option value="PROCESSING">قيد التجهيز</option>
              <option value="PENDING">قيد الانتظار</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الحالة التي سينتقل إليها الطلب تلقائياً</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="customerNotif"
                checked={settings.sendCustomerNotification}
                onChange={(e) => setSettings({ ...settings, sendCustomerNotification: e.target.checked })}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="customerNotif" className="text-sm font-medium text-gray-900 dark:text-white">
                إرسال إشعار للعميل عند التحويل
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="staffNotif"
                checked={settings.sendStaffNotification}
                onChange={(e) => setSettings({ ...settings, sendStaffNotification: e.target.checked })}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="staffNotif" className="text-sm font-medium text-gray-900 dark:text-white">
                إرسال إشعار للموظفين عند التحويل
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="timeSelection"
                checked={settings.allowTimeSelection}
                onChange={(e) => setSettings({ ...settings, allowTimeSelection: e.target.checked })}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="timeSelection" className="text-sm font-medium text-gray-900 dark:text-white">
                السماح باختيار وقت محدد للاستلام
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>

          <button
            onClick={runManualTransition}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Bell className="w-4 h-4" />
            تشغيل التحويل يدوياً
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduledOrderSettings;
