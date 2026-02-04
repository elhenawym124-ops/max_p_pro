import { apiClient } from './apiClient';

/**
 * Analytics Service
 * Handles store visit tracking, conversion events, and analytics reporting
 * Uses standardized apiClient for all requests
 */

class AnalyticsService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    // Try to get existing session from localStorage
    const storedSession = localStorage.getItem('analytics_session');

    if (storedSession) {
      try {
        const { sessionId, expiresAt } = JSON.parse(storedSession);

        // Check if session is still valid
        if (expiresAt > now) {
          // Extend session on activity
          localStorage.setItem('analytics_session', JSON.stringify({
            sessionId,
            expiresAt: now + SESSION_DURATION
          }));
          return sessionId;
        }
      } catch (e) {
        console.error('Error parsing stored session:', e);
      }
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session', JSON.stringify({
      sessionId,
      expiresAt: now + SESSION_DURATION
    }));

    return sessionId;
  }

  private getCompanyId(): string | null {
    // استخراج companyId من localStorage
    // أولاً: جرب storefront_companyId (للـ Storefront - نفس المفتاح المستخدم في storefrontApi)
    const storefrontCompanyId = localStorage.getItem('storefront_companyId');

    if (storefrontCompanyId) {
      return storefrontCompanyId;
    }

    // ثانياً: جرب company object (للـ Admin Dashboard)
    const storedCompany = localStorage.getItem('company');
    if (storedCompany) {
      try {
        const company = JSON.parse(storedCompany);
        return company.id;
      } catch (e) {
        console.error('Error parsing company from localStorage:', e);
      }
    }

    console.warn('⚠️ [Analytics] No companyId found in localStorage');
    return null;
  }

  async trackStoreVisit(landingPage?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn('📊 [Analytics] No companyId found, skipping store visit tracking');
        return;
      }

      console.log('📊 [Analytics] Tracking store visit...', { companyId, landingPage });

      await apiClient.post('/analytics/track/store-visit', {
        sessionId: this.sessionId,
        ipAddress: null, // يمكن إضافة IP من الـ backend
        userAgent: navigator.userAgent,
        referrer: document.referrer || null,
        landingPage: landingPage || window.location.pathname
      }, {
        headers: { 'x-company-id': companyId }
      });

      console.log('✅ [Analytics] Store visit tracked successfully');
    } catch (error) {
      console.error('❌ [Analytics] Error tracking store visit:', error);
    }
  }

  async trackProductView(productId: string, source?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn('📊 [Analytics] No companyId found, skipping product view tracking');
        return;
      }

      console.log('📊 [Analytics] Tracking product view...', { companyId, productId, source });

      await apiClient.post('/analytics/track/product-view', {
        productId,
        sessionId: this.sessionId,
        source
      }, {
        headers: { 'x-company-id': companyId }
      });

      console.log('✅ [Analytics] Product view tracked successfully');
    } catch (error) {
      console.error('❌ [Analytics] Error tracking product view:', error);
    }
  }

  async trackAddToCart(productId: string, value: number) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn('📊 [Analytics] No companyId found, skipping add to cart tracking');
        return;
      }

      console.log('📊 [Analytics] Tracking add to cart...', { companyId, productId, value });

      await apiClient.post('/analytics/track/conversion', {
        sessionId: this.sessionId,
        eventType: 'add_to_cart',
        productId,
        value
      }, {
        headers: { 'x-company-id': companyId }
      });

      console.log('✅ [Analytics] Add to cart tracked successfully');
    } catch (error) {
      console.error('❌ [Analytics] Error tracking add to cart:', error);
    }
  }

  async trackCheckout(value: number, productIds: string[]) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn('📊 [Analytics] No companyId found, skipping checkout tracking');
        return;
      }

      console.log('📊 [Analytics] Tracking checkout...', { companyId, value, productIds });

      await apiClient.post('/analytics/track/conversion', {
        sessionId: this.sessionId,
        eventType: 'checkout',
        value,
        metadata: { productIds }
      }, {
        headers: { 'x-company-id': companyId }
      });

      console.log('✅ [Analytics] Checkout tracked successfully');
    } catch (error) {
      console.error('❌ [Analytics] Error tracking checkout:', error);
    }
  }

  async trackPurchase(orderId: string, value: number, productIds: string[]) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn('📊 [Analytics] No companyId found, skipping purchase tracking');
        return;
      }

      // Track each product separately for proper analytics
      const trackingPromises = productIds.map(productId =>
        apiClient.post('/analytics/track/conversion', {
          sessionId: this.sessionId,
          eventType: 'purchase',
          orderId,
          productId,
          value: value / productIds.length, // Distribute value across products
          metadata: { allProductIds: productIds }
        }, {
          headers: { 'x-company-id': companyId }
        })
      );

      await Promise.all(trackingPromises);
    } catch (error) {
      console.error('❌ [Analytics] Error tracking purchase:', error);
    }
  }

  // ==================== Public APIs (بدون Token - للـ Storefront) ====================

  async getStoreAnalytics(period: string = '30', startDate?: string, endDate?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        throw new Error('No companyId found');
      }

      const params: any = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/analytics/public/store', {
        params,
        headers: { 'x-company-id': companyId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching store analytics:', error);
      throw error;
    }
  }

  async getConversionRate(period: string = '30') {
    try {
      const response = await apiClient.get('/analytics/conversion-rate', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversion rate:', error);
      throw error;
    }
  }

  async getProductConversionRate(productId: string, period: string = '30') {
    try {
      const response = await apiClient.get(`/analytics/products/${productId}/conversion`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product conversion rate:', error);
      throw error;
    }
  }

  async getTopProducts(period: string = '30', limit: number = 10, startDate?: string, endDate?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        throw new Error('No companyId found');
      }

      const params: any = { period, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/analytics/public/products/top', {
        params,
        headers: { 'x-company-id': companyId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top products:', error);
      throw error;
    }
  }

  async getDailyAnalytics(period: string = '30', startDate?: string, endDate?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        throw new Error('No companyId found');
      }

      const params: any = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/analytics/public/daily', {
        params,
        headers: { 'x-company-id': companyId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching daily analytics:', error);
      throw error;
    }
  }

  async getProductAnalytics(period: string = '30') {
    try {
      const response = await apiClient.get('/analytics/products/analytics', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product analytics:', error);
      throw error;
    }
  }

  async getVariationsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/variations', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching variations analytics:', error);
      throw error;
    }
  }

  async getCategoriesAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/categories', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories analytics:', error);
      throw error;
    }
  }

  async getPaymentMethodsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/payment-methods', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods analytics:', error);
      throw error;
    }
  }

  async getRegionsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/regions', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching regions analytics:', error);
      throw error;
    }
  }

  async getCouponsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/coupons', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coupons analytics:', error);
      throw error;
    }
  }

  async getCODPerformanceAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/cod-performance', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching COD performance analytics:', error);
      throw error;
    }
  }

  async getAbandonedCartAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/abandoned-carts', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching abandoned cart analytics:', error);
      throw error;
    }
  }

  async getCustomerQualityAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/customer-quality', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer quality analytics:', error);
      throw error;
    }
  }

  async getProfitAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      // If period is provided, calculate startDate
      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/profit', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching profit analytics:', error);
      throw error;
    }
  }

  async getDeliveryRateAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/delivery-rate', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery rate analytics:', error);
      throw error;
    }
  }

  async getOrderStatusTimeAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/order-status-time', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order status time analytics:', error);
      throw error;
    }
  }

  async getProductHealthScore(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/product-health', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product health score:', error);
      throw error;
    }
  }

  async getReturnAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/returns', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching return analytics:', error);
      throw error;
    }
  }

  async getTeamPerformanceAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/team-performance', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching team performance analytics:', error);
      throw error;
    }
  }

  async getFunnelAnalytics(period?: string, startDate?: string, endDate?: string) {
    try {
      const params: any = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get('/analytics/funnel', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      throw error;
    }
  }

  async getStockForecastAnalytics(period?: string) {
    try {
      const response = await apiClient.get('/analytics/stock-forecast', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stock forecast analytics:', error);
      throw error;
    }
  }

  async getRegionAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get('/analytics/regions', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching region analytics:', error);
      throw error;
    }
  }

  async getReturnsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get('/analytics/returns', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching returns analytics:', error);
      throw error;
    }
  }

  async getConversionRateAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get('/analytics/conversion-rate', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversion rate analytics:', error);
      throw error;
    }
  }

  async getComprehensiveDashboard(period: string = '30', startDate?: string, endDate?: string) {
    try {
      const params: any = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/analytics/comprehensive-dashboard', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching comprehensive dashboard:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
