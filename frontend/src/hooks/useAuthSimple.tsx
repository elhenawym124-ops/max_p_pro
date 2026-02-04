import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getApiUrl } from '../config/environment';
import { tokenManager } from '../utils/tokenManager';
import socketService from '../services/socketService';

// 🔍 DEBUG: Check if this module is loaded multiple times
console.debug('🕵️ [useAuthSimple] Module loaded at:', new Date().toISOString());
const _uniqueId = Math.random().toString(36).substring(7);
console.debug('🕵️ [useAuthSimple] Module instance ID:', _uniqueId);

interface Company {
  id: string;
  name: string;
  slug: string | null;
  customDomain?: string | null;
  logo?: string | null;
  plan: string;
  currency?: string;
  isActive?: boolean;
  role?: string;
  sidebarLayout?: string;
  isDefault?: boolean;
  isCurrent?: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  timezone?: string;
  companyId: string | null;
  company: Company | null;
  companies?: Company[];         // قائمة الشركات التي ينتمي إليها المستخدم
  hasMultipleCompanies?: boolean; // هل لديه أكثر من شركة؟
  devStats?: {
    xp: number;
    level: number;
  } | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials | User, token?: string) => Promise<User | null>;
  register: (data: RegisterData) => Promise<User | null>;
  logout: () => void;
  switchCompany: (companyId: string) => Promise<boolean>; // التبديل بين الشركات
  isSwitchingCompany: boolean; // هل يتم التبديل حالياً؟
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const debugLog = (...args: any[]) => {
    if (isDev) console.debug(...args);
  };
  const warnLog = (...args: any[]) => {
    if (isDev) console.warn(...args);
  };
  const errorLog = (...args: any[]) => {
    if (isDev) console.error(...args);
  };

  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      debugLog('🔍 [AuthProvider] Starting auth check...');
      let finalUser: User | null = null;

      try {
        const token = tokenManager.getAccessToken();
        debugLog('🔍 [AuthProvider] Token exists:', !!token);

        if (token) {
          let mePath = '/auth/me';
          try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = JSON.parse(atob(payloadBase64));
            if (payloadJson?.role === 'CUSTOMER') {
              mePath = '/public/customers/me';
            }
          } catch (e) {
            // ignore decoding errors
          }

          debugLog(`🔍 [AuthProvider] Making ${mePath} request...`);

          const response = await fetch(`${getApiUrl()}${mePath}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            debugLog('🔍 [AuthProvider] Response received');

            if (data.success) {
              debugLog('✅ [AuthProvider] Authenticated user loaded');
              finalUser = data.data;
              setUser(data.data);
            } else {
              // Token invalid or expired - silently clear it
              warnLog('⚠️ [AuthProvider] API returned success:false, clearing tokens');
              tokenManager.clearTokens();
              localStorage.removeItem('user');
              setUser(null);
              finalUser = null;
            }
          } else if (response.status === 403 || response.status === 401) {
            // Token expired or invalid - silently clear it (this is expected)
            warnLog('⚠️ [AuthProvider] Token expired or invalid (401/403), clearing tokens');
            warnLog('⚠️ [AuthProvider] Response status:', response.status);
            tokenManager.clearTokens();
            localStorage.removeItem('user');
            setUser(null);
            finalUser = null;
            debugLog('🔐 [AuthProvider] Token invalid, cleared');
          } else {
            // Other errors - log and handle
            warnLog('⚠️ [AuthProvider] Auth check failed with status:', response.status);
            try {
              const errorData = await response.text();
              warnLog('⚠️ [AuthProvider] Error response (truncated):', String(errorData).slice(0, 500));
            } catch (e) {
              // Ignore if can't read response
            }

            // Only clear tokens if it's a clear auth error (4xx)
            if (response.status >= 400 && response.status < 500) {
              warnLog('⚠️ [AuthProvider] Client error (4xx), clearing tokens');
              tokenManager.clearTokens();
              localStorage.removeItem('user');
              setUser(null);
              finalUser = null;
            } else {
              // Server error (5xx) - might be temporary, keep tokens and keep user if exists
              warnLog('⚠️ [AuthProvider] Server error (5xx), keeping tokens and user state');
              // Don't change user state on server errors - keep existing user
              finalUser = user;
            }
          }
        } else {
          debugLog('🔐 [AuthProvider] No token found');
        }
      } catch (error: any) {
        // Network errors or other issues - log
        errorLog('❌ [AuthProvider] Auth check failed:', error?.message || error);

        // Don't clear tokens on network errors - might be temporary
        // Only clear if it's a clear authentication error
        if (error?.message && error.message.includes('401')) {
          warnLog('⚠️ [AuthProvider] 401 error detected, clearing tokens');
          tokenManager.clearTokens();
          localStorage.removeItem('user');
          setUser(null);
          finalUser = null;
        } else {
          warnLog('⚠️ [AuthProvider] Network error - keeping tokens and user state');
          // Keep tokens and keep existing user on network errors
          finalUser = user;
        }
      } finally {
        debugLog('🔍 [AuthProvider] Final isAuthenticated:', !!finalUser);

        // Ensure user is set before setting loading to false
        // This prevents race condition where isAuthenticated is false when isLoading becomes false
        if (finalUser) {
          debugLog('✅ [AuthProvider] User exists, ensuring it\'s set before setting loading to false');
          // User should already be set above, but ensure it's set
          if (!user || user.id !== finalUser.id) {
            setUser(finalUser);
          }
          // Small delay to ensure state update propagates
          setTimeout(() => {
            setIsLoading(false);
            debugLog('✅ [AuthProvider] Loading set to false');
          }, 50);
        } else {
          setIsLoading(false);
          debugLog('⚠️ [AuthProvider] No user, loading set to false');
        }
      }
    };

    checkAuth();
  }, []); // Empty dependency array - only run once on mount

  const login = async (credentials: LoginCredentials | User, token?: string) => {
    debugLog('🔍 [AuthProvider] Starting login...');
    try {
      // If user and token are provided directly (for Super Admin)
      if (token && typeof credentials === 'object' && 'id' in credentials) {
        debugLog('🔍 [AuthProvider] Direct login with token');
        tokenManager.setAccessToken(token);
        const userData = credentials as User;
        setUser(userData);
        return userData;
      }

      // Normal login flow
      const loginCredentials = credentials as LoginCredentials;
      debugLog('🔍 [AuthProvider] Normal login flow');

      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginCredentials.email,
          password: loginCredentials.password
        })
      });

      debugLog('🔍 [AuthProvider] Login response status:', response.status);

      // Handle network errors
      if (!response.ok) {
        let errorMessage = 'فشل في تسجيل الدخول';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `خطأ في الاتصال (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      debugLog('🔍 [AuthProvider] Login response received');

      if (data.success) {
        // Store tokens
        debugLog('✅ [AuthProvider] Login successful, storing token');
        tokenManager.setAccessToken(data.data.token);
        if (data.data.refreshToken) {
          tokenManager.setRefreshToken(data.data.refreshToken);
        }

        // Set user data
        debugLog('✅ [AuthProvider] Setting user data');
        const userData = data.data.user;
        setUser(userData);

        // Store user data in localStorage for Socket.IO connection
        localStorage.setItem('user', JSON.stringify(userData));

        // 🔌 Reconnect socket with new authentication token
        socketService.disconnect();
        socketService.connect();
        debugLog('🔌 [AUTH] Socket reconnected with new token');

        // Return user data for immediate use
        return userData;
      } else {
        throw new Error(data.message || 'فشل في تسجيل الدخول');
      }
    } catch (error: any) {
      errorLog('❌ [AuthProvider] Login error:', error?.message || error);
      // Provide better error message for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('فشل الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.');
      }
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'فشل في إنشاء الحساب');
      }

      // Store token and user data
      tokenManager.setAccessToken(result.data.token);
      if (result.data.refreshToken) {
        tokenManager.setRefreshToken(result.data.refreshToken);
      }

      // Prepare user object with company data
      const userData = {
        ...result.data.user,
        company: result.data.company || null
      };

      setUser(userData);

      // Store user data in localStorage for Socket.IO connection
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (token) {
        // Call logout API
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      errorLog('Logout error:', error);
    } finally {
      // Always clear storage and user state
      tokenManager.clearTokens();
      localStorage.removeItem('user');
      setUser(null);

      // 🔌 Disconnect socket to force fresh connection on next login
      socketService.disconnect();
      debugLog('🔌 [AUTH] Socket disconnected on logout');
    }
  };

  // التبديل إلى شركة أخرى
  const switchCompany = async (companyId: string): Promise<boolean> => {
    debugLog('🔄 [AuthProvider] Switching to company:', companyId);

    try {
      setIsSwitchingCompany(true);
      const token = tokenManager.getAccessToken();

      if (!token) {
        errorLog('❌ [AuthProvider] No token for company switch');
        return false;
      }

      const response = await fetch(`${getApiUrl()}/auth/switch-company/${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        debugLog('✅ [AuthProvider] Company switch successful');

        // Store new token
        tokenManager.setAccessToken(data.data.token);

        // Update user's current company
        if (user) {
          const updatedCompanies = user.companies?.map(c => ({
            ...c,
            isCurrent: c.id === companyId
          }));

          const updatedUser = {
            ...user,
            companyId: companyId,
            role: data.data.role,
            company: data.data.company,
            companies: updatedCompanies
          };

          setUser(updatedUser);

          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));

          // Store company switch timestamp to force reload
          localStorage.setItem('companySwitchTimestamp', Date.now().toString());
        }

        // Wait for localStorage to be written, then reload
        // Use setTimeout to ensure all state updates are flushed
        setTimeout(() => {
          // Force hard reload to clear all cached data
          window.location.href = window.location.pathname + '?t=' + Date.now();
        }, 100);

        return true;
      } else {
        errorLog('❌ [AuthProvider] Company switch failed:', data?.message);
        return false;
      }
    } catch (error) {
      errorLog('❌ [AuthProvider] Company switch error:', error);
      return false;
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    switchCompany,
    isSwitchingCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
