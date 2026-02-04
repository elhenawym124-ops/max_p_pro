/**
 * Error Tracking & Logging Service
 * نظام متقدم لتتبع وتسجيل الأخطاء
 */

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  category: 'api' | 'ui' | 'network' | 'auth' | 'validation' | 'unknown';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  companyId?: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTrackingService {
  private errors: ErrorLog[] = [];
  private maxErrors = 100; // Maximum errors to store in memory
  private isProduction = import.meta.env.PROD;
  private isDevelopment = import.meta.env.DEV;

  /**
   * تسجيل خطأ جديد
   */
  logError(
    message: string,
    error?: Error | any,
    context?: Record<string, any>
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'error',
      category: this.categorizeError(error),
      message,
      stack: error?.stack,
      context: {
        ...context,
        errorName: error?.name,
        errorMessage: error?.message,
      },
      userId: this.getUserId(),
      companyId: this.getCompanyId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.getSeverity(error),
    };

    // Store in memory
    this.errors.push(errorLog);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift(); // Remove oldest error
    }

    // Console log in development
    if (this.isDevelopment) {
      console.error('🔴 Error Tracked:', {
        message,
        error,
        context,
        errorLog,
      });
    }

    // Send to backend in production
    if (this.isProduction) {
      this.sendToBackend(errorLog);
    }

    // Store in localStorage for debugging
    this.saveToLocalStorage(errorLog);
  }

  /**
   * تسجيل تحذير
   */
  logWarning(message: string, context?: Record<string, any>): void {
    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'warning',
      category: 'unknown',
      message,
      context,
      userId: this.getUserId(),
      companyId: this.getCompanyId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: 'low',
    };

    this.errors.push(warningLog);

    if (this.isDevelopment) {
      console.warn('⚠️ Warning Tracked:', message, context);
    }
  }

  /**
   * تسجيل معلومة
   */
  logInfo(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.info('ℹ️ Info:', message, context);
    }
  }

  /**
   * تصنيف نوع الخطأ
   */
  private categorizeError(error: any): ErrorLog['category'] {
    if (!error) return 'unknown';

    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch')
    ) {
      return 'network';
    }

    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'auth';
    }

    if (
      message.includes('400') ||
      message.includes('validation') ||
      message.includes('invalid')
    ) {
      return 'validation';
    }

    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return 'api';
    }

    if (
      name.includes('react') ||
      name.includes('render') ||
      message.includes('component')
    ) {
      return 'ui';
    }

    return 'unknown';
  }

  /**
   * تحديد درجة خطورة الخطأ
   */
  private getSeverity(error: any): ErrorLog['severity'] {
    if (!error) return 'low';

    const status = error?.response?.status;
    const message = error.message?.toLowerCase() || '';

    // Critical errors
    if (
      status === 500 ||
      status === 503 ||
      message.includes('critical') ||
      message.includes('fatal')
    ) {
      return 'critical';
    }

    // High severity
    if (
      status === 401 ||
      status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'high';
    }

    // Medium severity
    if (
      status === 400 ||
      status === 404 ||
      message.includes('validation') ||
      message.includes('not found')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * إرسال الخطأ للـ Backend
   */
  private async sendToBackend(errorLog: ErrorLog): Promise<void> {
    try {
      const response = await fetch('/api/v1/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(errorLog),
      });

      if (!response.ok) {
        console.error('Failed to send error to backend');
      }
    } catch (err) {
      // Silently fail - don't create infinite loop
      console.error('Error sending error log:', err);
    }
  }

  /**
   * حفظ الخطأ في LocalStorage
   */
  private saveToLocalStorage(errorLog: ErrorLog): void {
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push(errorLog);

      // Keep only last 50 errors
      const recentErrors = storedErrors.slice(-50);

      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (err) {
      console.error('Failed to save error to localStorage:', err);
    }
  }

  /**
   * جلب الأخطاء المحفوظة
   */
  getStoredErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem('app_errors');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * مسح الأخطاء المحفوظة
   */
  clearStoredErrors(): void {
    localStorage.removeItem('app_errors');
    this.errors = [];
  }

  /**
   * جلب آخر الأخطاء
   */
  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errors.slice(-count);
  }

  /**
   * فلترة الأخطاء حسب النوع
   */
  getErrorsByCategory(category: ErrorLog['category']): ErrorLog[] {
    return this.errors.filter((err) => err.category === category);
  }

  /**
   * فلترة الأخطاء حسب الخطورة
   */
  getErrorsBySeverity(severity: ErrorLog['severity']): ErrorLog[] {
    return this.errors.filter((err) => err.severity === severity);
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * جلب معرف المستخدم
   */
  private getUserId(): string | undefined {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return undefined;
      const user = JSON.parse(userStr);
      return user ? user.id || user._id : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * جلب معرف الشركة
   */
  private getCompanyId(): string | undefined {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return undefined;
      const user = JSON.parse(userStr);
      return user ? user.companyId : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * معالجة الأخطاء غير المتوقعة
   */
  setupGlobalErrorHandlers(): void {
    // Window error handler
    window.addEventListener('error', (event) => {
      this.logError(
        `Uncaught Error: ${event.message}`,
        event.error,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason,
        {
          promise: event.promise,
        }
      );
    });

    // Console error override (optional)
    if (this.isProduction) {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        this.logError('Console Error', new Error(args.join(' ')));
        originalConsoleError.apply(console, args);
      };
    }
  }

  /**
   * تصدير الأخطاء كـ JSON
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * تصدير الأخطاء كـ CSV
   */
  exportErrorsAsCSV(): string {
    const headers = ['Timestamp', 'Type', 'Category', 'Message', 'Severity', 'URL'];
    const rows = this.errors.map((err) => [
      err.timestamp,
      err.type,
      err.category,
      err.message,
      err.severity,
      err.url,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

// Create singleton instance
const errorTracking = new ErrorTrackingService();

// Setup global handlers
errorTracking.setupGlobalErrorHandlers();

export default errorTracking;
