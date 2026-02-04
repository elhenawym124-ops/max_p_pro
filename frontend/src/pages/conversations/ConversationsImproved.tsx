import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';


// Import new hooks and components
import useLoadingWithRetry from '../../hooks/useLoadingWithRetry';
import useSmartScroll from '../../hooks/useSmartScroll';
import useRealTimeMessaging from '../../hooks/useRealTimeMessaging';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ErrorDisplay from '../../components/common/ErrorDisplay';
import {
  ConversationSkeleton,
  MessagesSkeleton,
  RetryIndicator,
  SendingIndicator,
  InitialLoading,
  EmptyState
} from '../../components/common/LoadingStates';
import {
  ScrollToBottomButton,
  NewMessageAlert,
  MessagesContainer,
  TypingIndicator,
  ConnectionStatus
} from '../../components/common/ScrollComponents';

// استيراد التحسينات الإضافية
import '../../styles/conversations-improved.css';

// استيراد خدمة التحكم في الذكاء الاصطناعي
import { useConversationAI } from '../../services/conversationAIService';
import { getImageUrl } from '../../utils/urlConverter';

const ConversationsImproved: React.FC = () => {
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [togglingAI, setTogglingAI] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // استخدام الـ hooks الجديدة
  const {
    loading,
    error,
    retryCount,
    executeWithRetry,
    retry,
    clearError,
    isError
  } = useLoadingWithRetry();

  const {
    conversations,
    selectedConversation,
    typingUsers,
    isConnected,
    isReconnecting,
    selectConversation,
    sendMessage,
    startTyping,
    loadConversations
  } = useRealTimeMessaging();

  const {
    messagesEndRef,
    messagesContainerRef,
    showScrollButton,
    showNewMessageAlert,
    unreadCount,
    scrollToBottom,
    handleScroll,
    markAsRead: markScrollAsRead
  } = useSmartScroll();

  // خدمة التحكم في الذكاء الاصطناعي
  const { toggleAI, getAIStatus } = useConversationAI();

  // خدمة رفع الملفات
  const uploadService = require('../../services/uploadService').default;

  // دالة تشغيل الصوت للرسائل الجديدة
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      try {
        // استخدام Web Audio API لإنشاء صوت بسيط
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }
  }, [soundEnabled]);

  // تحميل المحادثات عند بدء التشغيل
  useEffect(() => {
    executeWithRetry(
      () => loadConversations(),
      'conversations'
    );
  }, [executeWithRetry, loadConversations]);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K للبحث
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="البحث"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape لإلغاء البحث
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // معالجة إرسال الرسالة
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await executeWithRetry(
        () => sendMessage(selectedConversation.id, messageContent),
        'sending'
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // معالجة الكتابة
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (selectedConversation) {
      startTyping(selectedConversation.id);
    }
  };

  // معالجة رفع الملفات
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedConversation) return;

    // التحقق من نوع الملفات
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('يُسمح برفع الصور فقط');
        return;
      }

      // التحقق من حجم الملف (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 10MB');
        return;
      }
    }

    setUploadingFile(true);

    try {
      // رفع الملفات
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch(`https://www.maxp-ai.pro/api/v1/conversations/${selectedConversation.id}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // معالجة كل ملف مرفوع
        for (let i = 0; i < data.data.length; i++) {
          const uploadedFile = data.data[i];

          // إرسال رسالة الصورة
          const imageMessage = {
            content: uploadedFile.originalName,
            conversationId: selectedConversation.id,
            type: 'image' as const,
            isFromCustomer: false,
            status: 'sending' as const,
            fileUrl: uploadedFile.fullUrl,
            fileName: uploadedFile.originalName,
            fileSize: uploadedFile.size
          };

          // إضافة الرسالة محلياً
          const newMsg = {
            id: Date.now().toString() + i, // إضافة معرف فريد
            ...imageMessage,
            senderId: 'current-user',
            senderName: 'أنت',
            timestamp: new Date(),
            status: 'sent' as const
          };

          // تحديث المحادثة محلياً
          const updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, newMsg],
            lastMessage: `📷 ${uploadedFile.originalName}`,
            lastMessageTime: new Date()
          };

          // إرسال عبر Socket.IO (سيتم إرسالها للعميل على الفيسبوك)
          emit('send_message', {
            conversationId: selectedConversation.id,
            content: uploadedFile.fullUrl,
            type: 'image',
            fileUrl: uploadedFile.fullUrl,
            fileName: uploadedFile.originalName,
            fileSize: uploadedFile.size
          });
        }

        console.log(`✅ تم رفع وإرسال ${files.length} صورة بنجاح`);
      } else {
        alert(data.error || 'فشل في رفع الصور');
      }
    } catch (error) {
      console.error('❌ خطأ في رفع الصور:', error);
      alert('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploadingFile(false);
      // مسح input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // معالجة اختيار المحادثة مع تحسين الأداء
  const handleSelectConversation = useCallback((conversationId: string) => {
    selectConversation(conversationId);
    markScrollAsRead();
  }, [selectConversation, markScrollAsRead]);

  // معالجة حذف المحادثة
  const handleDeleteConversation = async (conversationId: string, customerName: string) => {
    // تأكيد الحذف
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف محادثة "${customerName}"؟\n\nسيتم حذف جميع الرسائل المرتبطة بهذه المحادثة نهائياً.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingConversation(conversationId);

      const response = await fetch(`https://www.maxp-ai.pro/api/v1/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // إعادة تحميل المحادثات
        await loadConversations();

        // إذا كانت المحادثة المحذوفة هي المحادثة المختارة، قم بإلغاء الاختيار
        if (selectedConversation?.id === conversationId) {
          selectConversation('');
        }

        console.log('✅ تم حذف المحادثة بنجاح');
      } else {
        throw new Error(data.message || 'فشل في حذف المحادثة');
      }
    } catch (error) {
      console.error('❌ خطأ في حذف المحادثة:', error);
      alert('حدث خطأ أثناء حذف المحادثة. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeletingConversation(null);
    }
  };

  // دالة تشغيل/إيقاف الذكاء الاصطناعي للمحادثة
  const handleToggleAI = async (conversationId: string, currentAIStatus: boolean) => {
    console.log('🤖 [HANDLE-TOGGLE-AI] Function called with:', { conversationId, currentAIStatus, togglingAI });

    if (togglingAI) {
      console.log('🤖 [HANDLE-TOGGLE-AI] Already toggling, returning');
      return; // منع التشغيل المتعدد
    }

    setTogglingAI(conversationId);
    try {
      const newAIStatus = !currentAIStatus;
      console.log(`🤖 [HANDLE-TOGGLE-AI] Toggling AI for conversation ${conversationId} from ${currentAIStatus} to ${newAIStatus}`);

      const result = await toggleAI(conversationId, newAIStatus);
      console.log('🤖 [HANDLE-TOGGLE-AI] API result:', result);

      if (result.success) {
        // تحديث المحادثة محلياً
        await loadConversations();

        // إظهار رسالة نجاح
        const statusText = newAIStatus ? 'تم تفعيل' : 'تم إيقاف';
        console.log(`✅ ${statusText} الذكاء الاصطناعي للمحادثة`);

        // يمكن إضافة toast notification هنا
        if (soundEnabled) {
          playNotificationSound();
        }
      } else {
        throw new Error(result.message || 'فشل في تحديث إعدادات الذكاء الاصطناعي');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث الذكاء الاصطناعي:', error);
      alert('حدث خطأ أثناء تحديث إعدادات الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
    } finally {
      setTogglingAI(null);
    }
  };

  // Helper to safely format time
  const formatTime = (date: any) => {
    try {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      return d.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };

  // البحث في الخادم بدلاً من التصفية المحلية
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // دالة البحث في الخادم
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      await loadConversations(); // تحميل جميع المحادثات
      return;
    }

    setIsSearching(true);
    try {
      await loadConversations(query.trim());
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setIsSearching(false);
    }
  }, [loadConversations]);

  // المحادثات المعروضة (إما نتائج البحث أو جميع المحادثات)
  const displayedConversations = searchQuery.trim() ? conversations : conversations;

  // الحصول على مستخدمي الكتابة للمحادثة الحالية
  const currentTypingUsers = typingUsers.filter(user =>
    user.conversationId === selectedConversation?.id
  );

  if (loading.initialLoad) {
    return <InitialLoading message="جاري تحميل المحادثات..." />;
  }

  return (
    <ErrorBoundary>
      <div className="flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-full relative">
        {/* Connection Status */}
        <ConnectionStatus
          isConnected={isConnected}
          isReconnecting={isReconnecting}
        />

        {/* Conversations Sidebar - محسن للموبايل */}
        <div className="w-full md:w-1/3 lg:w-1/4 xl:w-1/3 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
                <h1 className="text-xl font-bold text-white">المحادثات</h1>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors duration-200"
                  title={soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                >
                  {soundEnabled ? (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  )}
                </button>
                <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className="text-white text-sm">
                  {isConnected ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="flex items-center justify-between text-white/80 text-sm mb-4">
              <span>المحادثات: {conversations.length}</span>
              <span>غير مقروءة: {conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)}</span>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                type="text"
                placeholder="البحث في المحادثات (اسم، رقم، محتوى)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // البحث التلقائي بعد توقف الكتابة
                  const timeoutId = setTimeout(() => {
                    handleSearch(e.target.value);
                  }, 500);

                  // إلغاء البحث السابق
                  return () => clearTimeout(timeoutId);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-10 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {isError && (
            <div className="p-4">
              <ErrorDisplay
                error={error!}
                onRetry={retry}
                onDismiss={clearError}
                compact
              />
            </div>
          )}

          {/* Retry Indicator */}
          {loading.retrying && (
            <div className="p-4">
              <RetryIndicator
                retryCount={retryCount}
                maxRetries={3}
                isRetrying={loading.retrying}
              />
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto conversations-scroll">
            {loading.conversations ? (
              <ConversationSkeleton />
            ) : displayedConversations.length === 0 ? (
              <EmptyState
                title={searchQuery.trim() ? "لا توجد نتائج" : "لا توجد محادثات"}
                description={searchQuery.trim() ? `لم يتم العثور على محادثات مطابقة لـ "${searchQuery}"` : "لم يتم العثور على أي محادثات"}
                icon={<ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400" />}
              />
            ) : (
              displayedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-gray-200/50 transition-all duration-200 hover:bg-white/60 ${selectedConversation?.id === conversation.id
                      ? 'bg-white/80 border-r-4 border-r-indigo-500'
                      : ''
                    }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {conversation.customerName.charAt(0)}
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.customerName}
                          {conversation.pageName && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                              {conversation.pageName}
                            </span>
                          )}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage}
                      </p>
                    </div>

                    {/* Conversation Actions */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {conversation.unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id, conversation.customerName);
                        }}
                        disabled={deletingConversation === conversation.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="حذف المحادثة"
                      >
                        {deletingConversation === conversation.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex-shrink-0 bg-white/80 border-b border-gray-200/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedConversation.customerName.charAt(0)}
                      </div>
                      {selectedConversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedConversation.customerName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.isOnline ? 'متصل الآن' : 'غير متصل'}
                        {/* Debug info */}
                        <span className="ml-2 text-xs text-blue-500">
                          AI: {selectedConversation.aiEnabled !== undefined ? (selectedConversation.aiEnabled ? 'ON' : 'OFF') : 'UNDEFINED'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {/* زر التحكم في الذكاء الاصطناعي - مؤقت للاختبار */}
                    <button
                      onClick={() => {
                        console.log('🤖 [AI-BUTTON] Clicked! Conversation:', selectedConversation?.id, 'AI Status:', selectedConversation?.aiEnabled);
                        if (selectedConversation) {
                          handleToggleAI(selectedConversation.id, selectedConversation.aiEnabled ?? true);
                        }
                      }}
                      disabled={!selectedConversation || togglingAI === selectedConversation?.id}
                      className={`p-2 rounded-full transition-all duration-200 ${selectedConversation?.aiEnabled ?? true
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-red-600 bg-red-50 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-300`}
                      title={`${selectedConversation?.aiEnabled ?? true ? 'إيقاف' : 'تفعيل'} الذكاء الاصطناعي`}
                    >
                      {togglingAI === selectedConversation?.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CpuChipIcon className="w-5 h-5" />
                      )}
                    </button>

                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200">
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200">
                      <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200">
                      <InformationCircleIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 relative">
                <MessagesContainer
                  onScroll={handleScroll}
                  containerRef={messagesContainerRef}
                  className="p-4 space-y-4"
                >
                  {loading.messages ? (
                    <MessagesSkeleton />
                  ) : selectedConversation.messages.length === 0 ? (
                    <EmptyState
                      title="لا توجد رسائل"
                      description="ابدأ محادثة جديدة مع هذا العميل"
                      icon={<ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400" />}
                    />
                  ) : (
                    selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className="max-w-xs lg:max-w-md">
                          <div
                            className={`px-4 py-2 rounded-lg ${message.isFromCustomer
                                ? 'bg-gray-200 text-gray-900 rounded-bl-none'
                                : 'bg-indigo-600 text-white rounded-br-none'
                              }`}
                          >
                            {/* عرض المحتوى حسب نوع الرسالة */}
                            {(message.type === 'image' || message.type === 'IMAGE') && (message.fileUrl || (message.content && message.content.startsWith('http'))) ? (
                              <div className="space-y-2">
                                <img
                                  src={getImageUrl(message)}
                                  alt={message.fileName || 'صورة'}
                                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{ maxHeight: '300px', maxWidth: '250px' }}
                                  onClick={() => window.open(getImageUrl(message), '_blank')}
                                  onError={(e) => {
                                    console.error('❌ Failed to load image:', getImageUrl(message));
                                    console.log('🔍 Message debug:', { id: message.id, type: message.type, fileUrl: message.fileUrl, content: message.content });
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
                                    target.alt = 'فشل في تحميل الصورة';
                                  }}
                                />
                                {message.fileName && (
                                  <p className="text-xs text-gray-500 mt-1">{message.fileName}</p>
                                )}
                              </div>
                            ) : message.type === 'file' && message.fileUrl ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                                  <PaperClipIcon className="w-4 h-4 text-gray-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{message.fileName || 'ملف'}</p>
                                    {message.fileSize && (
                                      <p className="text-xs text-gray-500">
                                        {(message.fileSize / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                  <a
                                    href={message.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 text-sm"
                                  >
                                    تحميل
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(message.timestamp)}
                            </span>
                            {!message.isFromCustomer && (
                              <span className="text-xs text-gray-500">
                                {message.status === 'sending' && '⏳'}
                                {message.status === 'sent' && '✓'}
                                {message.status === 'delivered' && '✓✓'}
                                {message.status === 'read' && '✓✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing Indicator */}
                  {currentTypingUsers.map(user => (
                    <TypingIndicator
                      key={user.userId}
                      show={true}
                      userName={user.userName}
                    />
                  ))}

                  <div ref={messagesEndRef} />
                </MessagesContainer>

                {/* Scroll Controls */}
                <ScrollToBottomButton
                  show={showScrollButton}
                  onClick={() => scrollToBottom()}
                  unreadCount={unreadCount}
                />

                <NewMessageAlert
                  show={showNewMessageAlert}
                  count={unreadCount}
                  onClick={() => {
                    scrollToBottom();
                    markScrollAsRead();
                  }}
                />
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 bg-white/80 border-t border-gray-200/50 p-4">
                <SendingIndicator isSending={loading.sending} />

                <form onSubmit={handleSendMessage} className="flex items-center space-x-3 space-x-reverse">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="رفع صورة"
                  >
                    {uploadingFile ? (
                      <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <PaperClipIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                    <FaceSmileIcon className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder="اكتب رسالتك هنا..."
                      className="w-full bg-gray-100 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={loading.sending}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || loading.sending}
                    className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <EmptyState
              title="اختر محادثة"
              description="اختر محادثة من القائمة الجانبية لبدء المراسلة"
              icon={<ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400" />}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ConversationsImproved;
