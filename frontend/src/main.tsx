import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { queryClient } from './config/queryClient';

// Import i18n configuration
import './i18n/config';

import './styles/index.css';

/**
 * Main Application Entry Point
 *
 * Sets up all providers and renders the main App component
 * with necessary context providers for state management.
 *
 * Development Tools:
 * - Install React DevTools browser extension for better debugging
 * - TanStack Query DevTools are enabled in development mode
 * - Hot Module Replacement (HMR) is enabled for fast development
 * - IndexedDB persistence for large-scale data (10K+ conversations)
 */

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create React root
const root = ReactDOM.createRoot(rootElement);

// Toast configuration
const toastOptions = {
  duration: 4000,
  position: 'top-right' as const,
  style: {
    background: '#363636',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    maxWidth: '400px',
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#22c55e',
      secondary: '#fff',
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
  loading: {
    duration: Infinity,
  },
};

// Main App Component with Providers
const AppWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            // Enable React 18 concurrent features for better performance
            v7_startTransition: true,
            // Use new relative path resolution for splat routes
            v7_relativeSplatPath: true,
          }}
        >
          <App />
          <Toaster toastOptions={toastOptions} />
          {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

// Render the application
root.render(<AppWithProviders />);

// Remove initial loading screen
const removeLoadingScreen = (): void => {
  const loadingElement = document.getElementById('initial-loading');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    loadingElement.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      loadingElement.remove();
      document.body.classList.add('app-ready');
    }, 300);
  }
};

// Remove loading screen after a short delay
setTimeout(removeLoadingScreen, 500);

// Performance monitoring
if (import.meta.env.PROD) {
  // Report web vitals in production
  import('./utils/reportWebVitals').then(({ reportWebVitals }) => {
    reportWebVitals();
  });
}

// Hot Module Replacement (HMR) for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
