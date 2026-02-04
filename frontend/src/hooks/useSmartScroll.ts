import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSmartScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  isAtBottom: boolean;
  showScrollButton: boolean;
  showNewMessageAlert: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  scrollToTop: () => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  markAsRead: () => void;
  addUnreadMessage: () => void;
}

const useSmartScroll = (): UseSmartScrollReturn => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showNewMessageAlert, setShowNewMessageAlert] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // التحقق من موقع التمرير
  const checkScrollPosition = useCallback((container: HTMLDivElement) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 100px من الأسفل
    const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setIsAtBottom(isNearBottom);
    setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
    
    // إخفاء تنبيه الرسائل الجديدة عند التمرير للأسفل
    if (isNearBottom && showNewMessageAlert) {
      setShowNewMessageAlert(false);
      setUnreadCount(0);
    }
    
    setLastScrollTop(scrollTop);
  }, [showNewMessageAlert]);

  // معالج التمرير
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    checkScrollPosition(container);
  }, [checkScrollPosition]);

  // التمرير للأسفل
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // التمرير للأعلى
  const scrollToTop = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  // تمييز الرسائل كمقروءة
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    setShowNewMessageAlert(false);
  }, []);

  // إضافة رسالة غير مقروءة
  const addUnreadMessage = useCallback(() => {
    if (!isAtBottom) {
      setUnreadCount(prev => prev + 1);
      setShowNewMessageAlert(true);
    }
  }, [isAtBottom]);

  // التمرير التلقائي للرسائل الجديدة
  useEffect(() => {
    if (isAtBottom) {
      // تأخير بسيط للسماح للرسالة بالظهور أولاً
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAtBottom, scrollToBottom]);

  // مراقبة تغيير حجم الحاوي
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottom) {
        scrollToBottom(false);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isAtBottom, scrollToBottom]);

  return {
    messagesEndRef,
    messagesContainerRef,
    isAtBottom,
    showScrollButton,
    showNewMessageAlert,
    unreadCount,
    scrollToBottom,
    scrollToTop,
    handleScroll,
    markAsRead,
    addUnreadMessage
  };
};

export default useSmartScroll;
