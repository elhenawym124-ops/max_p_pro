import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';

type JwtPayload = {
  role?: string;
  companyId?: string;
  phone?: string;
  customerId?: string;
  userId?: string;
};

const CustomerWhatsApp: React.FC = () => {
  const navigate = useNavigate();

  const token = tokenManager.getAccessToken();

  const payload = useMemo<JwtPayload | null>(() => {
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      return JSON.parse(atob(payloadBase64));
    } catch (e) {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      const companyId = localStorage.getItem('storefront_companyId');
      const url = companyId ? `/auth/customer-register?companyId=${encodeURIComponent(companyId)}` : '/auth/customer-register';
      navigate(url);
      return;
    }

    if (payload?.role !== 'CUSTOMER') {
      navigate('/auth/login');
    }
  }, [navigate, payload, token]);

  if (!token || payload?.role !== 'CUSTOMER') return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">واتساب العميل</h1>
        <p className="mt-2 text-gray-600">
          تم تسجيل الدخول بنجاح باستخدام كود واتساب.
        </p>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <div>
            <span className="font-medium">رقم الهاتف:</span> {payload?.phone || '-'}
          </div>
          <div>
            <span className="font-medium">Customer ID:</span> {payload?.customerId || payload?.userId || '-'}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/shop')}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            الرجوع للمتجر
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerWhatsApp;
