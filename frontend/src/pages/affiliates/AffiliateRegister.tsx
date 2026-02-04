import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';

const AffiliateRegister: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'MARKUP',
    commissionRate: 5.0,
    paymentMethod: '',
    paymentDetails: {
      bankAccount: '',
      phoneNumber: '',
      bankName: ''
    },
    minPayout: 100.0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.post('/affiliates/register', formData);
      
      if (response.data.success) {
        toast.success('تم تسجيلك كمسوق بنجاح!');
        navigate('/affiliates/dashboard');
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
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>تسجيل كمسوق</h1>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          انضم إلى برنامج المسوقين وابدأ في كسب العمولات من كل عملية بيع
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Commission Type */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              نوع العمولة
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                formData.commissionType === 'PERCENTAGE' 
                  ? isDark ? 'border-blue-500 bg-blue-900/30' : 'border-blue-600 bg-blue-50'
                  : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="commissionType"
                  value="PERCENTAGE"
                  checked={formData.commissionType === 'PERCENTAGE'}
                  onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as 'PERCENTAGE' })}
                  className="mr-2"
                />
                <div>
                  <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>نسبة مئوية</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>نسبة من السعر النهائي</div>
                </div>
              </label>

              <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                formData.commissionType === 'MARKUP' 
                  ? isDark ? 'border-blue-500 bg-blue-900/30' : 'border-blue-600 bg-blue-50'
                  : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="commissionType"
                  value="MARKUP"
                  checked={formData.commissionType === 'MARKUP'}
                  onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as 'MARKUP' })}
                  className="mr-2"
                />
                <div>
                  <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>هامش ربح</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>إضافة هامش على السعر الثابت</div>
                </div>
              </label>
            </div>
          </div>

          {/* Commission Rate (for PERCENTAGE) */}
          {formData.commissionType === 'PERCENTAGE' && (
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                نسبة العمولة (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              طريقة الدفع المفضلة
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
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
                      className={`w-full px-4 py-2 border rounded-lg ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
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
                      className={`w-full px-4 py-2 border rounded-lg ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </>
              )}

              {(formData.paymentMethod === 'VODAFONE_CASH' || formData.paymentMethod === 'ORANGE_CASH') && (
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
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Min Payout */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              الحد الأدنى للسحب (جنيه)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.minPayout}
              onChange={(e) => setFormData({ ...formData, minPayout: parseFloat(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>

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
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل كمسوق'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`px-6 py-3 border rounded-lg transition ${
                isDark 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateRegister;
