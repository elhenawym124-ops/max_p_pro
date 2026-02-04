/**
 * Storefront API Helper
 * مساعد لاستدعاء Public APIs
 */

import { envConfig } from '../config/environment';
import { tokenManager } from './tokenManager';

// الحصول على Base URL للـ Backend
// استخدام envConfig لضمان الاتساق مع باقي التطبيق
const getApiBaseUrl = () => {
  // envConfig.apiUrl يحتوي على /api/v1 في النهاية
  // نحتاج فقط للـ base URL بدون /api/v1
  const apiUrl = envConfig.apiUrl;

  // إزالة /api/v1 من النهاية
  return apiUrl.replace('/api/v1', '');
};

// Export as getApiUrl for external use
// Returns the full API URL including /api/v1 for direct axios calls
export const getApiUrl = (): string => {
  return envConfig.apiUrl;
};

// استخراج Subdomain من hostname
const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;

  // في التطوير: marketing.localhost → marketing
  // في الإنتاج: marketing.yourdomain.com → marketing

  const parts = hostname.split('.');

  // إذا كان localhost أو IP
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // إذا كان subdomain.localhost
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }

  // إذا كان subdomain.domain.com
  if (parts.length >= 3) {
    return parts[0] || null;
  }

  return null;
};

// الحصول على Company ID
// الأولوية: 1) URL parameter 2) Subdomain 3) localStorage
export const getCompanyId = (): string => {
  // 1. محاولة الحصول عليه من URL parameter (للتطوير)
  // جرب من window.location.search أولاً
  let urlCompanyId = new URLSearchParams(window.location.search).get('companyId');

  // إذا لم يوجد، جرب من hash (في حالة React Router)
  if (!urlCompanyId && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    urlCompanyId = hashParams.get('companyId');
  }

  // Debug logging (only in development)
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    // Only log once per session to avoid spam
    const logKey = 'storefront_companyId_logged';
    if (!sessionStorage.getItem(logKey)) {
      console.log('🔍 [Storefront] window.location.search:', window.location.search);
      console.log('🔍 [Storefront] window.location.href:', window.location.href);
      sessionStorage.setItem(logKey, 'true');
    }
  }

  if (urlCompanyId) {
    // حفظه في localStorage للاستخدام لاحقاً
    localStorage.setItem('storefront_companyId', urlCompanyId);
    if (isDevelopment && !sessionStorage.getItem('storefront_companyId_logged')) {
      console.log('✅ [Storefront] Using companyId from URL:', urlCompanyId);
    }
    return urlCompanyId;
  }

  // 2. محاولة الحصول عليه من subdomain
  const subdomain = getSubdomain();
  if (subdomain) {
    if (isDevelopment && !sessionStorage.getItem('storefront_subdomain_logged')) {
      console.log('🌐 [Storefront] Detected subdomain:', subdomain);
      sessionStorage.setItem('storefront_subdomain_logged', 'true');
    }
    // سنرسل الـ subdomain للـ backend وهو سيحوله لـ companyId
    // نحفظه كـ flag أننا نستخدم subdomain mode
    localStorage.setItem('storefront_mode', 'subdomain');
    localStorage.setItem('storefront_subdomain', subdomain);
    return subdomain; // سنرسله كـ subdomain parameter
  }

  // 3. إذا لم يكن في URL أو subdomain، جرب localStorage
  const storedCompanyId = localStorage.getItem('storefront_companyId');
  if (storedCompanyId) {
    if (isDevelopment && !sessionStorage.getItem('storefront_stored_logged')) {
      console.log('💾 [Storefront] Using companyId from localStorage:', storedCompanyId);
      sessionStorage.setItem('storefront_stored_logged', 'true');
    }
    return storedCompanyId;
  }

  if (isDevelopment) {
    console.warn('⚠️ [Storefront] No companyId found in URL, subdomain, or localStorage');
  }
  return '';
};

