import React, { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Theme Hook and Context
 * 
 * Provides theme management (light/dark mode) throughout the application
 */

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  derivedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or use default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const location = useLocation();

  // If user has no saved theme yet, default analytics to dark on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme');
    if (!stored && location.pathname.startsWith('/analytics')) {
      setThemeState('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, [location.pathname]);

  // Get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Update actual theme based on theme setting
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        setActualTheme(getSystemTheme());
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateActualTheme();

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Calculate derived theme (effective theme) based on route
  const currentPath = location.pathname;
  // Check if we are in a storefront route including public pages
  const isStorefront = currentPath.startsWith('/shop') ||
    currentPath.startsWith('/home') ||
    currentPath.startsWith('/woodmart-replica') ||
    currentPath.startsWith('/page-builder') ||
    currentPath.startsWith('/landing-pages') ||
    currentPath.startsWith('/auth') && !currentPath.startsWith('/auth/admin') || // Assume auth pages are public/light? No, let's stick to known storefront
    currentPath === '/test-minimal' ||
    currentPath === '/test-public';

  // Routes that should be forced to dark mode
  const isDarkForced = (currentPath.startsWith('/reports') && !currentPath.startsWith('/reports/')) || // Only /reports, not subroutes
    currentPath.startsWith('/monitor-reports') ||
    currentPath.startsWith('/alert-settings') ||
    currentPath.startsWith('/support'); // Force dark mode for all support pages including FAQ

  // Analytics routes should NEVER be forced to dark mode - they respect user's theme choice
  const isAnalytics = currentPath.startsWith('/analytics');

  let derivedTheme = isStorefront ? 'light' : actualTheme;

  // Only force dark mode if not in analytics section
  if (isDarkForced && !isAnalytics) {
    derivedTheme = 'dark';
  }

  // Apply theme to document
  useLayoutEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Tailwind darkMode is class-based and expects only the 'dark' class
    if (derivedTheme === 'dark') {
      root.classList.add('dark');
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        derivedTheme === 'dark' ? '#1f2937' : '#ffffff'
      );
    }
  }, [derivedTheme]); // Depend on derivedTheme

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    if (theme === 'system') {
      // If currently system, switch to opposite of current system theme
      const systemTheme = getSystemTheme();
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    actualTheme,
    derivedTheme, // Expose the effective theme
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

