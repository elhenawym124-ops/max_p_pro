import { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Virtual Scrolling Hooks
 * 
 * Custom hooks for virtual scrolling using @tanstack/react-virtual
 * Optimized for large lists (10K+ items)
 */

interface UseVirtualScrollOptions {
  estimateSize?: number;
  overscan?: number;
  horizontal?: boolean;
  scrollToIndex?: number | null;
  onScroll?: (offset: number) => void;
}

/**
 * Hook for virtual scrolling conversations list
 */
export const useVirtualConversations = <T extends { id: string }>(
  items: T[],
  parentRef: React.RefObject<HTMLElement>,
  options: UseVirtualScrollOptions = {}
) => {
  const {
    estimateSize = 80,
    overscan = 5,
    horizontal = false,
    scrollToIndex,
    onScroll
  } = options;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
  });

  // Scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== null && scrollToIndex !== undefined) {
      virtualizer.scrollToIndex(scrollToIndex, {
        align: 'start',
        behavior: 'smooth'
      });
    }
  }, [scrollToIndex, virtualizer]);

  // Handle scroll events
  useEffect(() => {
    const element = parentRef.current;
    if (!element || !onScroll) return;

    const handleScroll = () => {
      onScroll(virtualizer.getScrollOffset());
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [parentRef, virtualizer, onScroll]);

  return virtualizer;
};

/**
 * Hook for virtual scrolling messages list
 */
export const useVirtualMessages = <T extends { id: string }>(
  items: T[],
  parentRef: React.RefObject<HTMLElement>,
  options: UseVirtualScrollOptions & {
    scrollToBottom?: boolean;
    reverse?: boolean; // For messages, we want reverse order (newest at bottom)
  } = {}
) => {
  const {
    estimateSize = 60,
    overscan = 10,
    horizontal = false,
    scrollToBottom = false,
    reverse = false,
    onScroll
  } = options;

  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevItemsLengthRef = useRef(items.length);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
  });

  // Auto scroll to bottom when new messages arrive (if user is at bottom)
  useEffect(() => {
    const element = parentRef.current;
    if (!element || !scrollToBottom || !isAtBottom) return;

    const hasNewMessages = items.length > prevItemsLengthRef.current;
    if (hasNewMessages) {
      // Scroll to bottom using native scrollHeight for reliability
      // This avoids 'Failed to get offset' errors from virtualizer for unmeasured items
      const timeoutId = setTimeout(() => {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);

      prevItemsLengthRef.current = items.length;

      return () => clearTimeout(timeoutId);
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length, scrollToBottom, isAtBottom, parentRef]); // Removed virtualizer dependency

  // Check if user is at bottom
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const threshold = 100; // 100px threshold
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
      setIsAtBottom(atBottom);

      if (onScroll) {
        onScroll(virtualizer.getScrollOffset());
      }
    };

    element.addEventListener('scroll', checkScrollPosition, { passive: true });
    checkScrollPosition(); // Initial check

    return () => element.removeEventListener('scroll', checkScrollPosition);
  }, [parentRef, virtualizer, onScroll]);

  // Scroll to bottom function
  const scrollToBottomFn = useCallback(() => {
    const element = parentRef.current;
    if (element && items.length > 0) {
      // Use native scroll for reliable bottom scrolling
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
      setIsAtBottom(true);
    }
  }, [items.length, parentRef]);

  // Scroll to top function (for loading older messages)
  const scrollToTopFn = useCallback(() => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(0, {
        align: 'start',
        behavior: 'smooth'
      });
    }
  }, [items.length, virtualizer]);

  return {
    virtualizer,
    isAtBottom,
    scrollToBottom: scrollToBottomFn,
    scrollToTop: scrollToTopFn,
  };
};

/**
 * Hook for infinite scroll detection (loading older messages)
 */
export const useInfiniteScroll = (
  containerRef: React.RefObject<HTMLElement>,
  onLoadMore: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
  } = {}
) => {
  const { threshold = 200, enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !enabled) return;

    const handleScroll = () => {
      const { scrollTop } = element;

      // If scrolled near top, load more
      if (scrollTop < threshold && !isLoading) {
        setIsLoading(true);
        onLoadMore();

        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        // Reset loading state after a delay
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          loadingTimeoutRef.current = null;
        }, 1000);
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [containerRef, onLoadMore, threshold, enabled, isLoading]);

  return { isLoading };
};

