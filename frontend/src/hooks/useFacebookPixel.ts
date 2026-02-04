/**
 * React Hook لتحميل Facebook Pixel تلقائياً
 * 
 * يتم استدعاؤه في StorefrontLayout لتحميل Pixel في الواجهة العامة
 */

import { useEffect, useState } from 'react';
import { loadFacebookPixel, trackPageView, needsCAPIOnly, isBraveBrowser, isIOSDevice } from '../utils/facebookPixel';
import { storefrontSettingsService } from '../services/storefrontSettingsService';

export const useFacebookPixel = (companyId: string | undefined) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [pixelId, setPixelId] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      console.warn('⚠️ [useFacebookPixel] No companyId provided, skipping Pixel load');
      return;
    }

    // جلب إعدادات المتجر
    const loadPixelSettings = async () => {
      console.log('📡 [useFacebookPixel] Starting to load settings for companyId:', companyId);
      
      try {
        // Force refresh to ensure we get latest Pixel settings
        const response = await storefrontSettingsService.getPublicSettings(companyId, true);
        
        console.log('📡 [useFacebookPixel] Settings response received', {
          success: response.success,
          hasData: !!response.data,
          facebookPixelEnabled: response.data?.facebookPixelEnabled,
          facebookPixelId: response.data?.facebookPixelId,
          pixelTrackPageView: response.data?.pixelTrackPageView
        });
        
        if (response.success && response.data) {
          const settings = response.data;
          
          // التحقق من أن Pixel مفعّل
          if (settings.facebookPixelEnabled && settings.facebookPixelId) {
            const isBrave = isBraveBrowser();
            const isIOS = isIOSDevice();
            const needsCAPI = needsCAPIOnly();
            
            const currentPath = window.location.pathname;
            const isShopPage = currentPath === '/shop' || currentPath.startsWith('/shop/');
            
            console.log('🎯 [Facebook Pixel] Loading Pixel ID:', settings.facebookPixelId);
            console.log('🎯 [Facebook Pixel] Settings:', {
              enabled: settings.facebookPixelEnabled,
              pixelId: settings.facebookPixelId,
              trackPageView: settings.pixelTrackPageView,
              facebookConvApiEnabled: settings.facebookConvApiEnabled,
              hasConvApiToken: !!settings.facebookConvApiToken,
              currentPage: currentPath,
              isShopPage
            });
            
            if (isShopPage) {
              console.log('🛍️ [Facebook Pixel] Shop page detected - Pixel will track PageView here');
            }
            
            console.log('📊 [Facebook Pixel] Device detection:', {
              isBraveBrowser: isBrave,
              isIOSDevice: isIOS,
              needsCAPIOnly: needsCAPI,
              recommendation: needsCAPI ? 
                '⚠️ Device may block Pixel - Ensure CAPI is enabled with Access Token' : 
                '✅ Standard device - Pixel should work'
            });
            
            // تحميل Pixel Script
            console.log('🚀 [useFacebookPixel] Calling loadFacebookPixel...');
            loadFacebookPixel(settings.facebookPixelId);
            
            setPixelId(settings.facebookPixelId);
            setIsLoaded(true);
            
            // انتظار تحميل Pixel ثم تتبع PageView
            // Note: PageView is already tracked in the base script, but we track it again
            // to ensure it's tracked even if the base script's PageView was blocked
            const trackPageViewWithRetry = (attempt = 1) => {
              console.log(`🔄 [useFacebookPixel] trackPageViewWithRetry attempt ${attempt}`);
              
              if (settings.pixelTrackPageView !== false) {
                try {
                  const eventId = trackPageView();
                  if (eventId) {
                    console.log('📊 [Facebook Pixel] PageView tracked successfully', { eventId });
                  } else if (attempt < 3) {
                    console.log(`⏳ [Facebook Pixel] PageView tracking retry (attempt ${attempt}/3)...`);
                    setTimeout(() => trackPageViewWithRetry(attempt + 1), 1000);
                  } else {
                    console.warn('⚠️ [Facebook Pixel] PageView tracking failed after 3 attempts');
                  }
                } catch (error) {
                  console.error('❌ [Facebook Pixel] Error tracking PageView:', error);
                }
              } else {
                console.log('ℹ️ [Facebook Pixel] PageView tracking is disabled in settings');
              }
            };
            
            // Wait for fbq to be available before tracking
            console.log('⏰ [useFacebookPixel] Scheduling PageView tracking in 1500ms...');
            setTimeout(() => trackPageViewWithRetry(), 1500);
            
            console.log('✅ [Facebook Pixel] Loaded successfully');
          } else {
            console.log('ℹ️ [Facebook Pixel] Not enabled for this store', {
              facebookPixelEnabled: settings.facebookPixelEnabled,
              facebookPixelId: settings.facebookPixelId,
              reason: !settings.facebookPixelEnabled ? 'Pixel not enabled' : 'Pixel ID missing'
            });
          }
        } else {
          console.warn('⚠️ [useFacebookPixel] Invalid response format', {
            success: response.success,
            hasData: !!response.data
          });
        }
      } catch (error) {
        console.error('❌ [Facebook Pixel] Error loading settings:', error);
        console.error('❌ [Facebook Pixel] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    loadPixelSettings();
  }, [companyId]);

  return { isLoaded, pixelId };
};
