import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { getBaseDomain, getCurrentSubdomain } from '../../utils/storeUrl';
import toast from 'react-hot-toast';

const PublicAffiliateRegister: React.FC = () => {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const subdomain = getCurrentSubdomain();

  // Use subdomain if available using standard utility, otherwise fallback to route param
  const slug = subdomain || routeSlug;

  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    paymentMethod: '',
    paymentDetails: {
      bankAccount: '',
      phoneNumber: '',
      bankName: ''
    }
  });

  // بناء رابط الدخول بعد التسجيل
  const getLoginUrl = () => {
    const baseDomain = getBaseDomain();
    const protocol = window.location.protocol;
    const isProduction = !baseDomain.includes('localhost');

    if (isProduction) {
      return `${protocol}//${baseDomain}/auth/login`;
    }
    return `${protocol}//${baseDomain}/auth/login`;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // إضافة بيانات المستخدم للتسجيل (بدون ربط بشركة)
      const registrationData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        paymentMethod: formData.paymentMethod,
        paymentDetails: formData.paymentDetails,
        companySlug: slug // إرسال slug الشركة للتسجيل
      };

      // تسجيل عام بدون ربط بشركة - الشركة/الإدارة ستقوم بالربط لاحقاً
      const response = await apiClient.post('/public/affiliates/register', registrationData);

      if (response.data.success) {
        // حفظ token إذا كان موجوداً
        if (response.data.data?.token) {
          localStorage.setItem('accessToken', response.data.data.token);
        }

        if (slug) {
          toast.success(`تم تسجيلك كمسوق لدى ${company?.name || 'الشركة'} بنجاح!`);
        } else {
          toast.success('تم تسجيلك كمسوق بنجاح! سيتم مراجعة طلبك وربطك بشركة قريباً');
        }

        // توجيه إلى صفحة تسجيل الدخول
        window.location.href = getLoginUrl();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className={`max-w-2xl mx-auto ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
          تسجيل كمسوق {company ? `لدى ${company.name}` : ''}
        </h1>

        {company && company.logo && (
          <div className="mb-6 flex justify-center">
            <img src={company.logo} alt={company.name} className="h-20 object-contain" />
          </div>
        )}

        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          انضم إلى برنامج المسوقين وابدأ في كسب العمولات من كل عملية بيع
          <br />
          {!company && (
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              سيتم مراجعة طلبك وربطك بشركة من قبل الإدارة
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Registration Fields */}
          <div className="space-y-4 pb-4 border-b">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>بيانات المستخدم</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  الاسم الأول
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  اسم العائلة
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
                  }`}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              طريقة الدفع المفضلة
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
                }`}
              required
            >
              <option value="">اختر طريقة الدفع</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش</option>
              <option value="ORANGE_CASH">أورنج كاش</option>
              <option value="INSTAPAY">إنستاباي</option>
            </select>
          </div>

          {/* Payment Details */}
          {formData.paymentMethod && (
            <div className={`space-y-4 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>تفاصيل الدفع</h3>

              {formData.paymentMethod === 'BANK_TRANSFER' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      اسم البنك
                    </label>
                    <input
                      type="text"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, bankName: e.target.value }
                      })}
                      className={`w-full px-4 py-2 border rounded-lg ${isDark
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      رقم الحساب
                    </label>
                    <input
                      type="text"
                      value={formData.paymentDetails.bankAccount}
                      onChange={(e) => setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, bankAccount: e.target.value }
                      })}
                      className={`w-full px-4 py-2 border rounded-lg ${isDark
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      required
                    />
                  </div>
                </>
              )}

              {(formData.paymentMethod === 'VODAFONE_CASH' || formData.paymentMethod === 'ORANGE_CASH' || formData.paymentMethod === 'INSTAPAY') && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    رقم المحفظة
                  </label>
                  <input
                    type="text"
                    value={formData.paymentDetails.phoneNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      paymentDetails: { ...formData.paymentDetails, phoneNumber: e.target.value }
                    })}
                    className={`w-full px-4 py-2 border rounded-lg ${isDark
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Terms */}
          <div className={`${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
            <h3 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-900'} mb-2`}>شروط وأحكام البرنامج</h3>
            <ul className={`text-sm space-y-1 list-disc list-inside ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
              <li>العمولات تُحسب فوراً عند استكمال الطلب</li>
              <li>يمكنك سحب الأرباح عند الوصول للحد الأدنى</li>
              <li>الدفع يتم خارج المنصة ويتم تسجيله بعد الدفع الفعلي</li>
              <li>يمكنك إنشاء طلبات لنفسك أو لعملاء آخرين</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل كمسوق'}
            </button>
            <button
              type="button"
              onClick={() => window.location.href = getLoginUrl()}
              className={`px-6 py-3 border rounded-lg transition ${isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              لدي حساب بالفعل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicAffiliateRegister;
