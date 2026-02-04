import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

const AffiliateCustomers: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/affiliates/customers');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
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
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>عملائي</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>جميع العملاء المرتبطين بك</p>
          </div>
          <button
            onClick={() => navigate('/affiliates/orders/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء طلب لعملاء
          </button>
        </div>

        {customers.length > 0 ? (
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
                      الهاتف
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      البريد الإلكتروني
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      عدد الطلبات
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      إجمالي المشتريات
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                  {customers.map((customer) => (
                    <tr key={customer.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {customer.phone}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {customer.email || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-1">
                          <ShoppingBagIcon className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          {customer.totalOrders}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        <div className="flex items-center gap-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          {formatPrice(customer.totalSpent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/affiliates/orders/create?customerId=${customer.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          إنشاء طلب
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`text-center py-12 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <UserGroupIcon className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>لا يوجد عملاء مرتبطين بك بعد</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateCustomers;

