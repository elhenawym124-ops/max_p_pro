import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { tokenManager } from '../../utils/tokenManager';

const CustomerRegister: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      const searchParams = new URLSearchParams(window.location.search);
      const companyIdFromQuery = searchParams.get('companyId');
      const companyIdFromPath = typeof params.companyId === 'string' ? params.companyId : null;
      const companyIdFromStorage = localStorage.getItem('storefront_companyId');
      const companyId = (companyIdFromQuery || companyIdFromPath || companyIdFromStorage || '').trim();

      if (companyIdFromQuery) {
        localStorage.setItem('storefront_companyId', companyIdFromQuery);
      }

      if (!companyIdFromQuery && companyIdFromPath) {
        localStorage.setItem('storefront_companyId', companyIdFromPath);
      }

      const normalizedPhone = phone.trim();
      if (!normalizedPhone) {
        throw new Error('رقم الهاتف مطلوب');
      }

      if (!companyId) {
        throw new Error('لا يمكن تحديد الشركة. افتح الرابط من داخل متجر الشركة أو أضف companyId في رابط الصفحة');
      }

      if (step === 'PHONE') {
        const response = await apiClient.post(`/public/customers/request-otp?companyId=${encodeURIComponent(companyId)}`, {
          phone: normalizedPhone
        });

        if (response.data?.success) {
          setSuccessMessage('تم إرسال كود التحقق على واتساب');
          setStep('OTP');
          return;
        }

        setError(response.data?.message || 'تعذر إرسال كود التحقق');
        return;
      }

      const normalizedCode = code.trim();
      if (!normalizedCode || normalizedCode.length !== 4) {
        throw new Error('يرجى إدخال كود مكون من 4 أرقام');
      }

      const response = await apiClient.post(`/public/customers/verify-otp?companyId=${encodeURIComponent(companyId)}`, {
        phone: normalizedPhone,
        code: normalizedCode
      });

      if (response.data?.success && response.data?.data?.token) {
        tokenManager.setAccessToken(response.data.data.token);
        setSuccessMessage('تم تسجيل الدخول بنجاح');
        navigate('/account/whatsapp');
        return;
      }

      setError(response.data?.message || 'تعذر تسجيل الدخول');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">تسجيل عميل جديد</h2>
          <p className="mt-2 text-sm text-gray-600">
            أو{' '}
            <Link to="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              تسجيل الدخول
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">{successMessage}</div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                رقم الهاتف
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError('');
                }}
                required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="01xxxxxxxxx"
                disabled={isLoading || step === 'OTP'}
              />
            </div>

            {step === 'OTP' && (
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  كود واتساب (4 أرقام)
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="1234"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? <LoadingSpinner size="sm" color="white" /> : step === 'PHONE' ? 'إرسال كود واتساب' : 'تأكيد الكود'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerRegister;
