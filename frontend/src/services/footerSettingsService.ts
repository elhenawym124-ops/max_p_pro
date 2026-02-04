import { apiClient } from './apiClient';

export interface FooterSettings {
  id?: string;
  companyId?: string;
  aboutStore?: string;
  showAboutStore: boolean;
  email?: string;
  showEmail: boolean;
  phone?: string;
  showPhone: boolean;
  address?: string;
  showAddress: boolean;
  showQuickLinks: boolean;
  copyrightText?: string;
  showCopyright: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class FooterSettingsService {
  /**
   * Get footer settings
   */
  async getSettings() {
    return apiClient.get<{ data: FooterSettings }>('/footer-settings');
  }

  /**
   * Update footer settings
   */
  async updateSettings(data: Partial<FooterSettings>) {
    return apiClient.put<{ data: FooterSettings }>('/footer-settings', data);
  }

  /**
   * Reset footer settings to defaults
   */
  async resetSettings() {
    return apiClient.post<{ data: FooterSettings }>('/footer-settings/reset');
  }

  /**
   * Get public footer settings (for storefront)
   */
  async getPublicSettings(companyId: string) {
    try {
      // Use storefrontFetch for public routes (no authentication required)
      // Note: storefrontFetch adds /api/v1/public automatically, so we only need the endpoint
      const { storefrontFetch } = await import('../utils/storefrontApi');
      return await storefrontFetch(`/footer-settings/${companyId}`);
    } catch (error: any) {
      // Silently handle errors - footer settings are optional
      // storefrontFetch throws Error with status property
      const status = error?.status || (error?.message?.includes('401') ? 401 : error?.message?.includes('404') ? 404 : 0);
      if (status !== 401 && status !== 404) {
        // Only log non-401/404 errors
        console.error('Error fetching public footer settings:', error);
      }
      // Return null silently - footer settings are optional
      return { success: true, data: null };
    }
  }
}

export const footerSettingsService = new FooterSettingsService();
