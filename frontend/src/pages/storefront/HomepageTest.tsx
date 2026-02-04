import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

const HomepageTest: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const companyId = searchParams.get('companyId');

    console.log('🧪 [HomepageTest] Starting test...');
    console.log('🧪 [HomepageTest] Company ID:', companyId);

    if (!companyId) {
      setError('No companyId provided');
      setLoading(false);
      return;
    }

    loadData(companyId);
  }, [searchParams]);

  const loadData = async (companyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/homepage/public/${companyId}`);

      console.log('🧪 [HomepageTest] Response:', response);
      setData(response.data);

    } catch (err: any) {
      console.error('🧪 [HomepageTest] Error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ خطأ</div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">✅ نجح التحميل!</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">البيانات المستلمة:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-gray-900">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div className="mt-8 bg-green-100 border border-green-400 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🎉 الصفحة تعمل بدون تسجيل دخول!
          </h3>
          <p className="text-green-700">
            إذا رأيت هذه الرسالة، فهذا يعني أن الصفحة العامة تعمل بشكل صحيح.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomepageTest;

