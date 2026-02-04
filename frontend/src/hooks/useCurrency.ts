import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { formatCurrency, DEFAULT_CURRENCY } from '../utils/currency';

interface UseCurrencyReturn {
  currency: string;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  isLoading: boolean;
  error: string | null;
}

export const useCurrency = (): UseCurrencyReturn => {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCompanyCurrency = async () => {
      // Only run once and don't retry on failure
      if (currency !== DEFAULT_CURRENCY) return;

      try {
        setIsLoading(true);
        setError(null);

        // Try to get user, but don't fail if auth service is not available
        let user = null;
        try {
          user = await authService.getCurrentUser();
        } catch (authError) {
          console.warn('Auth service not available, using mock user for development');
          // Mock user for development
          user = {
            id: 'dev-user',
            companyId: 'cmd5c0c9y0000ymzdd7wtv7ib',
            email: 'dev@example.com',
            firstName: 'Developer',
            lastName: 'User',
            role: 'admin'
          };
        }

        if (!user?.companyId) {
          if (isMounted) setCurrency(DEFAULT_CURRENCY);
          return;
        }

        const token = authService.getAccessToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/v1/companies/${user.companyId}`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          // Check both data.data.settings.currency and data.data.currency for compatibility
          const companyCurrency = data.data?.settings?.currency || data.data?.currency || DEFAULT_CURRENCY;
          if (isMounted) setCurrency(companyCurrency);
        } else {
          console.warn('Failed to fetch company currency, using default');
          if (isMounted) setCurrency(DEFAULT_CURRENCY);
        }
      } catch (err) {
        console.warn('Error fetching company currency, using default:', err);
        // Don't set error state for CORS issues, just use default
        if (isMounted) setCurrency(DEFAULT_CURRENCY);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCompanyCurrency();

    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  const formatPrice = (amount: number | null | undefined, currencyCode?: string): string => {
    return formatCurrency(amount, currencyCode || currency);
  };

  return {
    currency,
    formatPrice,
    isLoading,
    error
  };
};

export default useCurrency;
