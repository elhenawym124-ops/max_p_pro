import { apiClient } from './apiClient';
import { envConfig } from '../config/environment';

/**
 * 📋 Service لإدارة إعدادات فورم الشيك أوت
 */

export interface CheckoutFormSettings {
  id: string;
  companyId: string;

  // حقول معلومات العميل
  showGuestName: boolean;
  requireGuestName: boolean;
  showGuestPhone: boolean;
  requireGuestPhone: boolean;
  showGuestEmail: boolean;
  requireGuestEmail: boolean;

  // حقول عنوان الشحن
  showCity: boolean;
  requireCity: boolean;
  showShippingAddress: boolean;
  requireShippingAddress: boolean;

  // حقول إضافية
  showPaymentMethod: boolean;
  showNotes: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CheckoutFormSettingsUpdate {
  showGuestName?: boolean;
  requireGuestName?: boolean;
  showGuestPhone?: boolean;
  requireGuestPhone?: boolean;
  showGuestEmail?: boolean;
  requireGuestEmail?: boolean;
  showCity?: boolean;
  requireCity?: boolean;
  showShippingAddress?: boolean;
  requireShippingAddress?: boolean;
  showPaymentMethod?: boolean;
  showNotes?: boolean;
}

export const checkoutFormSettingsService = {
  /**
   * جلب إعدادات فورم الشيك أوت للشركة (محمي)
   */
  getSettings: async () => {
    return apiClient.get('/checkout-form-settings');
  },

  /**
   * تحديث إعدادات فورم الشيك أوت (محمي)
   */
  updateSettings: async (data: CheckoutFormSettingsUpdate) => {
    return apiClient.post('/checkout-form-settings', data);
  },

  /**
   * إعادة تعيين الإعدادات للقيم الافتراضية (محمي)
   */
  resetSettings: async () => {
    return apiClient.post('/checkout-form-settings/reset', {});
  },

  /**
   * جلب إعدادات فورم الشيك أوت للواجهة العامة (عام - بدون مصادقة)
   */
  getPublicSettings: async (companyId: string) => {
    try {
      const response = await fetch(`${envConfig.apiUrl}/public/checkout-form-settings/${companyId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching public checkout form settings:', error);
      // إرجاع القيم الافتراضية في حالة الخطأ
      return {
        success: true,
        data: {
          showGuestName: true,
          requireGuestName: true,
          showGuestPhone: true,
          requireGuestPhone: true,
          showGuestEmail: true,
          requireGuestEmail: false,
          showCity: true,
          requireCity: true,
          showShippingAddress: true,
          requireShippingAddress: true,
          showPaymentMethod: true,
          showNotes: true
        }
      };
    }
  }
};
