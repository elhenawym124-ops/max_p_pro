import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Client Configuration
 * 
 * Configured for large-scale data (10K+ conversations)
 * Optimized for WhatsApp Chat performance
 * 
 * Note: IndexedDB persistence will be handled at the query level
 * using custom hooks that implement persistence logic
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
      refetchOnReconnect: true, // Refetch when connection is restored
      refetchOnMount: true, // Refetch when component mounts (but use cached data first)
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

export default queryClient;

