import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { config } from '../config';
import { tokenManager } from '../utils/tokenManager';

/**
 * API Client
 * 
 * Centralized HTTP client with interceptors for authentication,
 * error handling, and request/response transformation
 */


interface ApiError {
  success: false;
  error: string | {
    code: string;
    message: string;
    details?: any;
  };
  geofenceData?: {
    distance: number;
    allowedRadius: number;
    isWithin: boolean;
  };
  details?: any;
  message?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Normalize URL to handle inconsistent path styles in components
        if (config.url) {
          // 1. Remove leading slash if it exists
          if (config.url.startsWith('/')) {
            config.url = config.url.substring(1);
          }
          // 2. Remove redundant v1/ prefix if present (since it's now in baseURL)
          if (config.url.startsWith('v1/')) {
            config.url = config.url.substring(3);
          }
        }

        // Add auth token to requests
        const token = tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else if (import.meta.env.DEV) {
          // Mock token for development - updated with correct company ID and JWT secret
          const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc2ODkwMzA0OCwiZXhwIjoxNzcxNDk1MDQ4fQ.eNheicpMK8AhET6AJUC-85P6ZA_ZHIqY55bh3E0d0h4';
          config.headers.Authorization = `Bearer ${mockToken}`;
          console.log('🔧 Using mock token for development');
        }

        // Add subdomain to headers for company isolation (from current URL)
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        if (hostname) {
          const parts = hostname.split('.');
          // في الإنتاج: storename.maxp-ai.pro -> storename
          if (parts.length >= 3 && parts[0] !== 'www' && !hostname.includes('localhost')) {
            config.headers['X-Company-Subdomain'] = parts[0];
            config.headers['X-Subdomain'] = parts[0];
          }
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in development
        // if (import.meta.env.DEV) {
        //   console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        //     data: config.data,
        //     params: config.params,
        //   });
        // }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        // if (import.meta.env.DEV) {
        //   console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        //     status: response.status,
        //     data: response.data,
        //   });
        // }

        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

        // Enhanced error logging in development
        if (import.meta.env.DEV) {
          // Skip logging 404 errors for expected fallback scenarios (e.g., trying simple order before enhanced)
          const isExpected404 = error.response?.status === 404 &&
            originalRequest?.url?.includes('/orders-new/simple/');

          if (!isExpected404) {
            console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
              headers: originalRequest?.headers
            });
          } else {
            // Log as debug info instead of error for expected 404s
            console.debug(`ℹ️ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - 404 (expected, will try fallback)`);
          }

