import { useState, useCallback, useRef } from 'react';
import useErrorHandler, { ErrorState } from './useErrorHandler';

export interface LoadingState {
  conversations: boolean;
  messages: boolean;
  sending: boolean;
  retrying: boolean;
  initialLoad: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export interface UseLoadingWithRetryReturn {
  loading: LoadingState;
  error: ErrorState | null;
  retryCount: number;
  setLoading: (key: keyof LoadingState, value: boolean) => void;
  executeWithRetry: <T>(
    fn: () => Promise<T>,
    loadingKey?: keyof LoadingState,
    config?: Partial<RetryConfig>
  ) => Promise<T>;
  retry: () => Promise<void>;
  clearError: () => void;
  isError: boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBackoff: true
};

const useLoadingWithRetry = (): UseLoadingWithRetryReturn => {
  const [loading, setLoadingState] = useState<LoadingState>({
    conversations: false,
    messages: false,
    sending: false,
    retrying: false,
    initialLoad: true
  });

  const [retryCount, setRetryCount] = useState(0);
  const lastFailedFunction = useRef<(() => Promise<any>) | null>(null);
  const { error, handleError, clearError, isError } = useErrorHandler();

  const setLoading = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const calculateDelay = (attempt: number, config: RetryConfig): number => {
    if (!config.exponentialBackoff) {
      return config.baseDelay;
    }

    const delay = config.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, config.maxDelay);
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const executeWithRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    loadingKey?: keyof LoadingState,
    config: Partial<RetryConfig> = {}
  ): Promise<T> => {
    const finalConfig = { ...defaultRetryConfig, ...config };
    let lastError: any;

    // حفظ الدالة للإعادة المحاولة لاحقاً
    lastFailedFunction.current = fn;

    // تعيين حالة التحميل
    if (loadingKey) {
      setLoading(loadingKey, true);
    }

    // مسح الأخطاء السابقة
    clearError();
    setRetryCount(0);

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      try {
        // إظهار حالة إعادة المحاولة إذا لم تكن المحاولة الأولى
        if (attempt > 1) {
          setLoading('retrying', true);
          setRetryCount(attempt - 1);
        }

        const result = await fn();

        // نجحت العملية - مسح حالات التحميل
        if (loadingKey) {
          setLoading(loadingKey, false);
        }
        setLoading('retrying', false);
        setRetryCount(0);
        lastFailedFunction.current = null;

        return result;

      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);

        // إذا كانت هذه المحاولة الأخيرة، أو إذا كان الخطأ غير قابل للإعادة
        if (attempt > finalConfig.maxRetries) {
          break;
        }

        // التحقق من إمكانية إعادة المحاولة
        const errorType = error?.response?.status;
        if (errorType === 401 || errorType === 403 || errorType === 404) {
          // أخطاء غير قابلة للإعادة
          break;
        }

        // انتظار قبل المحاولة التالية
        const delay = calculateDelay(attempt, finalConfig);
        await sleep(delay);
      }
    }

    // فشلت جميع المحاولات
    if (loadingKey) {
      setLoading(loadingKey, false);
    }
    setLoading('retrying', false);

    handleError(lastError);
    throw lastError;

  }, [setLoading, clearError, handleError]);

  const retry = useCallback(async (): Promise<void> => {
    if (lastFailedFunction.current) {
      try {
        await executeWithRetry(lastFailedFunction.current);
      } catch (error) {
        // الخطأ تم التعامل معه في executeWithRetry
      }
    }
  }, [executeWithRetry]);

  return {
    loading,
    error,
    retryCount,
    setLoading,
    executeWithRetry,
    retry,
    clearError,
    isError
  };
};

export default useLoadingWithRetry;