// استدعاء API
export const storefrontFetch = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiBaseUrl();
  const companyId = getCompanyId();

  // بناء الـ URL الكامل
  const fullUrl = `${baseUrl}/api/v1/public${endpoint}`;
  const url = new URL(fullUrl);

  // إضافة companyId أو subdomain
  const isWalletEndpoint = endpoint === '/wallet' || endpoint.startsWith('/wallet/');
  if (!companyId && !isWalletEndpoint) {
    console.error('❌ [Storefront API] Missing companyId!');
    throw new Error('Company ID is required. Please visit the store with a valid companyId parameter.');
  }

  // تحديد ما إذا كنا نستخدم subdomain mode أم companyId mode
  const mode = localStorage.getItem('storefront_mode');

  if (companyId) {
    if (mode === 'subdomain') {
      // إرسال subdomain بدلاً من companyId
      if (!url.searchParams.has('subdomain')) {
        url.searchParams.set('subdomain', companyId);
      }
    } else {
      // إرسال companyId العادي
      if (!url.searchParams.has('companyId')) {
        url.searchParams.set('companyId', companyId);
      }
    }
  }

  // Only log in development and limit frequency
  const isDevelopment = import.meta.env.DEV;
  // Don't log requests for optional endpoints (sold-count, navigation, shipping/estimate, footer-settings)
  // These endpoints may return 401/404 which is expected and should be handled silently

  // Get cart session ID from localStorage
  const cartSessionId = localStorage.getItem('cart_session_id');

  // Include customer token (OTP) if present
  const customerToken = tokenManager.getAccessToken();

  // Merge headers
  const headers = {
    ...options?.headers,
    ...(cartSessionId && { 'x-cart-id': cartSessionId }),
    ...(customerToken && { 'Authorization': `Bearer ${customerToken}` })
  };

  // ✅ CRITICAL: Include credentials to send/receive cookies
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...options,
      headers,
      credentials: 'include' // Enable cookies for cart functionality
    });
  } catch (networkError: any) {
    // Network errors (not HTTP errors) - rethrow as-is
    throw networkError;
  }

  // Only log errors or important responses (not 401/403/404/500)
  // 401/404 errors are expected for optional features and should be handled silently
  // Note: Browser will still show these in Network tab, but we won't log them to console
  if (isDevelopment) {
    if (!response.ok && ![401, 403, 404, 500].includes(response.status)) {
      console.log('📡 [Storefront API] Response:', response.status, response.statusText, 'for', endpoint);
    }
  }

  if (!response.ok) {
    // Try to parse error response body to get actual error message
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errorData: any = null;

    try {
      errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      // Log the full error for debugging
      if (isDevelopment && response.status === 400) {
        console.error('❌ [Storefront API] Error response:', errorData);
      }
    } catch (parseError) {
      // Could not parse JSON response, use default message
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = errorData;

    // Mark as silent error for 401/404 to prevent console logging
    // These are expected for optional endpoints (sold-count, navigation, shipping/estimate, footer-settings)
    if (response.status === 401 || response.status === 404) {
      (error as any).silent = true;
    }

    throw error;
  }

  return response.json();
};

