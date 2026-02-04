// Currency utilities for the application

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  nameAr: string;
}

// Supported currencies
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'ج.م',
    nameAr: 'جنيه مصري'
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    nameAr: 'دولار أمريكي'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    nameAr: 'يورو'
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    nameAr: 'ريال سعودي'
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    nameAr: 'درهم إماراتي'
  }
];

// Default currency
export const DEFAULT_CURRENCY = 'EGP';

// Get currency by code
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return SUPPORTED_CURRENCIES.find(currency => currency.code === code);
};

// Format currency amount
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = 'ar-EG'
): string => {
  // Handle null or undefined
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }
  
  const currency = getCurrencyByCode(currencyCode);
  
  if (!currency) {
    return `${amount} ${currencyCode}`;
  }

  // Format number with Arabic locale for Egyptian Pound
  if (currencyCode === 'EGP') {
    return `${amount.toLocaleString('ar-EG')} ${currency.symbol}`;
  }

  // Format with appropriate locale for other currencies
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency.symbol}${amount.toLocaleString()}`;
  }
};

// Format currency for display in forms
export const formatCurrencyInput = (
  amount: number | string | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  if (amount === null || amount === undefined) {
    return '';
  }
  
  const currency = getCurrencyByCode(currencyCode);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (!currency || isNaN(numAmount)) {
    return '';
  }

  return `${numAmount} ${currency.symbol}`;
};

// Parse currency input
export const parseCurrencyInput = (input: string): number => {
  // Remove currency symbols and spaces
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol || currencyCode;
};

// Validate currency code
export const isValidCurrencyCode = (code: string): boolean => {
  return SUPPORTED_CURRENCIES.some(currency => currency.code === code);
};
