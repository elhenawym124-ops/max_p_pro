import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/urlHelper';

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  connectedAt: string;
  companyName: string;
  companyId: string;
  isActive: boolean;
  daysSinceConnection: number | null;
}

interface FacebookStatus {
  totalPages: number;
  activePages: number;
  inactivePages: number;
  pages: FacebookPage[];
}

const FacebookStatusPage: React.FC = () => {
  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testPageId, setTestPageId] = useState('');
  const [testing, setTesting] = useState(false);

  const loadFacebookStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(buildApiUrl('facebook-status'));
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error || 'فشل في تحميل حالة Facebook');
      }
    } catch (err) {
      console.error('Error loading Facebook status:', err);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const testMessageSend = async () => {
    if (!testMessage.trim() || !testRecipientId.trim()) {
      alert('يرجى إدخال الرسالة ومعرف المستلم');
      return;
    }

    try {
      setTesting(true);
      
      const response = await fetch(buildApiUrl('facebook-status/test-message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: testRecipientId,
          message: testMessage,
          pageId: testPageId || undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ تم إرسال الرسالة التجريبية بنجاح!');
        console.log('Test result:', data.data);
      } else {
        alert(`❌ فشل في إرسال الرسالة التجريبية: ${data.error}`);
        console.error('Test error:', data);
      }
    } catch (err) {
      console.error('Error testing message:', err);
      alert('خطأ في إرسال الرسالة التجريبية');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    loadFacebookStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل حالة Facebook...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadFacebookStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">حالة صفحات Facebook</h1>
            <button 
              onClick={loadFacebookStatus}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              تحديث
            </button>
          </div>

          {/* إحصائيات عامة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">إجمالي الصفحات</h3>
              <p className="text-3xl font-bold text-blue-600">{status?.totalPages || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">الصفحات النشطة</h3>
              <p className="text-3xl font-bold text-green-600">{status?.activePages || 0}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800">الصفحات غير النشطة</h3>
              <p className="text-3xl font-bold text-red-600">{status?.inactivePages || 0}</p>
            </div>
          </div>

          {/* قائمة الصفحات */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">تفاصيل الصفحات</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-right">اسم الصفحة</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">معرف الصفحة</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">الشركة</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">الحالة</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">تاريخ الاتصال</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">أيام منذ الاتصال</th>
                  </tr>
                </thead>
                <tbody>
                  {status?.pages.map((page) => (
                    <tr key={page.id} className={page.isActive ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="border border-gray-300 px-4 py-2">{page.pageName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{page.pageId}</td>
                      <td className="border border-gray-300 px-4 py-2">{page.companyName}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          page.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}>
                          {page.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {page.connectedAt ? new Date(page.connectedAt).toLocaleDateString('ar-SA') : 'غير محدد'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {page.daysSinceConnection !== null ? `${page.daysSinceConnection} يوم` : 'غير محدد'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* اختبار إرسال الرسائل */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">اختبار إرسال الرسائل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معرف المستلم (Facebook ID)
                </label>
                <input
                  type="text"
                  value={testRecipientId}
                  onChange={(e) => setTestRecipientId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="مثال: 1234567890123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معرف الصفحة (اختياري)
                </label>
                <input
                  type="text"
                  value={testPageId}
                  onChange={(e) => setTestPageId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="اتركه فارغاً لاستخدام الصفحة الافتراضية"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الرسالة التجريبية
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                placeholder="اكتب رسالة تجريبية هنا..."
              />
            </div>
            <button
              onClick={testMessageSend}
              disabled={testing}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {testing ? 'جاري الإرسال...' : 'إرسال رسالة تجريبية'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookStatusPage;