          // Handle specific error cases with detailed logging
          if (error.response?.status === 401) {
            console.error('🔒 Authentication failed - token may be invalid or expired');
          } else if (error.response?.status === 403) {
            // Check if it's a geofencing error (don't logout for geofencing)
            if (error.response?.data?.geofenceData) {
              console.warn('📍 Geofencing restriction:', error.response.data);
            } else {
              console.error('🚫 Access denied - insufficient permissions');
              console.error('SERVER RESPONSE:', JSON.stringify(error.response.data));
              // ✅ REMOVED: Do NOT force logout on 403. Permission issues should not clear the session.
              // this.handleAuthError();
            }
          } else if (error.response?.status === 503) {
            console.error('⏳ Database temporarily unavailable - will retry');
          } else if (error.response?.status === 500) {
            console.error('🔥 Server error occurred');
            console.error('🔥 Error details:', error.response?.data);
            if (error.response?.data?.details) {
              console.error('🔥 Error details (dev):', error.response.data.details);
            }
          }
        }

        // Handle 503 Service Unavailable (database connection issues) with retry
        if (error.response?.status === 503) {
          const retryCount = originalRequest._retryCount || 0;
          const maxRetries = 3;

          if (retryCount < maxRetries) {
            originalRequest._retryCount = retryCount + 1;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)

            console.log(`🔄 Retrying request (${retryCount + 1}/${maxRetries}) after ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(originalRequest);
          }
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${config.apiUrl}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            // Update tokens
            tokenManager.setAccessToken(accessToken);
            tokenManager.setRefreshToken(newRefreshToken);

            // Process failed queue
            this.processQueue(null, accessToken);

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.processQueue(refreshError, null);
            this.handleAuthError();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleAuthError(): void {
    // Clear tokens
    tokenManager.clearTokens();
    localStorage.removeItem('user');

    // Dispatch auth error event
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));

    // Redirect to login (if not already there AND not on public storefront routes)
    const currentPath = window.location.pathname;
    const isPublicRoute =
      currentPath.startsWith('/test-public') ||
      currentPath.startsWith('/home') ||
      currentPath.startsWith('/shop') ||
      currentPath.startsWith('/auth/') ||
      currentPath.startsWith('/payment/');

    if (!isPublicRoute) {
      window.location.href = '/auth/login';
    }
  }

  private handleError(error: AxiosError<ApiError>): void {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const originalRequest = error.config as AxiosRequestConfig & { _skipErrorToast?: boolean };

    // Don't show toast for certain errors (503 is retried automatically)
    const silentErrors = [401, 404, 503];
    if (silentErrors.includes(status || 0)) {
      return;
    }

    // Don't show toast if explicitly skipped (e.g., for markAsRead timeouts)
    if (originalRequest._skipErrorToast) {
      return;
    }

    // Don't show toast for timeout errors on markAsRead endpoint
    if (error.message?.includes('timeout') && originalRequest.url?.includes('/whatsapp/messages/read')) {
      return;
    }

    // Show error toast - check both error.message and message (backend sends message directly)
    const errorMessage = typeof errorData?.error === 'object' && errorData?.error !== null
      ? errorData.error.message
      : typeof errorData?.error === 'string'
        ? errorData.error
        : errorData?.message || 'حدث خطأ غير متوقع';

    // استخراج تفاصيل إضافية للخطأ
    const errorDetails = errorData?.details;
    const errorCode = typeof errorData?.error === 'object' && errorData?.error !== null
      ? errorData.error.code
      : null;

    // بناء رسالة خطأ أكثر تفصيلاً
    let detailedMessage = '';

    if (status && status >= 500) {
      const url = originalRequest.url || '';
      // استخراج اسم الصفحة أو العملية من الـ URL
      const urlPath = url.split('/').filter(Boolean);
      const operation = urlPath[urlPath.length - 1] || 'العملية';

      // تحديد نوع العملية بناءً على الـ method
      const method = originalRequest.method?.toUpperCase();
      let operationName = '';
      switch (method) {
        case 'GET': operationName = 'جلب البيانات'; break;
        case 'POST': operationName = 'إضافة البيانات'; break;
        case 'PUT':
        case 'PATCH': operationName = 'تحديث البيانات'; break;
        case 'DELETE': operationName = 'حذف البيانات'; break;
        default: operationName = 'العملية';
      }

      // بناء رسالة واضحة
      if (errorMessage && errorMessage !== 'حدث خطأ غير متوقع') {
        detailedMessage = `⚠️ خطأ في ${operationName}: ${errorMessage}`;
      } else if (errorCode) {
        detailedMessage = `⚠️ خطأ في الخادم (${errorCode}): فشل في ${operationName}`;
      } else if (errorDetails) {
        const detailsStr = typeof errorDetails === 'string'
          ? errorDetails
          : JSON.stringify(errorDetails);
        detailedMessage = `⚠️ خطأ في الخادم: ${detailsStr}`;
      } else {
        // رسالة أكثر وضوحاً حسب حالة الخطأ
        switch (status) {
          case 500:
            detailedMessage = `⚠️ خطأ داخلي في الخادم - فشل في ${operationName} (${operation})`;
            break;
          case 502:
            detailedMessage = `⚠️ الخادم غير متاح حالياً - تعذر ${operationName}`;
            break;
          case 503:
            detailedMessage = `⚠️ الخدمة غير متاحة مؤقتاً`;
            break;
          case 504:
            detailedMessage = `⚠️ انتهت مهلة الاتصال بالخادم - حاول مرة أخرى`;
            break;
          default:
            detailedMessage = `⚠️ خطأ في الخادم (${status}) - فشل في ${operationName}`;
        }
      }

      // إضافة رمز الخطأ إذا وُجد
      if (status) {
        console.error(`[خطأ ${status}] ${detailedMessage}`, { url, errorData, errorDetails });
      }

      toast.error(detailedMessage);
    } else {
      // للأخطاء غير الخادم (400-499)
      if (errorMessage) {
        toast.error(`⚠️ ${errorMessage}`);
      } else {
        toast.error('⚠️ حدث خطأ غير متوقع');
      }
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // File upload
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Download file
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Cancel request
  createCancelToken() {
    return axios.CancelToken.source();
  }
}

export const apiClient = new ApiClient();
