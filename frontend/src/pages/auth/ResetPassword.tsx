import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/services/apiClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * Reset Password Page Component
 * 
 * Handles password reset with token
 */

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      toast.error('رمز إعادة التعيين غير صحيح');
      navigate('/auth/forgot-password');
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      
      await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      
      setIsSuccess(true);
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'فشل في إعادة تعيين كلمة المرور';
      setError('root', { message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-600 rounded-xl flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              تم بنجاح!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              تم إعادة تعيين كلمة المرور بنجاح. سيتم توجيهك إلى صفحة تسجيل الدخول...
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="btn btn-primary btn-md"
            >
              الذهاب إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            إعادة تعيين كلمة المرور
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            أدخل كلمة المرور الجديدة لحسابك
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                كلمة المرور الجديدة
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', {
                    required: 'كلمة المرور مطلوبة',
                    minLength: {
                      value: 8,
                      message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: 'كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام ورموز',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="أدخل كلمة مرور قوية"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                تأكيد كلمة المرور
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword', {
                    required: 'تأكيد كلمة المرور مطلوب',
                    validate: (value) =>
                      value === password || 'كلمة المرور غير متطابقة',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="أعد إدخال كلمة المرور"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              متطلبات كلمة المرور:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  password && password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                8 أحرف على الأقل
              </li>
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  password && /[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                حرف كبير واحد على الأقل
              </li>
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  password && /[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                حرف صغير واحد على الأقل
              </li>
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  password && /\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                رقم واحد على الأقل
              </li>
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  password && /[@$!%*?&]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                رمز خاص واحد على الأقل
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.root.message}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-md w-full"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                'إعادة تعيين كلمة المرور'
              )}
            </button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
