/**
 * Facebook Pixel Utility
 * 
 * هذا الملف مسؤول عن:
 * 1. تحميل Pixel Script في المتصفح
 * 2. إرسال الأحداث لـ Facebook
 * 3. Event Deduplication (منع التكرار)
 */

// تخزين Pixel ID
let pixelId: string | null = null;
let isInitialized = false;

// Helper function to wait for Pixel to be ready (same mechanism as PageView)
const waitForPixel = (callback: () => void, maxAttempts = 10, attempt = 1) => {
  if (isInitialized && typeof window !== 'undefined' && (window as any).fbq && pixelId) {
    callback();
  } else if (attempt < maxAttempts) {
    setTimeout(() => waitForPixel(callback, maxAttempts, attempt + 1), 200);
  } else {
    console.warn('⚠️ [waitForPixel] Pixel not ready after', maxAttempts, 'attempts', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
      hasPixelId: !!pixelId
    });
  }
};

/**
 * التحقق من Brave Browser
 * Brave Browser قد يحظر Pixel Script تلقائياً
 * @returns {boolean} true إذا كان Brave Browser
 */
export const isBraveBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Brave-specific properties
  const hasBrave = !!(window as any).brave && !!(window as any).brave.isBrave;
  const userAgent = navigator.userAgent || '';
  const isBraveUA = /brave/i.test(userAgent);
  
  return hasBrave || isBraveUA;
};

/**
 * التحقق من iPhone/iOS
 * @returns {boolean} true إذا كان iPhone/iOS
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || '';
  return /iphone|ipad|ipod|ios/i.test(userAgent);
};

/**
 * التحقق مما إذا كان الجهاز يحتاج CAPI فقط
 * (Brave Browser أو iPhone/iOS)
 * @returns {boolean} true إذا كان يحتاج CAPI فقط
 */
export const needsCAPIOnly = (): boolean => {
  return isBraveBrowser() || isIOSDevice();
};

/**
 * تحميل Facebook Pixel Script
 */
