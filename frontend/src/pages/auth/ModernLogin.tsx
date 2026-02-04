import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ChatBubbleLeftRightIcon, SparklesIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuthSimple';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const ModernLogin: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/conversations-improved';

  // Animation effect for the logo
  const [logoAnimation, setLogoAnimation] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoAnimation(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccess('جاري تسجيل الدخول...');

      const userData = await login(formData);
      setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');

      // Determine redirect path based on user role
      let redirectPath = from;

      if (userData) {
        // Check if user is a system/admin role
        const systemRoles = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'];
        const isSystemRole = systemRoles.includes(userData.role);

        if (isSystemRole) {
          redirectPath = '/super-admin';
        } else {
          // Company members go to company dashboard
          redirectPath = '/company-dashboard';
        }
      }

      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى');
      setSuccess('');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-bounce"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full animate-ping"></div>
        <div className="absolute top-20 right-1/3 w-24 h-24 bg-white/5 rounded-full animate-pulse delay-1000"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className={`transform transition-all duration-1000 ${logoAnimation ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <ChatBubbleLeftRightIcon className="h-20 w-20 text-white" />
                <SparklesIcon className="h-8 w-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div className="text-right">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Smart Chat
                </h1>
                <p className="text-blue-100 text-xl mt-2">نظام الدردشة الذكي</p>
              </div>
            </div>
          </div>

          <div className="text-center max-w-lg">
            <h2 className="text-3xl font-semibold mb-6">مرحباً بك في المستقبل</h2>
            <p className="text-blue-100 text-lg leading-relaxed mb-8">
              نظام دردشة متطور مدعوم بالذكاء الصناعي لإدارة محادثات العملاء بكفاءة عالية وتجربة استخدام استثنائية
            </p>

            <div className="grid grid-cols-1 gap-6 text-left">
              <div className="flex items-center space-x-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-lg">🤖 ذكاء صناعي متقدم</span>
              </div>
              <div className="flex items-center space-x-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-300"></div>
                <span className="text-lg">📊 تحليلات في الوقت الفعلي</span>
              </div>
              <div className="flex items-center space-x-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-700"></div>
                <span className="text-lg">🔒 أمان عالي المستوى</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Mobile Header */}
          <div className="text-center lg:hidden mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Chat</h2>
            <p className="text-gray-600 dark:text-gray-400">نظام الدردشة الذكي</p>
          </div>

          {/* Desktop Header */}
          <div className="text-center hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              تسجيل الدخول
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              أدخل بياناتك للوصول إلى لوحة التحكم
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 animate-shake">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Field */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  البريد الإلكتروني *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm"
                    placeholder="example@smartchat.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  كلمة المرور *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                  تذكرني لمدة 30 يوم
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/auth/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <LockClosedIcon className="h-5 w-5 text-white group-hover:text-blue-100 transition-colors" />
                  )}
                </span>
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ليس لديك حساب؟{' '}
              <Link
                to="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
            <p>
              بتسجيل الدخول، أنت توافق على{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 underline transition-colors">
                شروط الخدمة
              </a>{' '}
              و{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 underline transition-colors">
                سياسة الخصوصية
              </a>
            </p>
            <p className="mt-2 text-gray-400">
              © 2025 Smart Chat System. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLogin;
