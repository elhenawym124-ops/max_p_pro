import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Footer from '../common/Footer';
import { useFacebookPixel } from '../../hooks/useFacebookPixel';
import { getCompanyId } from '../../utils/storefrontApi';

interface StorefrontLayoutProps {
  children: React.ReactNode;
}

const StorefrontLayout: React.FC<StorefrontLayoutProps> = ({ children }) => {
  const [searchParams] = useSearchParams();

  // الحصول على companyId من URL أو من getCompanyId
  const companyIdFromUrl = searchParams.get('companyId');
  const companyId = companyIdFromUrl || getCompanyId();

  // تحميل Facebook Pixel
  if (companyId) {
    // ✅ حفظ companyId في localStorage قبل تحميل الـ Footer
    localStorage.setItem('storefront_companyId', companyId);
  }

  useFacebookPixel(companyId || undefined);

  // 🛡️ FORCE LIGHT MODE for Storefront
  // This ensures the storefront always looks correct regardless of dashboard settings
  React.useEffect(() => {
    const root = document.documentElement;

    // Remove dark mode class
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      root.classList.add('light');

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#ffffff');
      }
    }
  }, []); // Run on mount

  return (
    <div className="min-h-screen bg-gray-50">
      {/* StorefrontNav is now used directly in each page */}
      <main className="pb-8">
        {children}
      </main>

      {/* Dynamic Footer */}
      <Footer />
    </div>
  );
};

export default StorefrontLayout;
