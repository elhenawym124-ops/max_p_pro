// Company-related types

export interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  currency: string; // Currency code (e.g., 'EGP', 'USD')
  timezone?: string;
  language: string;
  subscription?: {
    plan: string;
    status: string;
    expiresAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CurrencySettings {
  code: string;
  symbol: string;
  name: string;
  nameAr: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export interface CompanyPreferences {
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  language: string;
  timezone: string;
}
