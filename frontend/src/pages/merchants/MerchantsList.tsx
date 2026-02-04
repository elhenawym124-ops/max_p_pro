import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import {
  PlusIcon,
  PencilIcon,
  ShoppingBagIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  commissionRate: number;
  _count: {
    orders: number;
  };
}

const MerchantsList: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/merchants');
      if (response.data.success) {
        setMerchants(response.data.data);
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب التجار');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>التجار</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>إدارة تجار الدروب شيبنج</p>
          </div>
          <button
            onClick={() => navigate('/merchants/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة تاجر
          </button>
        </div>

        {merchants.length > 0 ? (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      الاسم
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      البريد الإلكتروني
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      الهاتف
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      نسبة العمولة
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      عدد الطلبات
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      الحالة
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                  {merchants.map((merchant) => (
                    <tr key={merchant.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {merchant.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {merchant.email}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {merchant.phone || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {merchant.commissionRate}%
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {merchant._count?.orders || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          merchant.isActive 
                            ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                            : isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                        }`}>
                          {merchant.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/merchants/${merchant.id}`)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                          >
                            <EyeIcon className="h-4 w-4" />
                            عرض
                          </button>
                          <button
                            onClick={() => navigate(`/merchants/${merchant.id}/edit`)}
                            className={`flex items-center gap-1 transition ${
                              isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            <PencilIcon className="h-4 w-4" />
                            تعديل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`text-center py-12 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <ShoppingBagIcon className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا يوجد تجار بعد</p>
            <button
              onClick={() => navigate('/merchants/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              إضافة تاجر
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantsList;