export const loadFacebookPixel = (pixelIdParam: string) => {
  const isBrave = isBraveBrowser();
  const isIOS = isIOSDevice();
  const needsCAPI = needsCAPIOnly();
  
  console.log('🔍 [loadFacebookPixel] Function called', {
    pixelIdParam,
    isInitialized,
    hasPixelId: !!pixelIdParam,
    pixelIdLength: pixelIdParam?.length,
    isBraveBrowser: isBrave,
    isIOSDevice: isIOS,
    needsCAPIOnly: needsCAPI
  });
  
  // في Brave Browser، Pixel قد يُحظر تلقائياً
  if (isBrave) {
    console.warn('⚠️ [Facebook Pixel] Brave Browser detected - Pixel may be blocked automatically');
    console.warn('⚠️ [Facebook Pixel] Please ensure Conversions API is enabled and Access Token is configured');
  }
  
  if (isIOS) {
    console.log('📱 [Facebook Pixel] iOS device detected - Pixel should work, but CAPI recommended as backup');
  }
  
  if (isInitialized) {
    console.log('ℹ️ [Facebook Pixel] Already initialized, skipping...');
    return;
  }

  if (!pixelIdParam) {
    console.warn('⚠️ [Facebook Pixel] Pixel ID is missing');
    return;
  }

  // التحقق من صحة Pixel ID
  if (!/^\d{16}$/.test(pixelIdParam)) {
    console.error('❌ [Facebook Pixel] Invalid Pixel ID format. Expected 16 digits, got:', {
      pixelId: pixelIdParam,
      length: pixelIdParam.length,
      isValid: /^\d{16}$/.test(pixelIdParam)
    });
    return;
  }

  pixelId = pixelIdParam;
  console.log('🎯 [Facebook Pixel] Loading Pixel with ID:', pixelId);
  console.log('🎯 [Facebook Pixel] Pixel ID validation passed');

  // إضافة Pixel Script للصفحة (الكود الرسمي من Facebook)
  const script = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;

  try {
    console.log('📝 [loadFacebookPixel] Creating script element...');
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = script;
    
    console.log('📝 [loadFacebookPixel] Adding script to head...', {
      hasHead: !!document.head,
      scriptLength: script.length
    });
    
    document.head.appendChild(scriptElement);
    console.log('✅ [Facebook Pixel] Script element added to head');
    console.log('✅ [Facebook Pixel] Script content preview:', script.substring(0, 100) + '...');

    // إضافة noscript fallback
    console.log('📝 [loadFacebookPixel] Creating noscript fallback...');
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    
    console.log('📝 [loadFacebookPixel] Adding noscript to body...', {
      hasBody: !!document.body,
      noscriptUrl: img.src
    });
    
    document.body.appendChild(noscript);
    console.log('✅ [Facebook Pixel] Noscript fallback added');

    // التحقق من أن fbq متاح بعد تحميل الـ script
    const checkFbq = (attempt = 1) => {
      console.log(`🔍 [loadFacebookPixel] Checking fbq availability (attempt ${attempt}/5)...`, {
        hasWindow: typeof window !== 'undefined',
        hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
        windowType: typeof window
      });
      
        if (typeof window !== 'undefined' && (window as any).fbq) {
        console.log('✅ [Facebook Pixel] fbq function is available');
        console.log('✅ [Facebook Pixel] fbq type:', typeof (window as any).fbq);
        isInitialized = true;
        
        // Log device information
        const isBrave = isBraveBrowser();
        const isIOS = isIOSDevice();
        const needsCAPI = needsCAPIOnly();
        
        console.log('📊 [Facebook Pixel] Device information:', {
          isBraveBrowser: isBrave,
          isIOSDevice: isIOS,
          needsCAPIOnly: needsCAPI,
          userAgent: navigator.userAgent?.substring(0, 100)
        });
        
        // Log the tracking URL that will be used
        console.log('🔗 [Facebook Pixel] Tracking URL:', `https://www.facebook.com/tr?id=${pixelId}&ev=PageView`);
        
        // Log all future event URLs
        const originalFbq = (window as any).fbq;
        (window as any).fbq = function(...args: any[]) {
          // Determine event type and name based on first argument
          const command = args[0] || 'Unknown';
          let eventName = 'Unknown';
          let eventId = 'Not set';
          
          if (command === 'init') {
            eventName = 'init';
            // For init, args[1] is the pixelId
          } else if (command === 'track') {
            eventName = args[1] || 'Unknown';
            eventId = args[3]?.eventID || 'Not set';
          } else if (command === 'trackCustom') {
            eventName = args[1] || 'Unknown';
            eventId = args[3]?.eventID || 'Not set';
          } else {
            eventName = command;
          }
          
          const isBrave = isBraveBrowser();
          const isIOS = isIOSDevice();
          
          if (command === 'init') {
            console.log(`🔄 [Facebook Pixel] Initializing Pixel: ${args[1]}`, {
              pixelId: args[1],
              argsCount: args.length
            });
          } else {
            const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=${eventName}`;
            console.log(`📤 [Facebook Pixel] Sending event: ${eventName}`, {
              url: trackingUrl,
              eventId,
              data: args[2] || {},
              options: args[3] || {},
              argsCount: args.length,
              isBraveBrowser: isBrave,
              isIOSDevice: isIOS,
              note: isBrave ? '⚠️ Brave Browser - Pixel may be blocked, CAPI will be used as backup' : 
                    isIOS ? '📱 iOS Device - Pixel should work, CAPI as backup' : 
                    '✅ Standard browser - Pixel should work'
            });
            
            // Test the URL with GET request (only for AddToCart to avoid spam)
            if (eventName === 'AddToCart' && typeof fetch !== 'undefined') {
              fetch(trackingUrl, {
                method: 'GET',
                mode: 'no-cors', // Facebook Pixel endpoint doesn't support CORS
                cache: 'no-cache'
              }).then(() => {
                console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', trackingUrl);
              }).catch((error) => {
                console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
              });
            }
          }
          return originalFbq.apply(this, args);
        };
        
        console.log('✅ [Facebook Pixel] fbq wrapper installed successfully');
      } else if (attempt < 5) {
        console.log(`⏳ [Facebook Pixel] Waiting for fbq (attempt ${attempt}/5)...`);
        setTimeout(() => checkFbq(attempt + 1), 500);
      } else {
        console.error('❌ [Facebook Pixel] fbq function failed to load after 5 attempts', {
          hasWindow: typeof window !== 'undefined',
          windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('fb')) : []
        });
      }
    };
    
    console.log('⏰ [loadFacebookPixel] Starting fbq check in 100ms...');
    setTimeout(() => checkFbq(), 100);
  } catch (error) {
    console.error('❌ [Facebook Pixel] Error loading script:', error);
    console.error('❌ [Facebook Pixel] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};

/**
 * توليد Event ID فريد (للـ Deduplication)
 * نفس الـ ID سيُستخدم في Pixel و CAPI
 */
const generateEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * إرسال حدث PageView
 */
export const trackPageView = () => {
  console.log('🔍 [trackPageView] Function called', {
    isInitialized,
    hasWindow: typeof window !== 'undefined',
    hasFbq: typeof window !== 'undefined' && !!(window as any).fbq
  });
  
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackPageView] Cannot track - Pixel not ready', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq
    });
    return;
  }

  const eventId = generateEventId();
  console.log('📊 [trackPageView] Calling fbq with eventId:', eventId, 'Pixel ID:', pixelId);
  
  if (!pixelId) {
    console.warn('⚠️ [trackPageView] Pixel ID is missing');
    return;
  }
  
  try {
    (window as any).fbq('track', 'PageView', {}, { eventID: eventId });
    console.log('✅ [Facebook Pixel] PageView tracked successfully', { eventId, pixelId });
  } catch (error) {
    console.error('❌ [trackPageView] Error calling fbq:', error);
    return;
  }
  
  return eventId;
};

/**
 * إرسال حدث ViewContent (عرض منتج)
 */
export const trackViewContent = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  console.log('🔍 [trackViewContent] Function called', {
    productId: product.id,
    productName: product.name,
    price: product.price,
    category: product.category || 'N/A',
    isInitialized,
    hasWindow: typeof window !== 'undefined',
    hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
    pixelId
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq || !pixelId) {
    console.warn('⚠️ [trackViewContent] Cannot track - Pixel not ready or Pixel ID missing, will retry', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
      hasPixelId: !!pixelId
    });
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackViewContent] Pixel ID is missing after wait');
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        content_category: product.category || '',
        value: product.price,
        currency: 'EGP'
      };
      
      try {
        // Ensure init is called before track (same pattern as AddToCart)
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
          console.log('🔄 [trackViewContent] Called fbq(init) before track (after wait)');
        }
        
        // Small delay to ensure initialization completes before tracking
        setTimeout(() => {
          (window as any).fbq('track', 'ViewContent', eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=ViewContent`;
          console.log('✅ [Facebook Pixel] ViewContent tracked successfully (after retry)', { 
            productId: product.id, 
            productName: product.name,
            price: product.price,
            category: product.category || 'N/A',
            eventId,
            pixelId,
            url: trackingUrl,
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'ViewContent',
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50); // Small delay to ensure init completes
      } catch (error) {
        console.error('❌ [trackViewContent] Error calling fbq (after retry):', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackViewContent] Pixel ID is missing');
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    content_category: product.category || '',
    value: product.price,
    currency: 'EGP'
  };
  
  try {
    // Ensure init is called before track
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackViewContent] Called fbq(init) before track');
    }
    
    setTimeout(() => {
      (window as any).fbq('track', 'ViewContent', eventData, { eventID: eventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=ViewContent`;
      console.log('✅ [Facebook Pixel] ViewContent tracked successfully', { 
        productId: product.id, 
        productName: product.name,
        price: product.price,
        category: product.category || 'N/A',
        eventId,
        pixelId,
        url: trackingUrl,
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'ViewContent',
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackViewContent] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث AddToCart (إضافة للسلة)
 */
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}) => {
  console.log('🔍 [trackAddToCart] Function called', {
    productId: product.id,
    productName: product.name,
    price: product.price,
    quantity: product.quantity || 1,
    isInitialized,
    hasWindow: typeof window !== 'undefined',
    hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
    pixelId
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq || !pixelId) {
    console.warn('⚠️ [trackAddToCart] Cannot track - Pixel not ready or Pixel ID missing, will retry', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
      hasPixelId: !!pixelId
    });
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackAddToCart] Pixel ID is missing after wait');
        return;
      }

      const eventId = generateEventId();
      const quantity = product.quantity || 1;
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        contents: [{
          id: product.id,
          quantity: quantity,
          item_price: product.price
        }],
        value: product.price * quantity,
        currency: 'EGP',
        num_items: quantity
      };
      
      try {
        // Ensure init is called before track (same pattern as main function)
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
          console.log('🔄 [trackAddToCart] Called fbq(init) before track (after wait)');
        }
        
        // Small delay to ensure initialization completes before tracking
        setTimeout(() => {
          (window as any).fbq('track', 'AddToCart', eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToCart`;
          console.log('✅ [Facebook Pixel] AddToCart tracked successfully (after retry)', { 
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            value: product.price * quantity,
            eventId,
            pixelId,
            url: trackingUrl,
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'AddToCart',
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50); // Small delay to ensure init completes
      } catch (error) {
        console.error('❌ [trackAddToCart] Error calling fbq (after retry):', error);
      }
    });
    return;
  }

  const eventId = generateEventId();
  console.log('📊 [trackAddToCart] Calling fbq with eventId:', eventId, 'Pixel ID:', pixelId);
  
  if (!pixelId) {
    console.warn('⚠️ [trackAddToCart] Pixel ID is missing');
    return;
  }

  const quantity = product.quantity || 1;
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{
      id: product.id,
      quantity: quantity,
      item_price: product.price
    }],
    value: product.price * quantity,
    currency: 'EGP',
    num_items: quantity
  };
  
  try {
    // Ensure init is called before track (same pattern as script string: init then track)
    // Facebook Pixel requires init before track for events to be properly recorded
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackAddToCart] Called fbq(init) before track');
    }
    
    // Small delay to ensure initialization completes before tracking
    setTimeout(() => {
      // Track AddToCart event immediately after init (same pattern as PageView in script)
      (window as any).fbq('track', 'AddToCart', eventData, { eventID: eventId });
      
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToCart`;
      console.log('✅ [Facebook Pixel] AddToCart tracked successfully', { 
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        value: product.price * quantity,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'AddToCart',
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors', // Facebook Pixel endpoint doesn't support CORS
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50); // Small delay to ensure init completes
  } catch (error) {
    console.error('❌ [trackAddToCart] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث InitiateCheckout (بدء عملية الشراء)
 */
export const trackInitiateCheckout = (cart: {
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
}) => {
  console.log('🔍 [trackInitiateCheckout] Function called', {
    itemCount: cart.items.length,
    total: cart.total,
    isInitialized,
    hasWindow: typeof window !== 'undefined',
    hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
    pixelId
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackInitiateCheckout] Cannot track - Pixel not ready, will retry', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq
    });
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackInitiateCheckout] Pixel ID is missing');
        return;
      }

      const eventId = generateEventId();
      const contentIds = cart.items.map(item => item.id);
      const contents = cart.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price
      }));

      const eventData = {
        content_ids: contentIds,
        contents: contents,
        content_type: 'product',
        value: cart.total,
        currency: 'EGP',
        num_items: cart.items.length
      };
      
      try {
        // Ensure init is called before track
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
        }
        
        setTimeout(() => {
          (window as any).fbq('track', 'InitiateCheckout', eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=InitiateCheckout`;
          console.log('✅ [Facebook Pixel] InitiateCheckout tracked successfully', { 
            itemCount: cart.items.length,
            total: cart.total,
            eventId,
            pixelId,
            url: trackingUrl,
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'InitiateCheckout',
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50);
      } catch (error) {
        console.error('❌ [trackInitiateCheckout] Error calling fbq:', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackInitiateCheckout] Pixel ID is missing');
    return;
  }

  const eventId = generateEventId();
  const contentIds = cart.items.map(item => item.id);
  const contents = cart.items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    item_price: item.price
  }));

  const eventData = {
    content_ids: contentIds,
    contents: contents,
    content_type: 'product',
    value: cart.total,
    currency: 'EGP',
    num_items: cart.items.length
  };
  
  try {
    // Ensure init is called before track
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackInitiateCheckout] Called fbq(init) before track');
    }
    
    setTimeout(() => {
      (window as any).fbq('track', 'InitiateCheckout', eventData, { eventID: eventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=InitiateCheckout`;
      console.log('✅ [Facebook Pixel] InitiateCheckout tracked successfully', { 
        itemCount: cart.items.length,
        total: cart.total,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'InitiateCheckout',
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackInitiateCheckout] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث Purchase (إتمام الطلب) - الأهم!
 * @param order - بيانات الطلب
 * @param eventId - Event ID للـ Deduplication (اختياري)
 */
export const trackPurchase = (order: {
  orderNumber: string;
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
}, eventId?: string) => {
  console.log('🔍 [trackPurchase] Function called', {
    orderNumber: order.orderNumber,
    itemCount: order.items.length,
    total: order.total,
    providedEventId: eventId,
    isInitialized,
    hasWindow: typeof window !== 'undefined',
    hasFbq: typeof window !== 'undefined' && !!(window as any).fbq,
    pixelId
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackPurchase] Cannot track - Pixel not ready, will retry', {
      isInitialized,
      hasWindow: typeof window !== 'undefined',
      hasFbq: typeof window !== 'undefined' && !!(window as any).fbq
    });
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackPurchase] Pixel ID is missing');
        return;
      }

      // Use provided eventId or generate new one
      const finalEventId = eventId || generateEventId();
      const contentIds = order.items.map(item => item.id);
      const contents = order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price
      }));

      const eventData = {
        content_ids: contentIds,
        contents: contents,
        content_type: 'product',
        value: order.total,
        currency: 'EGP',
        num_items: order.items.length
      };
      
      try {
        // Ensure init is called before track
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
        }
        
        setTimeout(() => {
          (window as any).fbq('track', 'Purchase', eventData, { eventID: finalEventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Purchase`;
          console.log('✅ [Facebook Pixel] Purchase tracked successfully', { 
            orderNumber: order.orderNumber,
            total: order.total,
            itemCount: order.items.length,
            eventId: finalEventId,
            pixelId,
            url: trackingUrl,
            deduplication: eventId ? 'enabled' : 'disabled',
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'Purchase',
              cd: JSON.stringify(eventData),
              eventID: finalEventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50);
      } catch (error) {
        console.error('❌ [trackPurchase] Error calling fbq:', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackPurchase] Pixel ID is missing');
    return;
  }

  // Use provided eventId or generate new one
  const finalEventId = eventId || generateEventId();
  const contentIds = order.items.map(item => item.id);
  const contents = order.items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    item_price: item.price
  }));

  const eventData = {
    content_ids: contentIds,
    contents: contents,
    content_type: 'product',
    value: order.total,
    currency: 'EGP',
    num_items: order.items.length
  };
  
  try {
    // Ensure init is called before track
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackPurchase] Called fbq(init) before track');
    }
    
    setTimeout(() => {
      (window as any).fbq('track', 'Purchase', eventData, { eventID: finalEventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Purchase`;
      console.log('✅ [Facebook Pixel] Purchase tracked successfully', { 
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: order.items.length,
        eventId: finalEventId,
        pixelId,
        url: trackingUrl,
        deduplication: eventId ? 'enabled' : 'disabled',
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'Purchase',
          cd: JSON.stringify(eventData),
          eventID: finalEventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackPurchase] Error calling fbq:', error);
    return;
  }

  return finalEventId;
};

/**
 * إرسال حدث Search (البحث)
 */
export const trackSearch = (searchQuery: string) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackSearch] Cannot track - Pixel not ready, will retry');
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackSearch] Pixel ID is missing');
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        search_string: searchQuery
      };
      
      try {
        // Ensure init is called before track
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
        }
        
        setTimeout(() => {
          (window as any).fbq('track', 'Search', eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Search`;
          console.log('✅ [Facebook Pixel] Search tracked successfully', { 
            query: searchQuery,
            queryLength: searchQuery.length,
            eventId,
            pixelId,
            url: trackingUrl,
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'Search',
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50);
      } catch (error) {
        console.error('❌ [trackSearch] Error calling fbq:', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackSearch] Pixel ID is missing');
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    search_string: searchQuery
  };
  
  try {
    // Ensure init is called before track
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackSearch] Called fbq(init) before track');
    }
    
    setTimeout(() => {
      (window as any).fbq('track', 'Search', eventData, { eventID: eventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Search`;
      console.log('✅ [Facebook Pixel] Search tracked successfully', { 
        query: searchQuery,
        queryLength: searchQuery.length,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'Search',
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackSearch] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث AddToWishlist (إضافة للمفضلة)
 */
export const trackAddToWishlist = (product: {
  id: string;
  name: string;
  price: number;
}) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackAddToWishlist] Cannot track - Pixel not ready, will retry');
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackAddToWishlist] Pixel ID is missing');
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency: 'EGP'
      };
      
      try {
        // Ensure init is called before track
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
        }
        
        setTimeout(() => {
          (window as any).fbq('track', 'AddToWishlist', eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToWishlist`;
          console.log('✅ [Facebook Pixel] AddToWishlist tracked successfully', { 
            productId: product.id,
            productName: product.name,
            price: product.price,
            eventId,
            pixelId,
            url: trackingUrl,
            eventData
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: 'AddToWishlist',
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50);
      } catch (error) {
        console.error('❌ [trackAddToWishlist] Error calling fbq:', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackAddToWishlist] Pixel ID is missing');
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'EGP'
  };
  
  try {
    // Ensure init is called before track
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackAddToWishlist] Called fbq(init) before track');
    }
    
    setTimeout(() => {
      (window as any).fbq('track', 'AddToWishlist', eventData, { eventID: eventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToWishlist`;
      console.log('✅ [Facebook Pixel] AddToWishlist tracked successfully', { 
        productId: product.id,
        productName: product.name,
        price: product.price,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: 'AddToWishlist',
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackAddToWishlist] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث مخصص (Custom Event)
 */
export const trackCustom = (eventName: string, data?: Record<string, any>) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('⚠️ [trackCustom] Cannot track - Pixel not ready, will retry');
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn('⚠️ [trackCustom] Pixel ID is missing');
        return;
      }

      const eventId = generateEventId();
      const eventData = data || {};
      
      try {
        // Ensure init is called before trackCustom
        if (pixelId && (window as any).fbq) {
          (window as any).fbq('init', pixelId);
        }
        
        setTimeout(() => {
          (window as any).fbq('trackCustom', eventName, eventData, { eventID: eventId });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=${eventName}`;
          console.log('✅ [Facebook Pixel] Custom event tracked successfully', { 
            eventName,
            dataKeys: Object.keys(eventData),
            dataCount: Object.keys(eventData).length,
            eventData,
            eventId,
            pixelId,
            url: trackingUrl
          });
          
          // Test the URL with GET request (with event data as query params)
          if (typeof fetch !== 'undefined' && pixelId) {
            const params = new URLSearchParams({
              id: pixelId,
              ev: eventName,
              cd: JSON.stringify(eventData),
              eventID: eventId
            });
            const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
            
            fetch(fullUrl, {
              method: 'GET',
              mode: 'no-cors',
              cache: 'no-cache'
            }).then(() => {
              console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
            }).catch((error) => {
              console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
            });
          }
        }, 50);
      } catch (error) {
        console.error('❌ [trackCustom] Error calling fbq:', error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn('⚠️ [trackCustom] Pixel ID is missing');
    return;
  }

  const eventId = generateEventId();
  const eventData = data || {};
  
  try {
    // Ensure init is called before trackCustom
    if (pixelId && (window as any).fbq) {
      (window as any).fbq('init', pixelId);
      console.log('🔄 [trackCustom] Called fbq(init) before trackCustom');
    }
    
    setTimeout(() => {
      (window as any).fbq('trackCustom', eventName, eventData, { eventID: eventId });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=${eventName}`;
      console.log('✅ [Facebook Pixel] Custom event tracked successfully', { 
        eventName,
        dataKeys: Object.keys(eventData),
        dataCount: Object.keys(eventData).length,
        eventData,
        eventId,
        pixelId,
        url: trackingUrl
      });
      
      // Test the URL with GET request (with event data as query params)
      if (typeof fetch !== 'undefined' && pixelId) {
        const params = new URLSearchParams({
          id: pixelId,
          ev: eventName,
          cd: JSON.stringify(eventData),
          eventID: eventId
        });
        const fullUrl = `https://www.facebook.com/tr?${params.toString()}`;
        
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }).then(() => {
          console.log('✅ [Facebook Pixel] GET request sent to tracking URL:', fullUrl);
        }).catch((error) => {
          console.warn('⚠️ [Facebook Pixel] GET request failed (expected with no-cors):', error);
        });
      }
    }, 50);
  } catch (error) {
    console.error('❌ [trackCustom] Error calling fbq:', error);
    return;
  }

  return eventId;
};

/**
 * التحقق من أن Pixel مُفعّل
 */
export const isPixelInitialized = (): boolean => {
  return isInitialized;
};

/**
 * الحصول على Pixel ID الحالي
 */
export const getPixelId = (): string | null => {
  return pixelId;
};
