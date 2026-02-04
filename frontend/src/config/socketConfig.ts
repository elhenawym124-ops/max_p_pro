// إعدادات Socket.IO للتطبيق
import { buildWsUrl } from '../utils/urlHelper';

export const SOCKET_CONFIG = {
  // عنوان الخادم
  SERVER_URL: buildWsUrl(),
  
  // خيارات الاتصال
  CONNECTION_OPTIONS: {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000,
    forceNew: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 5,
    randomizationFactor: 0.5,
  },

  // أحداث Socket.IO
  EVENTS: {
    // أحداث الاتصال
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    RECONNECT: 'reconnect',
    RECONNECT_ERROR: 'reconnect_error',
    RECONNECT_FAILED: 'reconnect_failed',

    // أحداث المستخدم
    USER_JOIN: 'user_join',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
    ONLINE_USERS: 'online_users',

    // أحداث الرسائل
    SEND_MESSAGE: 'send_message',
    NEW_MESSAGE: 'new_message',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_DELIVERED: 'message_delivered',
    MESSAGE_READ: 'message_read',

    // أحداث الكتابة
    START_TYPING: 'start_typing',
    STOP_TYPING: 'stop_typing',
    USER_TYPING: 'user_typing',
    USER_STOPPED_TYPING: 'user_stopped_typing',

    // أحداث المحادثات
    JOIN_CONVERSATION: 'join_conversation',
    LEAVE_CONVERSATION: 'leave_conversation',
    MARK_AS_READ: 'mark_as_read',

    // أحداث الأخطاء
    ERROR: 'error',
  },

  // إعدادات الكتابة
  TYPING_CONFIG: {
    TIMEOUT: 3000, // مدة انتظار قبل إيقاف مؤشر الكتابة
    DEBOUNCE_DELAY: 300, // تأخير قبل إرسال حدث الكتابة
  },

  // إعدادات الرسائل
  MESSAGE_CONFIG: {
    MAX_LENGTH: 1000, // الحد الأقصى لطول الرسالة
    RETRY_ATTEMPTS: 3, // عدد محاولات إعادة الإرسال
    RETRY_DELAY: 1000, // تأخير بين المحاولات
  },

  // إعدادات التمرير
  SCROLL_CONFIG: {
    SMOOTH_BEHAVIOR: true,
    AUTO_SCROLL_THRESHOLD: 100, // المسافة من الأسفل للتمرير التلقائي
    SCROLL_DEBOUNCE: 100, // تأخير أحداث التمرير
  },

  // إعدادات التحميل
  LOADING_CONFIG: {
    INITIAL_DELAY: 500, // تأخير قبل إظهار مؤشر التحميل
    SKELETON_COUNT: 5, // عدد عناصر Skeleton
    RETRY_DELAYS: [1000, 2000, 4000], // تأخيرات إعادة المحاولة
  },

  // رسائل الحالة
  STATUS_MESSAGES: {
    CONNECTING: 'جاري الاتصال...',
    CONNECTED: 'متصل',
    DISCONNECTED: 'غير متصل',
    RECONNECTING: 'جاري إعادة الاتصال...',
    ERROR: 'خطأ في الاتصال',
    TYPING: 'يكتب...',
    ONLINE: 'متصل الآن',
    OFFLINE: 'غير متصل',
    SENDING: 'جاري الإرسال...',
    SENT: 'تم الإرسال',
    DELIVERED: 'تم التسليم',
    READ: 'تم القراءة',
  },

  // ألوان الحالة
  STATUS_COLORS: {
    CONNECTED: '#10B981', // أخضر
    DISCONNECTED: '#EF4444', // أحمر
    RECONNECTING: '#F59E0B', // أصفر
    TYPING: '#6366F1', // بنفسجي
    SENDING: '#8B5CF6', // بنفسجي فاتح
  },
};

// أنواع البيانات
export interface SocketUser {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface SocketMessage {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  senderId: string;
  senderName: string;
  timestamp: Date;
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  tempId?: string;
}

export interface SocketConversation {
  id: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  platform: string;
  isOnline: boolean;
  messages: SocketMessage[];
}

export interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// مساعدات الأدوات
export const SocketUtils = {
  // إنشاء معرف مؤقت للرسالة
  generateTempId: (): string => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // تنسيق الوقت
  formatTime: (date: Date): string => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // تنسيق التاريخ - ميلادي فقط
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory'
    });
  },

  // التحقق من صحة الرسالة
  validateMessage: (content: string): boolean => {
    return content.trim().length > 0 && content.length <= SOCKET_CONFIG.MESSAGE_CONFIG.MAX_LENGTH;
  },

  // حساب الوقت المنقضي
  getTimeAgo: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  },

  // تنظيف النص
  sanitizeText: (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  },
};

export default SOCKET_CONFIG;