// Product Reviews API (defined first to be used in storefrontApi)
export const reviewsApi = {
  /**
   * جلب التقييمات لمنتج
   */
  getProductReviews: async (productId: string, params?: { page?: number; limit?: number; minRating?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.minRating) queryParams.set('minRating', params.minRating.toString());

    return storefrontFetch(`/products/${productId}/reviews?${queryParams}`);
  },

  /**
   * إضافة تقييم جديد
   */
  createReview: async (productId: string, data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    rating: number;
    title?: string;
    comment?: string;
  }) => {
    return storefrontFetch(`/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },

  /**
   * وضع علامة مفيد على تقييم
   */
  markReviewHelpful: async (reviewId: string) => {
    return storefrontFetch(`/reviews/${reviewId}/helpful`, {
      method: 'PUT'
    });
  }
};

// Get or create session ID for recently viewed
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('recently_viewed_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('recently_viewed_session_id', sessionId);
  }
  return sessionId;
};

// Recently Viewed API
export const recentlyViewedApi = {
  /**
   * تسجيل مشاهدة منتج
   */
  recordView: async (productId: string) => {
    const sessionId = getSessionId();
    return storefrontFetch(`/products/${productId}/view`, {
      method: 'POST',
      headers: {
        'x-session-id': sessionId
      }
    });
  },

  /**
   * جلب المنتجات المشاهدة مؤخراً
   */
  getRecentlyViewed: async (limit: number = 8) => {
    const sessionId = getSessionId();
    return storefrontFetch(`/products/recently-viewed?limit=${limit}`, {
      headers: {
        'x-session-id': sessionId
      }
    });
  }
};

// Back in Stock API
export const backInStockApi = {
  /**
   * الاشتراك في إشعارات العودة للمخزون
   */
  subscribe: async (productId: string, data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    notifyEmail: boolean;
    notifySMS: boolean;
  }) => {
    return storefrontFetch(`/products/${productId}/back-in-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }
};

// استدعاءات محددة
export const storefrontApi = {
  // المنتجات
  getProducts: (params: Record<string, string> = {}) => {
    const queryParams = new URLSearchParams(params);
    return storefrontFetch(`/products?${queryParams}`);
  },

  getProduct: (id: string) => {
    return storefrontFetch(`/products/${id}`);
  },

  getProductQuick: (id: string) => {
    return storefrontFetch(`/products/${id}/quick`);
  },

  getFeaturedProducts: (limit: number = 8) => {
    return storefrontFetch(`/featured-products?limit=${limit}`);
  },

  getCategories: () => {
    return storefrontFetch(`/categories`);
  },

  getStoreInfo: () => {
    return storefrontFetch('/store-info');
  },

  // السلة
  addToCart: (data: { sessionId?: string; productId: string; quantity: number; variantId?: string }) => {
    return storefrontFetch('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  getCart: () => {
    return storefrontFetch('/cart');
  },

  updateCartItem: (productId: string, data: { quantity: number; variantId?: string | null }) => {
    return storefrontFetch('/cart/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, ...data })
    });
  },

  removeCartItem: (productId: string, variantId?: string | null) => {
    return storefrontFetch('/cart/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variantId })
    });
  },

  clearCart: () => {
    return storefrontFetch('/cart/clear', { method: 'DELETE' });
  },

  // الطلبات
  createOrder: (data: any) => {
    return storefrontFetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  trackOrder: (orderNumber: string, phone: string) => {
    return storefrontFetch(`/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`);
  },

  calculateShipping: (city: string) => {
    return storefrontFetch(`/cart/shipping/calculate?city=${encodeURIComponent(city)}`);
  },

  getDeliveryOptions: (companyId: string) => {
    return storefrontFetch(`/delivery-options/${companyId}`);
  },

  getPaymentMethods: () => {
    return storefrontFetch('/payment-methods');
  },

  // Wallet (Customer)
  getWalletBalance: () => {
    return storefrontFetch('/wallet/balance');
  },

  getWalletTransactions: (params: { page?: number; limit?: number; type?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.type) queryParams.set('type', params.type);
    const qs = queryParams.toString();
    return storefrontFetch(`/wallet/transactions${qs ? `?${qs}` : ''}`);
  },

  // Reviews (aliases)
  getProductReviews: reviewsApi.getProductReviews,
  createReview: reviewsApi.createReview,
  markReviewHelpful: reviewsApi.markReviewHelpful,

  // Recently Viewed (aliases)
  recordView: recentlyViewedApi.recordView,
  getRecentlyViewed: recentlyViewedApi.getRecentlyViewed
};
