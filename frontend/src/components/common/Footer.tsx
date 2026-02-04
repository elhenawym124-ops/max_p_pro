import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { footerSettingsService, FooterSettings } from '../../services/footerSettingsService';
import { useAuth } from '../../hooks/useAuthSimple';
import { apiClient } from '../../services/apiClient';

interface StorePage {
  id: string;
  title: string;
  slug: string;
  showInFooter: boolean;
  isActive: boolean;
}

const Footer: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [storePages, setStorePages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFooterSettings();
    loadStorePages();
  }, [user, searchParams]);

  const loadFooterSettings = async () => {
    try {
      // محاولة الحصول على companyId من عدة مصادر
      let companyId: string | null = null;

      // 1. من URL query params (للواجهة العامة)
      const urlCompanyId = searchParams.get('companyId');
      if (urlCompanyId) {
        companyId = urlCompanyId;
      }

      // 2. من user context (للمستخدمين المسجلين)
      if (!companyId && user?.companyId) {
        companyId = user.companyId;
      }

      // 3. من localStorage (استخدم storefront_companyId للاتساق مع storefrontApi)
      if (!companyId) {
        companyId = localStorage.getItem('storefront_companyId') || localStorage.getItem('companyId');
      }

      let response;
      if (companyId) {
        // استخدام Public API
        try {
          response = await footerSettingsService.getPublicSettings(companyId);
          // storefrontFetch returns { success: true, data: ... }
          if (response?.success && response?.data) {
            setSettings(response.data);
          } else if (response?.data) {
            // Fallback: maybe it's just the data
            setSettings(response.data);
          } else {
            throw new Error('Invalid response format');
          }
        } catch (publicError: any) {
          // If public endpoint fails (401/404), try authenticated endpoint if user is logged in
          if (user) {
            try {
              response = await footerSettingsService.getSettings();
              // apiClient.get returns { data: { data: ... } } (axios response structure)
              if (response?.data?.data) {
                setSettings(response.data.data);
              } else if (response?.data) {
                setSettings(response.data);
              } else {
                throw new Error('Invalid response format');
              }
            } catch (authError) {
              // Both failed, use defaults
              throw publicError; // Re-throw to use defaults
            }
          } else {
            // Not logged in and public endpoint failed, use defaults
            throw publicError; // Re-throw to use defaults
          }
        }
      } else {
        // Fallback to authenticated endpoint
        if (user) {
          response = await footerSettingsService.getSettings();
          // apiClient.get returns { data: { data: ... } } (axios response structure)
          if (response?.data?.data) {
            setSettings(response.data.data);
          } else if (response?.data) {
            setSettings(response.data);
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error('No companyId and user not logged in');
        }
      }
    } catch (error: any) {
      // Silently handle 401/403/404/500 errors - these are expected or server issues
      // Only log unexpected errors in development
      const status = error?.response?.status || error?.status;
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (status && ![401, 403, 404, 500].includes(status) && isDevelopment) {
        console.error('❌ [Footer] Error loading footer settings:', error);
      }

      // Use default settings on error (server issues or auth failures)
      setSettings({
        showAboutStore: true,
        showEmail: true,
        showPhone: true,
        showAddress: true,
        showQuickLinks: false, // لا نعرض الروابط السريعة للعملاء
        showCopyright: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStorePages = async () => {
    try {
      // Get companyId
      let companyId: string | null = null;
      const urlCompanyId = searchParams.get('companyId');
      if (urlCompanyId) {
        companyId = urlCompanyId;
      } else if (user?.companyId) {
        companyId = user.companyId;
      } else {
        companyId = localStorage.getItem('storefront_companyId') || localStorage.getItem('companyId');
      }

      if (!companyId) return;

      // Save companyId for future use (use storefront_companyId for consistency)
      localStorage.setItem('storefront_companyId', companyId);
      localStorage.setItem('companyId', companyId); // Keep for backward compatibility
      sessionStorage.setItem('currentCompanyId', companyId);

      // Fetch all active pages using apiClient
      const response = await apiClient.get(`/store-pages/${companyId}/public`, {
        params: { companyId }
      });

      if (response.data.success) {
        // Filter pages that should show in footer
        const footerPages = response.data.data.filter((page: StorePage) => page.showInFooter && page.isActive);
        setStorePages(footerPages);
        // Store pages loaded successfully
      }
    } catch (error: any) {
      // Only log unexpected errors (not 401/403/404 which are handled above)
      const status = error?.response?.status || error?.status;
      if (status && ![401, 403, 404].includes(status)) {
        console.error('❌ [Footer] Error loading store pages:', error);
      }
      setStorePages([]);
    }
  };

  if (loading) {
    return null; // or a loading skeleton
  }

  return (
    <footer className="storefront-footer bg-gray-800 text-white py-8 mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* About Store */}
          {settings?.showAboutStore && settings?.aboutStore && (
            <div>
              <h3 className="text-lg font-semibold mb-4">عن المتجر</h3>
              <p className="text-gray-300 text-sm">
                {settings.aboutStore}
              </p>
            </div>
          )}

          {/* Contact Information */}
          {(settings?.showEmail || settings?.showPhone || settings?.showAddress) && (
            <div>
              <h4 className="text-md font-semibold mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-sm">
                {settings?.showEmail && settings?.email && (
                  <li className="flex items-center text-gray-300">
                    <span className="ml-2">📧</span>
                    <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings?.showPhone && settings?.phone && (
                  <li className="flex items-center text-gray-300">
                    <span className="ml-2">📱</span>
                    <a href={`tel:${settings.phone}`} className="hover:text-white transition-colors">
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings?.showAddress && settings?.address && (
                  <li className="flex items-start text-gray-300">
                    <span className="ml-2 mt-1">📍</span>
                    <span>{settings.address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Store Pages */}
          {storePages.length > 0 && (
            <div>
              <h4 className="text-md font-semibold mb-4">معلومات المتجر</h4>
              <ul className="space-y-2">
                {storePages.map((page) => (
                  <li key={page.id}>
                    <Link
                      to={`/shop/page/${page.slug}?companyId=${searchParams.get('companyId') || ''}`}
                      className="text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Copyright */}
        {settings?.showCopyright && settings?.copyrightText && (
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              {settings.copyrightText.replace('{year}', new Date().getFullYear().toString())}
            </p>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;

