import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { homepageService, HomepageTemplate } from '../../services/homepageService';
import StorefrontNav from '../../components/StorefrontNav';
import { updateSEO } from '../../utils/seo';
import analyticsService from '../../services/analyticsService';

// Import section components
import HeroSection from '../../components/homepage/HeroSection';
import FeaturesSection from '../../components/homepage/FeaturesSection';
import ProductsSection from '../../components/homepage/ProductsSection';
import BannerSection from '../../components/homepage/BannerSection';
import CategoriesSection from '../../components/homepage/CategoriesSection';
import TestimonialsSection from '../../components/homepage/TestimonialsSection';
import CustomSection from '../../components/homepage/CustomSection';
import WoodmartReplica from './WoodmartReplica';

const Homepage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [template, setTemplate] = useState<HomepageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Determine company ID from multiple sources
    const determineCompanyId = () => {
      // 1. From URL query parameter (highest priority)
      const urlCompanyId = searchParams.get('companyId');
      if (urlCompanyId) {
        console.log('🏢 [Homepage] Company ID from URL:', urlCompanyId);
        return urlCompanyId;
      }

      // 2. From localStorage (saved from previous visit)
      const savedCompanyId = localStorage.getItem('currentCompanyId');
      if (savedCompanyId) {
        console.log('🏢 [Homepage] Company ID from localStorage:', savedCompanyId);
        return savedCompanyId;
      }

      // 3. From subdomain (for production)
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
        console.log('🏢 [Homepage] Company from subdomain:', subdomain);
        // In production, you would fetch company by slug/subdomain
        return subdomain;
      }

      console.warn('⚠️ [Homepage] No company ID found');
      return null;
    };

    const id = determineCompanyId();
    setCompanyId(id);

    // Save to localStorage for future use
    if (id) {
      localStorage.setItem('currentCompanyId', id);
      loadHomepage(id);
      
      // Track store visit
      analyticsService.trackStoreVisit(window.location.pathname);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadHomepage = async (id: string) => {
    try {
      setLoading(true);
      console.log('🔍 [Homepage] Loading homepage for company:', id);

      // Load active homepage for this company
      const response = await homepageService.getPublicActiveTemplate(id);
      console.log('📦 [Homepage] API Response:', {
        success: response.data.success,
        hasData: !!response.data.data,
        data: response.data.data ? {
          name: response.data.data.name,
          id: response.data.data.id,
          isActive: response.data.data.isActive
        } : null,
        debug: response.data.debug
      });

      if (response.data.success && response.data.data) {
        console.log('✅ [Homepage] Template loaded:', response.data.data.name);
        const loadedTemplate = response.data.data;
        setTemplate(loadedTemplate);

        // Update SEO
        const content = typeof loadedTemplate.content === 'string'
          ? JSON.parse(loadedTemplate.content)
          : loadedTemplate.content;

        updateSEO({
          title: loadedTemplate.name || 'الصفحة الرئيسية',
          description: loadedTemplate.description || 'مرحباً بك في متجرنا',
          url: window.location.href,
          type: 'website'
        });
      } else {
        console.warn('⚠️ [Homepage] No active template found for company:', id);
        console.warn('⚠️ [Homepage] Response:', response.data);
        if (response.data.debug) {
          console.warn('⚠️ [Homepage] Debug info:', response.data.debug);
        }
      }
    } catch (error: any) {
      console.error('❌ [Homepage] Error loading homepage:', error);
      console.error('❌ [Homepage] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response?.status === 404) {
        console.warn('⚠️ [Homepage] No homepage template found for this company');
        if (error.response?.data?.debug) {
          console.warn('⚠️ [Homepage] Debug info:', error.response.data.debug);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <StorefrontNav />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </>
    );
  }

  if (!template) {
    return (
      <>
        <StorefrontNav />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              مرحباً بك في متجرنا
            </h2>
            <p className="text-gray-600 mb-6">
              الصفحة الرئيسية قيد الإعداد
            </p>
            <a
              href={`/shop?companyId=${companyId || ''}`}
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              تصفح المنتجات
            </a>
          </div>
        </div>
      </>
    );
  }

  const content = typeof template.content === 'string'
    ? JSON.parse(template.content)
    : template.content;

  const settings = content.settings || {};

  // Special Handling for Woodmart Replica Theme
  if (settings.themeId === 'woodmart') {
    return (
      <div className="homepage-woodmart-replcia">
        {/* WoodmartReplica handles its own Header/Footer/Layout */}
        <WoodmartReplica />
      </div>
    );
  }

  return (
    <div className="homepage" style={{
      fontFamily: settings.typography?.fontFamily || 'Cairo, sans-serif'
    }}>
      {/* Navigation Bar */}
      <StorefrontNav />

      {/* Render all sections */}
      {content.sections && content.sections.map((section: any, index: number) => {
        const key = section.id || `section-${index}`;

        switch (section.type) {
          case 'hero':
            return <HeroSection key={key} section={section} settings={settings} />;

          case 'features':
            return <FeaturesSection key={key} section={section} settings={settings} />;

          case 'products':
            return <ProductsSection key={key} section={section} settings={settings} />;

          case 'banner':
            return <BannerSection key={key} section={section} settings={settings} />;

          case 'categories':
            return <CategoriesSection key={key} section={section} settings={settings} />;

          case 'testimonials':
            return <TestimonialsSection key={key} section={section} settings={settings} />;

          case 'custom':
            return <CustomSection key={key} section={section} settings={settings} />;

          default:
            return null;
        }
      })}
    </div>
  );
};

export default Homepage;
