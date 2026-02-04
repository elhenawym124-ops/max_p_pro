import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { envConfig } from '../config/environment';

interface CompanyAwareRequestConfig extends AxiosRequestConfig {
  requireCompanyAccess?: boolean;
  bypassCompanyCheck?: boolean;
}

class CompanyAwareApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = envConfig.apiUrl;
    console.log('🔧 [CompanyAwareApi] Initialized with baseURL:', this.baseURL);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor to handle 401 errors
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');

          // Only redirect if not on public routes
          const currentPath = window.location.pathname;
          const isPublicRoute =
            currentPath.startsWith('/home') ||
            currentPath.startsWith('/shop') ||
            currentPath.startsWith('/auth/') ||
            currentPath.startsWith('/payment/');

          if (!isPublicRoute) {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private buildUrl(endpoint: string): string {
    // Remove leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const finalUrl = `${this.baseURL}/${cleanEndpoint}`;
    console.debug(`🔧 [CompanyAwareApi] Built URL for "${endpoint}":`, finalUrl);
    return finalUrl;
  }

  private getAuthHeaders() {
    const token = tokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getCurrentUser() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      // Decode JWT to get user info (simple decode, not verification)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1] || ''));
      return payload;
    } catch {
      return null;
    }
  }

  private validateCompanyAccess(targetCompanyId?: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Super admin can access everything
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // If no target company specified, allow (will be filtered by backend)
    if (!targetCompanyId) {
      return true;
    }

    // Check if user can access the target company
    return user.companyId === targetCompanyId;
  }

  private addCompanyFilter(config: CompanyAwareRequestConfig = {}): AxiosRequestConfig {
    const user = this.getCurrentUser();

    // Don't add company filter for super admin or if bypassed
    if (config.bypassCompanyCheck || user?.role === 'SUPER_ADMIN') {
      return {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...config.headers,
        },
      };
    }

    // Add company filter for regular users
    const companyFilter = user?.companyId ? { companyId: user.companyId } : {};

    return {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...config.headers,
      },
      params: {
        ...companyFilter,
        ...config.params,
      },
    };
  }

  // GET request with company awareness
  async get<T = any>(
    url: string,
    config: CompanyAwareRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    // Check company access if required
    if (config.requireCompanyAccess) {
      const targetCompanyId = config.params?.companyId;
      if (!this.validateCompanyAccess(targetCompanyId)) {
        throw new Error('ليس لديك صلاحية للوصول لهذه الشركة');
      }
    }

    const finalConfig = this.addCompanyFilter(config);
    return axios.get(this.buildUrl(url), finalConfig);
  }

  // POST request with company awareness
  async post<T = any>(
    url: string,
    data?: any,
    config: CompanyAwareRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    const user = this.getCurrentUser();

    // Add companyId to data for regular users
    if (data && user?.companyId && user.role !== 'SUPER_ADMIN' && !config.bypassCompanyCheck) {
      data = {
        ...data,
        companyId: user.companyId,
      };
    }

    // Check company access if required
    if (config.requireCompanyAccess) {
      const targetCompanyId = data?.companyId;
      if (!this.validateCompanyAccess(targetCompanyId)) {
        throw new Error('ليس لديك صلاحية للوصول لهذه الشركة');
      }
    }

    const finalConfig = this.addCompanyFilter(config);
    return axios.post(this.buildUrl(url), data, finalConfig);
  }

  // PUT request with company awareness
  async put<T = any>(
    url: string,
    data?: any,
    config: CompanyAwareRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    const user = this.getCurrentUser();

    // Add companyId to data for regular users
    if (data && user?.companyId && user.role !== 'SUPER_ADMIN' && !config.bypassCompanyCheck) {
      data = {
        ...data,
        companyId: user.companyId,
      };
    }

    // Check company access if required
    if (config.requireCompanyAccess) {
      const targetCompanyId = data?.companyId;
      if (!this.validateCompanyAccess(targetCompanyId)) {
        throw new Error('ليس لديك صلاحية للوصول لهذه الشركة');
      }
    }

    const finalConfig = this.addCompanyFilter(config);
    return axios.put(this.buildUrl(url), data, finalConfig);
  }

  // DELETE request with company awareness
  async delete<T = any>(
    url: string,
    config: CompanyAwareRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    // Check company access if required
    if (config.requireCompanyAccess) {
      const targetCompanyId = config.params?.companyId;
      if (!this.validateCompanyAccess(targetCompanyId)) {
        throw new Error('ليس لديك صلاحية للوصول لهذه الشركة');
      }
    }

    const finalConfig = this.addCompanyFilter(config);
    return axios.delete(this.buildUrl(url), finalConfig);
  }

  // Helper methods for common operations
  async getConversations(filters: any = {}) {
    return this.get('/conversations', { params: filters });
  }

  async getCustomers(filters: any = {}) {
    return this.get('/customers', { params: filters });
  }

  async getProducts(filters: any = {}) {
    return this.get('/products', { params: filters });
  }

  async getOrders(filters: any = {}) {
    return this.get('/orders', { params: filters });
  }

  // Company-specific operations
  async getCurrentCompany() {
    return this.get('/companies/current');
  }

  async getCompanyStats() {
    return this.get('/companies/current/stats');
  }

  // Admin operations (bypass company check)
  async getAllCompanies() {
    return this.get('/admin/companies', { bypassCompanyCheck: true });
  }

  async getCompanyById(companyId: string) {
    return this.get(`/admin/companies/${companyId}`, {
      bypassCompanyCheck: true,
      requireCompanyAccess: true,
      params: { companyId }
    });
  }

  // Utility methods
  isCurrentUserSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'SUPER_ADMIN';
  }

  getCurrentCompanyId(): string | null {
    const user = this.getCurrentUser();
    return user?.companyId || null;
  }

  canAccessCompany(companyId: string): boolean {
    return this.validateCompanyAccess(companyId);
  }
}

// Create singleton instance
export const companyAwareApi = new CompanyAwareApiService();

// Export class for custom instances
export default CompanyAwareApiService;
