import { useState, useEffect, useCallback, useRef } from 'react';
import useSocket from './useSocket';
import { buildApiUrl } from '../utils/urlHelper';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  platform: 'facebook' | 'whatsapp' | 'telegram';
  messages: Message[];
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
  aiEnabled?: boolean; // حالة الذكاء الاصطناعي
}

export interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: Date;
}

export interface UseRealTimeMessagingReturn {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  typingUsers: TypingUser[];
  onlineUsers: string[];
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;

  // Actions
  selectConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, type?: Message['type']) => Promise<void>;
  markAsRead: (conversationId: string, messageId?: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  loadConversations: (searchQuery?: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
}

// Helper to safely parse dates
const safeDate = (date: any): Date => {
  if (!date) return new Date();
  try {
    const parsed = new Date(date);
    // Check if date is valid
    if (isNaN(parsed.getTime())) {
      console.warn('⚠️ [DATE-FIX] Invalid date detected, using current time:', date);
      return new Date();
    }
    return parsed;
  } catch (e) {
    console.error('❌ [DATE-FIX] Error parsing date:', e);
    return new Date();
  }
};

const useRealTimeMessaging = (): UseRealTimeMessagingReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const { socket, isConnected, isReconnecting, connectionError, emit, on, off } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // تحديث محادثة معينة
  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, ...updates } : conv
    ));

    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedConversation]);

  // إضافة رسالة جديدة
  const addMessage = useCallback((message: Message) => {
    const conversationId = message.conversationId;

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, message];
        return {
          ...conv,
          messages: updatedMessages,
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
          unreadCount: message.isFromCustomer ? conv.unreadCount + 1 : conv.unreadCount
        };
      }
      return conv;
    }));

    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, message],
        lastMessage: message.content,
        lastMessageTime: message.timestamp
      } : null);
    }
  }, [selectedConversation]);

  // تحديث حالة الرسالة
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setConversations(prev => prev.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    })));

    if (selectedConversation) {
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      } : null);
    }
  }, [selectedConversation]);

  // تحميل المحادثات مع دعم البحث
  const loadConversations = useCallback(async (searchQuery?: string) => {
    try {
      const url = new URL(buildApiUrl('conversations'));
      if (searchQuery && searchQuery.trim()) {
        url.searchParams.append('search', searchQuery.trim());
      }

      const response = await fetch(url.toString());
      const result = await response.json();

      // التعامل مع الاستجابة الجديدة
      const data = result.success ? result.data : result;

      if (data && Array.isArray(data)) {
        console.log('🔍 [CONVERSATIONS-DEBUG] Raw data from server:', data.slice(0, 2)); // أول محادثتين فقط
        const formattedConversations = data.map((conv: any) => {
          console.log('🔍 [CONVERSATION-DEBUG] Processing conversation:', conv.id, 'aiEnabled:', conv.aiEnabled);
          return {
            id: conv.id,
            customerId: conv.customerId,
            customerName: conv.customerName || (conv.customer ?
              `${conv.customer.firstName} ${conv.customer.lastName}`.trim() ||
              conv.customer.email ||
              'عميل غير معروف' : 'عميل غير معروف'),
            lastMessage: conv.lastMessage || conv.lastMessagePreview || 'لا توجد رسائل',
            lastMessageTime: safeDate(conv.lastMessageTime || conv.lastMessageAt || Date.now()),
            unreadCount: conv.unreadCount || 0,
            platform: conv.platform || conv.channel?.toLowerCase() || 'unknown',
            status: conv.status || 'active',
            isOnline: onlineUsers.includes(conv.customerId),
            messages: [],
            aiEnabled: conv.aiEnabled !== undefined ? conv.aiEnabled : true, // إضافة حالة AI
            pageName: conv.pageName || null, // إضافة اسم الصفحة
            pageId: conv.pageId || null // إضافة معرف الصفحة
          };
        });

        console.log('✅ [CONVERSATIONS-DEBUG] Formatted conversations:', formattedConversations.slice(0, 2).map(c => ({
          id: c.id,
          customerName: c.customerName,
          aiEnabled: c.aiEnabled
        })));
        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, [onlineUsers]);

  // تحميل رسائل محادثة معينة
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(buildApiUrl(`conversations/${conversationId}/messages`));
      const data = await response.json();

      if (data.success) {
        const formattedMessages = data.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'مجهول',
          timestamp: safeDate(msg.createdAt),
          type: msg.type?.toLowerCase() === 'image' ? 'image' : msg.type?.toLowerCase() || 'text',
          isFromCustomer: msg.isFromCustomer,
          status: msg.status || 'sent',
          conversationId: conversationId,
          fileUrl: msg.fileUrl || (msg.type?.toLowerCase() === 'image' ? msg.content : undefined),
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          voiceDuration: msg.voiceDuration
        }));

        updateConversation(conversationId, { messages: formattedMessages });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [updateConversation]);

  // اختيار محادثة
  const selectConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);

      // تحميل الرسائل إذا لم تكن محملة
      if (conversation.messages.length === 0) {
        loadMessages(conversationId);
      }

      // تمييز الرسائل كمقروءة
      if (conversation.unreadCount > 0) {
        markAsRead(conversationId);
      }
    }
  }, [conversations, loadMessages]);

  // إرسال رسالة
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    type: Message['type'] = 'text'
  ) => {
    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content,
      senderId: 'current_user',
      senderName: 'أنت',
      timestamp: safeDate(new Date()),
      type,
      isFromCustomer: false,
      status: 'sending',
      conversationId
    };

    // إضافة الرسالة مؤقتاً
    addMessage(tempMessage);

    try {
      // إرسال عبر Socket.IO
      emit('send_message', {
        conversationId,
        content,
        type,
        tempId
      });

      // إرسال عبر API كـ backup
      const response = await fetch(buildApiUrl(`conversations/${conversationId}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, type })
      });

      const data = await response.json();

      if (data.success) {
        // تحديث الرسالة المؤقتة بالبيانات الحقيقية
        updateMessageStatus(tempId, 'sent');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      updateMessageStatus(tempId, 'sent'); // تمييز كمرسلة حتى لو فشل API
    }
  }, [addMessage, emit, updateMessageStatus]);

  // تمييز كمقروء
  const markAsRead = useCallback((conversationId: string, messageId?: string) => {
    emit('mark_as_read', { conversationId, messageId });
    updateConversation(conversationId, { unreadCount: 0 });
  }, [emit, updateConversation]);

  // بدء الكتابة
  const startTyping = useCallback((conversationId: string) => {
    emit('start_typing', { conversationId });
  }, [emit]);

  // إيقاف الكتابة
  const stopTyping = useCallback((conversationId: string) => {
    emit('stop_typing', { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [emit]);

  // إعداد مستمعي الأحداث
  useEffect(() => {
    if (!socket || !isConnected) return;

    // رسالة جديدة
    const handleNewMessage = (message: any) => {
      console.log('🔔 [NEW-MESSAGE] Received message:', message);

      const formattedMessage: Message = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        timestamp: safeDate(message.timestamp),
        type: message.type?.toLowerCase() === 'image' ? 'image' : message.type?.toLowerCase() || 'text',
        isFromCustomer: message.isFromCustomer,
        status: 'delivered',
        conversationId: message.conversationId,
        fileUrl: message.fileUrl || (message.type?.toLowerCase() === 'image' ? message.content : undefined),
        fileName: message.fileName,
        fileSize: message.fileSize,
        voiceDuration: message.voiceDuration
      };

      console.log('🔄 [NEW-MESSAGE] Formatted message:', formattedMessage);
      addMessage(formattedMessage);
    };

    // تحديث حالة الرسالة
    const handleMessageDelivered = (data: any) => {
      updateMessageStatus(data.messageId, 'delivered');
    };

    const handleMessageRead = (data: any) => {
      updateMessageStatus(data.messageId, 'read');
    };

    // حالة الكتابة
    const handleUserTyping = (data: any) => {
      setTypingUsers(prev => {
        const existing = prev.find(user =>
          user.userId === data.userId && user.conversationId === data.conversationId
        );

        if (existing) return prev;

        return [...prev, {
          userId: data.userId,
          userName: data.userName,
          conversationId: data.conversationId,
          timestamp: safeDate(new Date())
        }];
      });
    };

    const handleUserStoppedTyping = (data: any) => {
      setTypingUsers(prev => prev.filter(user =>
        !(user.userId === data.userId && user.conversationId === data.conversationId)
      ));
    };

    // حالة الاتصال
    const handleUserOnline = (data: any) => {
      setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
    };

    const handleUserOffline = (data: any) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    };

    // تسجيل المستمعين
    on('new_message', handleNewMessage);
    on('message_delivered', handleMessageDelivered);
    on('message_read', handleMessageRead);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);
    on('user_online', handleUserOnline);
    on('user_offline', handleUserOffline);

    return () => {
      off('new_message', handleNewMessage);
      off('message_delivered', handleMessageDelivered);
      off('message_read', handleMessageRead);
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
      off('user_online', handleUserOnline);
      off('user_offline', handleUserOffline);
    };
  }, [socket, isConnected, on, off, addMessage, updateMessageStatus]);

  // تنظيف مستخدمي الكتابة القدامى
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTypingUsers(prev => prev.filter(user =>
        now.getTime() - user.timestamp.getTime() < 5000 // 5 ثوان
      ));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    conversations,
    selectedConversation,
    typingUsers,
    onlineUsers,
    isConnected,
    isReconnecting,
    connectionError,
    selectConversation,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    loadConversations,
    loadMessages
  };
};

export default useRealTimeMessaging;
