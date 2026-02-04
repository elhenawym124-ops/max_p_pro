import React, { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  CpuChipIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  QueueListIcon,
  PhotoIcon, // ✅ NEW: للصور
  XCircleIcon // ✅ NEW: لحذف الصور
} from '@heroicons/react/24/outline';
import { testChatService, TestConversation, TestMessage, AITestResponse } from '../../services/testChatService';
import CompanyProtectedRoute from '../../components/protection/CompanyProtectedRoute';
import useSocket from '../../hooks/useSocket';

// إضافة معلومات الرد إلى TestMessage
interface ExtendedTestMessage extends TestMessage {
  aiResponseInfo?: AITestResponse | null;
}

// واجهة للدردشة المفتوحة
interface OpenChat {
  conversation: TestConversation;
  messages: ExtendedTestMessage[];
  newMessage: string;
  sending: boolean;
  isAiTyping: boolean;
  error: string | null;
}

const AITestChatContent: React.FC = () => {
  const [conversations, setConversations] = useState<TestConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<TestConversation | null>(null);
  const [messages, setMessages] = useState<ExtendedTestMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // ✅ NEW: الصور المختارة
  const fileInputRef = useRef<HTMLInputElement>(null); // ✅ NEW: مرجع لـ input الملفات
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<TestConversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null); // ✅ Restored
  const [runningTest, setRunningTest] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('test-chat'); // ✅ NEW
  const [simulatedPostId, setSimulatedPostId] = useState<string>(''); // ✅ NEW
  const [simulatedAdId, setSimulatedAdId] = useState<string>(''); // ✅ NEW

  // ✅ NEW: حالة الدردشات المتعددة
  const [openChats, setOpenChats] = useState<Map<string, OpenChat>>(new Map());
  const [multiChatMode, setMultiChatMode] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [selectedMessageForDetails, setSelectedMessageForDetails] = useState<ExtendedTestMessage | null>(null); // ✅ NEW: لتفاصيل الرسالة في العمود الجانبي
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]); // ✅ NEW: للاقتراحات
  const [lastExtractedDetails, setLastExtractedDetails] = useState<any>(null); // ✅ NEW: للبيانات المستخرجة
  const [replyingTo, setReplyingTo] = useState<ExtendedTestMessage | null>(null); // ✅ NEW: للرد على رسالة

  const { socket, isConnected } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ✅ Socket.IO Integration for Real-time Updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle new message
    const handleNewMessage = (data: any) => {
      console.log('📨 [SOCKET] New message received:', data);

      // Update conversations list (last message)
      setConversations(prev => prev.map(conv => {
        if (conv.id === data.conversationId) {
          return {
            ...conv,
            lastMessage: data.content || conv.lastMessage,
            lastMessageTime: new Date()
          };
        }
        return conv;
      }));

      // Map socket data to ExtendedTestMessage
      const newMessage: ExtendedTestMessage = {
        id: data.id,
        content: data.content,
        senderId: data.senderId,
        senderName: data.senderName, // Might need adjustment based on payload
        createdAt: new Date(data.createdAt),
        type: data.type || 'text',
        isFromCustomer: data.isFromCustomer,
        status: 'sent',
        conversationId: data.conversationId,
        aiResponseInfo: data.metadata?.aiResponseInfo || (data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined),
        // ✅ FIX: Map socket 'images' to 'attachments'
        attachments: data.images
          ? data.images.map((imgUrl: string) => ({
            type: 'image',
            url: imgUrl,
            filename: 'product-image.jpg'
          }))
          : undefined
      };

      // 1. Update Selected Conversation
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;

          // Remove temp message if it matches (by content/type/time approx?)
          // Usually we rely on API response to replace temp, but socket might arrive too.
          // For now just append.
          return [...prev, newMessage];
        });

        // Stop typing indicator
        if (!newMessage.isFromCustomer) {
          setIsAiTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }

        // Scroll
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

      // 2. Update Open Chats (Multi-mode)
      if (openChats.has(data.conversationId)) {
        setOpenChats(prev => {
          const newMap = new Map(prev);
          const chat = newMap.get(data.conversationId);
          if (chat) {
            // Avoid duplicates check
            if (chat.messages.some(m => m.id === newMessage.id)) return prev;

            newMap.set(data.conversationId, {
              ...chat,
              messages: [...chat.messages, newMessage],
              isAiTyping: !newMessage.isFromCustomer ? false : chat.isAiTyping
            });
          }
          return newMap;
        });
      }
    };

    // Handle typing status
    const handleTyping = (data: { conversationId: string, isTyping: boolean }) => {
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setIsAiTyping(data.isTyping);

        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsAiTyping(false), 15000);
        }
      }

      if (openChats.has(data.conversationId)) {
        setOpenChats(prev => {
          const newMap = new Map(prev);
          const chat = newMap.get(data.conversationId);
          if (chat) {
            newMap.set(data.conversationId, { ...chat, isAiTyping: data.isTyping });
          }
          return newMap;
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('ai_typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('ai_typing', handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, isConnected, selectedConversation, openChats]);

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading test conversations...');
      const result = await testChatService.getConversations();
      console.log('✅ Test conversations loaded:', result.data.length);
      setConversations(result.data);
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      setError(error.message || 'فشل في تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل
  const loadMessages = async (conversationId: string) => {
    try {
      console.log('🔄 Loading messages for conversation:', conversationId);
      const messagesData = await testChatService.getMessages(conversationId);
      console.log('✅ Messages loaded:', messagesData.length);
      console.log('🔍 [FRONTEND] Messages with aiResponseInfo:', messagesData.filter(msg => msg.aiResponseInfo));
      setMessages(messagesData.map(msg => {
        const mappedMsg = {
          ...msg,
          createdAt: new Date(msg.createdAt)
        };
        if (msg.aiResponseInfo) {
          console.log('✅ [FRONTEND] Message has aiResponseInfo:', msg.id, msg.aiResponseInfo);
        }
        return mappedMsg;
      }));

      // التمرير للأسفل
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // ✅ NEW: معالجة اختيار الصور
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles].slice(0, 5)); // حد أقصى 5 صور
    }
  };

  // ✅ NEW: حذف صورة
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // إرسال رسالة
  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedImages.length === 0) || !selectedConversation || sending) return;

    const images = [...selectedImages];
    const replyToId = replyingTo?.id; // ✅ NEW: حفظ معرف الرسالة المردود عليها

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSelectedImages([]); // ✅ مسح الصور بعد الإرسال
    setReplyingTo(null); // ✅ إخفاء شريط الرد
    setSmartSuggestions([]); // ✅ مسح الاقتراحات
    setSending(true);
    setIsAiTyping(true);

    // إضافة رسالة المستخدم مؤقتاً
    const tempUserMessage: ExtendedTestMessage = {
      id: `temp_user_${Date.now()}`,
      content: messageContent,
      senderId: 'user',
      senderName: 'أنت',
      createdAt: new Date(),
      type: 'text',
      isFromCustomer: true,
      status: 'sending',
      conversationId: selectedConversation.id,
      metadata: replyToId ? { replyToMessageId: replyToId } : undefined // ✅ NEW
    };

    setMessages(prev => [...prev, tempUserMessage]);

    // التمرير للأسفل
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      console.log('📤 Sending message to test chat:', messageContent);
      console.log('📸 Images:', images.length);

      // ✅ إرسال مع الصور
      const result = await testChatService.sendMessage(
        selectedConversation.id,
        messageContent,
        images, // ✅ تمرير الصور
        { // ✅ NEW: الميتا داتا الإضافية
          platform: selectedPlatform,
          ...(simulatedPostId ? { postId: simulatedPostId } : {}),
          ...(simulatedAdId ? { adId: simulatedAdId } : {}),
          replyToMessageId: replyToId // ✅ NEW: تمرير معرف الرد
        }
      );
      console.log('✅ Message sent, full result:', JSON.stringify(result, null, 2));
      console.log('🔍 aiMessage:', result.aiMessage);
      console.log('🔍 aiResponse:', result.aiResponse);

      // تحديث رسالة المستخدم
      setMessages(prev => prev.map(msg =>
        msg.id === tempUserMessage.id
          ? { ...result.userMessage, createdAt: new Date(result.userMessage.createdAt) }
          : msg
      ));

      // إضافة رد AI إذا كان موجوداً
      console.log('🔍 Checking aiMessage:', result.aiMessage, 'aiResponse:', result.aiResponse);

      if (result.aiMessage && result.aiMessage.content) {
        // ✅ FIX: استخدام aiResponseInfo من aiMessage أولاً، ثم من aiResponse
        const aiMessageWithInfo: ExtendedTestMessage = {
          id: result.aiMessage.id,
          content: result.aiMessage.content,
          senderId: 'ai',
          senderName: 'AI',
          createdAt: new Date(result.aiMessage.createdAt),
          type: 'text',
          isFromCustomer: false,
          status: 'sent',
          conversationId: selectedConversation.id,
          isAiGenerated: true,
          aiResponseInfo: result.aiMessage.aiResponseInfo || result.aiResponse || null,
          // ✅ FIX: Map backend 'images' (string[]) to frontend 'attachments' structure
          attachments: result.aiMessage.images
            ? result.aiMessage.images.map((imgUrl: string) => ({
              type: 'image',
              url: imgUrl,
              filename: 'product-image.jpg'
            }))
            : undefined
        };
        console.log('✅ [FRONTEND] Adding AI message:', aiMessageWithInfo);

        // ✅ FIX: استخدام functional update مع spread جديد لضمان re-render + منع التكرار
        setMessages(currentMessages => {
          // Check for duplicates
          if (currentMessages.some(m => m.id === aiMessageWithInfo.id)) {
            console.log('⚠️ [FRONTEND] Duplicate message detected in sendMessage, skipping add:', aiMessageWithInfo.id);
            return currentMessages;
          }
          const updatedMessages = [...currentMessages, aiMessageWithInfo];
          console.log('📝 New messages count:', updatedMessages.length);
          return updatedMessages;
        });

        // تحديث آخر رسالة في المحادثة
        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
              ...conv,
              lastMessage: result.aiMessage?.content || messageContent,
              lastMessageTime: new Date()
            }
            : conv
        ));
      } else {
        // ✅ عرض معلومات النظام الصامت أو الخطأ (دائماً إذا لم يكن هناك aiMessage)
        const silentReason = result.aiResponse?.silentReason || result.aiResponse?.error || 'لم يتم توليد رد من الذكاء الصناعي';
        const silentMessage: ExtendedTestMessage = {
          id: `silent_${Date.now()}`,
          content: `🤐 النظام صامت\n\n📋 السبب: ${silentReason}${result.aiResponse?.model ? `\n🤖 النموذج: ${result.aiResponse.model}` : ''}${result.aiResponse?.processingTime ? `\n⏱️ الوقت: ${result.aiResponse.processingTime}ms` : ''}`,
          senderId: 'system',
          senderName: 'النظام',
          createdAt: new Date(),
          type: 'text',
          isFromCustomer: false,
          status: 'sent',
          conversationId: selectedConversation.id,
          aiResponseInfo: result.aiResponse || null
        };
        console.log('🤐 [FRONTEND] Adding silent message:', silentMessage);
        setMessages(prev => {
          const newMessages = [...prev, silentMessage];
          console.log('📝 New messages count (silent):', newMessages.length);
          return newMessages;
        });
      }

      // ✅ NEW: تحديث الاقتراحات والبيانات المستخرجة
      if (result.suggestions) setSmartSuggestions(result.suggestions);
      if (result.extractedDetails) setLastExtractedDetails(result.extractedDetails);

      // ✅ FIX: إيقاف حالة الإرسال والكتابة هنا بدلاً من finally
      setTimeout(() => {
        setSending(false);
        setIsAiTyping(false);
      }, 100);

      // التمرير للأسفل بعد إضافة الرد
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);

    } catch (error: any) {
      console.error('❌ Error sending message:', error);

      // تحديث حالة الرسالة إلى خطأ
      setMessages(prev => prev.map(msg =>
        msg.id === tempUserMessage.id
          ? { ...msg, status: 'error' }
          : msg
      ));

      alert(`❌ فشل في إرسال الرسالة:\n\n${error.message}`);
      setNewMessage(messageContent);

      // إيقاف حالة الإرسال في حالة الخطأ
      setSending(false);
      setIsAiTyping(false);
    }
  };

  // ✅ NEW: محاكاة الضغط على الأزرار (Postback)
  const handlePostback = async (payload: string, title?: string) => {
    if (!payload || !selectedConversation || sending) return;

    // محاكاة إرسال الـ payload كرسالة من العميل
    const messageContent = title || payload;
    setNewMessage(messageContent);

    // يمكننا تحسين هذا لاحقاً لإرسال الـ payload الحقيقي في الـ metadata
    setTimeout(() => {
      const sendBtn = document.querySelector('button[title="إرسال"]') as HTMLButtonElement;
      if (sendBtn) sendBtn.click();
    }, 100);
  };

  // ✅ NEW: رندر العناصر التفاعلية (أزرار/ردود سريعة)
  const renderInteractiveElements = (message: ExtendedTestMessage) => {
    const aiInfo = message.aiResponseInfo;
    if (!aiInfo || message.isFromCustomer) return null;

    // استخراج الأزرار والردود السريعة من الميتا داتا
    const buttons = aiInfo.metadata?.buttons || (aiInfo as any).buttons;
    const quickReplies = aiInfo.metadata?.quick_replies || (aiInfo as any).quickReplies;

    if (!buttons && !quickReplies) return null;

    return (
      <div className="mt-3 space-y-2">
        {/* رندر الأزرار (مثل فيسبوك/واتساب) */}
        {buttons && Array.isArray(buttons) && buttons.map((btn: any, idx: number) => (
          <button
            key={idx}
            onClick={() => handlePostback(btn.payload || btn.url || btn.title, btn.title)}
            className="w-full py-2 px-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-500 dark:border-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
          >
            {btn.title}
            {btn.url && <span className="mr-1 opacity-50 text-[10px]">🔗</span>}
          </button>
        ))}

        {/* رندر الردود السريعة (Quick Replies) */}
        {quickReplies && Array.isArray(quickReplies) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quickReplies.map((qr: any, idx: number) => (
              <button
                key={idx}
                onClick={() => handlePostback(qr.payload || qr.title, qr.title)}
                className="py-1.5 px-4 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-700"
              >
                {qr.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ✅ NEW: رندر المرفقات (الصور)
  const renderAttachments = (message: ExtendedTestMessage) => {
    // محاولة استخراج المرفقات من الحقل المباشر أو من الميتا داتا
    let attachments = message.attachments;

    if (!attachments && message.metadata) {
      try {
        const metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata;
        // Handle 'attachments', legacy 'images' (array of strings or objects), or 'aiResponseInfo.images'
        attachments = metadata.attachments || metadata.images || (message.aiResponseInfo as any)?.images;

        // Ensure format consistency (convert string URLs to attachment objects)
        if (attachments && Array.isArray(attachments)) {
          attachments = attachments.map(att =>
            typeof att === 'string' ? { type: 'image', url: att } : att
          );
        }
      } catch (e) {
        console.error('Error parsing metadata for attachments:', e);
      }
    }

    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return null;

    return (
      <div className={`grid gap-2 mt-2 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {attachments.map((att, idx) => (
          <div key={idx} className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/20 shadow-sm">
            {att.type === 'image' && (
              <img
                src={att.url.startsWith('/') ? att.url : att.url}
                alt={att.filename || 'Attachment'}
                className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform"
                onClick={() => window.open(att.url, '_blank')}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ✅ NEW: رندر لوحة البيانات المستخرجة
  const renderExtractionDashboard = () => {
    if (!lastExtractedDetails) return null;

    const fields = [
      { key: 'customerName', label: 'الاسم الكامل', icon: UserIcon },
      { key: 'customerPhone', label: 'رقم الهاتف', icon: SparklesIcon },
      { key: 'customerAddress', label: 'العنوان التفصيلي', icon: QueueListIcon },
      { key: 'city', label: 'المحافظة/المدينة', icon: Squares2X2Icon },
      { key: 'productName', label: 'المنتج', icon: PhotoIcon },
      { key: 'productSize', label: 'المقاس', icon: CpuChipIcon },
      { key: 'productColor', label: 'اللون', icon: SparklesIcon },
    ];

    return (
      <div className="space-y-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">فهم الـ AI للطلب</h5>
          <span className="text-[10px] text-green-500 font-bold">تحديث حي</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {fields.map((field) => {
            const val = lastExtractedDetails[field.key];
            const isExist = val && val !== 'غير معروف' && val !== 'Unknown';
            return (
              <div key={field.key} className="flex items-center justify-between text-[11px] group">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <field.icon className="w-3 h-3" />
                  <span>{field.label}:</span>
                </div>
                <div className={`font-medium ${isExist ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600 italic'}`}>
                  {isExist ? val : 'مفقود'}
                </div>
              </div>
            );
          })}
        </div>
        {lastExtractedDetails.isComplete && (
          <div className="mt-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-center">
            <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">✅ جاهز لإنشاء الطلب</span>
          </div>
        )}
      </div>
    );
  };

  // ✅ NEW: رندر اقتراحات الرد الذكية
  const renderSmartSuggestions = () => {
    if (!smartSuggestions || smartSuggestions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-3 px-1">
        {smartSuggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => setNewMessage(suggestion)}
            className="text-[11px] px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors shadow-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  // اختيار محادثة
  const selectConversation = async (conversation: TestConversation) => {
    console.log('🎯 Selecting conversation:', conversation.id);
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  // ✅ NEW: فتح دردشة جديدة في نافذة منفصلة
  const openChatInNewWindow = async (conversation: TestConversation) => {
    const messagesData = await testChatService.getMessages(conversation.id);
    const chatData: OpenChat = {
      conversation,
      messages: messagesData.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt)
      })),
      newMessage: '',
      sending: false,
      isAiTyping: false,
      error: null
    };

    setOpenChats(prev => {
      const newMap = new Map(prev);
      newMap.set(conversation.id, chatData);
      return newMap;
    });

    if (!multiChatMode) {
      setMultiChatMode(true);
    }
  };

  // ✅ NEW: إغلاق دردشة من النوافذ المتعددة
  const closeChatWindow = (conversationId: string) => {
    setOpenChats(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });

    // إذا لم يعد هناك دردشات مفتوحة، إيقاف وضع الدردشات المتعددة
    if (openChats.size === 1) {
      setMultiChatMode(false);
    }
  };

  // ✅ NEW: إرسال رسالة لدردشة محددة في وضع الدردشات المتعددة
  const sendMessageToChat = async (conversationId: string, messageContent: string) => {
    const chat = openChats.get(conversationId);
    if (!chat || !messageContent.trim()) return;

    // تحديث حالة الإرسال
    setOpenChats(prev => {
      const newMap = new Map(prev);
      const updatedChat = { ...chat, sending: true, isAiTyping: true, newMessage: '' };
      newMap.set(conversationId, updatedChat);
      return newMap;
    });

    // إضافة رسالة المستخدم مؤقتاً
    const tempUserMessage: ExtendedTestMessage = {
      id: `temp_user_${Date.now()}_${conversationId}`,
      content: messageContent,
      senderId: 'user',
      senderName: 'أنت',
      createdAt: new Date(),
      type: 'text',
      isFromCustomer: true,
      status: 'sending',
      conversationId
    };

    setOpenChats(prev => {
      const newMap = new Map(prev);
      const chat = newMap.get(conversationId);
      if (chat) {
        newMap.set(conversationId, {
          ...chat,
          messages: [...chat.messages, tempUserMessage]
        });
      }
      return newMap;
    });

    try {
      const result = await testChatService.sendMessage(conversationId, messageContent, [], {
        platform: selectedPlatform,
        ...(simulatedPostId ? { postId: simulatedPostId } : {}),
        ...(simulatedAdId ? { adId: simulatedAdId } : {})
      });

      // تحديث رسالة المستخدم
      setOpenChats(prev => {
        const newMap = new Map(prev);
        const chat = newMap.get(conversationId);
        if (chat) {
          const updatedMessages = chat.messages.map(msg =>
            msg.id === tempUserMessage.id
              ? { ...result.userMessage, createdAt: new Date(result.userMessage.createdAt) }
              : msg
          );

          // إضافة رد AI إذا كان موجوداً
          if (result.aiMessage) {
            const aiMessageWithInfo: ExtendedTestMessage = {
              ...result.aiMessage,
              createdAt: new Date(result.aiMessage.createdAt),
              aiResponseInfo: result.aiResponse || null
            };
            updatedMessages.push(aiMessageWithInfo);
          } else if (result.aiResponse) {
            // ✅ عرض معلومات النظام الصامت أو الخطأ
            const silentReason = result.aiResponse.silentReason || result.aiResponse.error || 'لم يتم توليد رد';
            const silentMessage: ExtendedTestMessage = {
              id: `silent_${Date.now()}_${conversationId}`,
              content: `🤐 النظام صامت\n📋 السبب: ${silentReason}`,
              senderId: 'system',
              senderName: 'النظام',
              createdAt: new Date(),
              type: 'text',
              isFromCustomer: false,
              status: 'sent',
              conversationId,
              aiResponseInfo: result.aiResponse || null
            };
            updatedMessages.push(silentMessage);
          }

          newMap.set(conversationId, {
            ...chat,
            messages: updatedMessages,
            sending: false,
            isAiTyping: false
          });
        }
        return newMap;
      });

      // تحديث آخر رسالة في قائمة المحادثات
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? {
            ...conv,
            lastMessage: result.aiMessage?.content || messageContent,
            lastMessageTime: new Date()
          }
          : conv
      ));
    } catch (error: any) {
      console.error('❌ Error sending message to chat:', error);

      setOpenChats(prev => {
        const newMap = new Map(prev);
        const chat = newMap.get(conversationId);
        if (chat) {
          const updatedMessages = chat.messages.map(msg =>
            msg.id === tempUserMessage.id
              ? { ...msg, status: 'error' as const }
              : msg
          );
          newMap.set(conversationId, {
            ...chat,
            messages: updatedMessages,
            sending: false,
            isAiTyping: false,
            error: error.message,
            newMessage: messageContent
          });
        }
        return newMap;
      });
    }
  };

  // ✅ NEW: إرسال رسالة لجميع الدردشات المفتوحة
  const sendMessageToAllChats = async (messageContent: string) => {
    if (!messageContent.trim() || openChats.size === 0 || sendingToAll) return;

    setSendingToAll(true);
    const promises = Array.from(openChats.keys()).map(conversationId =>
      sendMessageToChat(conversationId, messageContent)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('❌ Error sending messages to all chats:', error);
    } finally {
      setSendingToAll(false);
    }
  };

  // إنشاء محادثة جديدة
  const createNewConversation = async () => {
    try {
      console.log('➕ Creating new test conversation...');
      const newConv = await testChatService.createConversation();
      console.log('✅ New conversation created:', newConv.id);
      await loadConversations();
      await selectConversation(newConv);
    } catch (error: any) {
      console.error('❌ Error creating conversation:', error);
      alert(`❌ فشل في إنشاء محادثة جديدة:\n\n${error.message}`);
    }
  };

  // إنشاء مجموعة محادثات (Bulk Create)
  const handleBulkCreate = async () => {
    const countStr = window.prompt('كم عدد المحادثات التي تريد إنشاءها؟ (الحد الأقصى 20)', '5');
    if (!countStr) return;

    const count = parseInt(countStr);
    if (isNaN(count) || count < 1 || count > 20) {
      alert('الرجاء إدخال رقم صحيح بين 1 و 20');
      return;
    }

    try {
      console.log(`➕ Creating ${count} new conversations...`);
      setLoading(true);
      const result = await testChatService.createBulkConversations(count);
      console.log('✅ Bulk creation result:', result);
      alert(`✅ تم إنشاء ${result.count} محادثة بنجاح`);
      await loadConversations();

      // Select the first new conversation if available
      const updatedConversations = await testChatService.getConversations();
      if (updatedConversations.data && updatedConversations.data.length > 0) {
        setConversations(updatedConversations.data);
      }
    } catch (error: any) {
      console.error('❌ Error creating bulk conversations:', error);
      alert(`❌ فشل في إنشاء المحادثات:\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // فتح modal الحذف
  const openDeleteModal = (conversation: TestConversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  // إغلاق modal الحذف
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  // حذف محادثة
  const deleteConversation = async () => {
    if (!conversationToDelete) return;

    setDeleting(true);
    try {
      await testChatService.deleteConversation(conversationToDelete.id);
      console.log('✅ Conversation deleted:', conversationToDelete.id);

      // إزالة المحادثة من القائمة
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id));

      // إذا كانت المحادثة المحذوفة هي المختارة، اختر الأولى أو امسح الاختيار
      if (selectedConversation?.id === conversationToDelete.id) {
        if (conversations.length > 1) {
          const remaining = conversations.filter(conv => conv.id !== conversationToDelete.id);
          if (remaining.length > 0) {
            await selectConversation(remaining[0]);
          } else {
            setSelectedConversation(null);
            setMessages([]);
          }
        } else {
          setSelectedConversation(null);
          setMessages([]);
        }
      }

      closeDeleteModal();
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error);
      alert(`❌ فشل في حذف المحادثة:\n\n${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // تشغيل تحليل شامل
  const runAnalysisAndFix = async () => {
    try {
      setRunningTest(true);
      setError(null);

      console.log('🔍 بدء تحليل شامل...');

      // تشغيل التحليل
      const analysisData = await testChatService.analyzeAndFix();

      console.log('✅ تم إكمال التحليل:', analysisData);
      setTestResults(analysisData);

      // تحميل المحادثات
      await loadConversations();

      // فتح المحادثة
      if (analysisData.conversationId) {
        const conversations = await testChatService.getConversations();
        const conversation = conversations.data.find(
          conv => conv.id === analysisData.conversationId
        );

        if (conversation) {
          await selectConversation(conversation);
          await loadMessages(analysisData.conversationId);
        }
      }

      // عرض النتائج
      const summary = analysisData.summary;
      const problemsCount = analysisData.problems.length;
      const fixesCount = analysisData.fixes.length;

      alert(`✅ تم إكمال التحليل الشامل!\n\n` +
        `📊 النتائج:\n` +
        `   إجمالي الأسئلة: ${analysisData.totalQuestions}\n` +
        `   تم التحليل: ${analysisData.analyzed}\n` +
        `   المشاكل المكتشفة: ${problemsCount}\n` +
        `   الحلول المقترحة: ${fixesCount}\n\n` +
        `📈 الإحصائيات:\n` +
        `   نسبة النجاح: ${summary.successRate}%\n` +
        `   نسبة المشاكل: ${summary.problemRate}%\n\n` +
        `💡 التحسينات: ${analysisData.improvements.length}`);

    } catch (error: any) {
      console.error('❌ خطأ في التحليل:', error);
      setError(error.message || 'فشل في التحليل');
      alert(`❌ فشل في التحليل:\n\n${error.message}`);
    } finally {
      setRunningTest(false);
    }
  };

  // تشغيل اختبار سريع
  const runQuickTest = async () => {
    try {
      setRunningTest(true);
      setError(null);

      console.log('🚀 بدء اختبار سريع...');

      // تشغيل الاختبار (الـ API سينشئ المحادثة تلقائياً)
      const testData = await testChatService.runQuickTest({
        questionCount: 8
      });

      console.log('✅ تم إكمال الاختبار:', testData);
      setTestResults(testData);

      // تحميل المحادثات لتحديث القائمة
      await loadConversations();

      // البحث عن المحادثة الجديدة وفتحها
      const conversations = await testChatService.getConversations();
      const newConversation = conversations.data.find(
        conv => conv.id === testData.conversationId
      );

      if (newConversation) {
        await selectConversation(newConversation);
        await loadMessages(testData.conversationId);
      }

      // عرض النتائج
      const results = testData.results;
      const quality = testData.qualityCheck;
      const successRate = ((results.succeeded / results.totalQuestions) * 100).toFixed(1);
      const qualityRate = quality.withResponse > 0
        ? ((quality.appropriate / quality.withResponse) * 100).toFixed(1)
        : '0';

      alert(`✅ تم إكمال الاختبار!\n\n` +
        `📊 النتائج:\n` +
        `   إجمالي الأسئلة: ${results.totalQuestions}\n` +
        `   ✅ نجح: ${results.succeeded}\n` +
        `   ❌ فشل: ${results.failed}\n` +
        `   🤐 صامت: ${results.silent}\n` +
        `   📈 نسبة النجاح: ${successRate}%\n\n` +
        `🎯 الجودة:\n` +
        `   ✅ ردود مناسبة: ${quality.appropriate}\n` +
        `   ⚠️  ردود غير مناسبة: ${quality.inappropriate}\n` +
        `   📊 نسبة الجودة: ${qualityRate}%\n` +
        `   ⏱️  متوسط وقت المعالجة: ${quality.averageProcessingTime}ms`);

    } catch (error: any) {
      console.error('❌ خطأ في تشغيل الاختبار:', error);
      setError(error.message || 'فشل في تشغيل الاختبار');
      alert(`❌ فشل في تشغيل الاختبار:\n\n${error.message}`);
    } finally {
      setRunningTest(false);
    }
  };

  // تحميل المحادثات عند بدء التطبيق
  useEffect(() => {
    loadConversations();
  }, []);

  // فلترة المحادثات
  const filteredConversations: TestConversation[] = conversations.filter(conv =>
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // تنسيق الوقت
  const formatTime = (date: Date | string) => {
    // تحويل string إلى Date إذا لزم الأمر
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // التحقق من صحة التاريخ
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '--:--';
    }

    return dateObj.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // تنسيق التاريخ
  const formatDate = (date: Date | string) => {
    // تحويل string إلى Date إذا لزم الأمر
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // التحقق من صحة التاريخ
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '--';
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return dateObj.toLocaleDateString('ar-SA');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل محادثات الاختبار...</p>
        </div>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-xl mb-4">❌</div>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadConversations}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden" dir="auto">
      {/* 1️⃣ العمود الأول: قائمة المحادثات (Start Sidebar) */}
      <div className="w-80 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-sm z-10">
        {/* رأس قائمة المحادثات */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              اختبار الرد
            </h2>
          </div>

          {/* شريط البحث */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* قائمة المحادثات */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد محادثات'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  if (multiChatMode) {
                    openChatInNewWindow(conversation);
                  } else {
                    selectConversation(conversation);
                  }
                }}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20 border-s-4 border-s-blue-500 dark:border-s-blue-400' : ''
                  } ${openChats.has(conversation.id) ? 'bg-orange-50 dark:bg-orange-900/20 border-s-4 border-s-orange-500 dark:border-s-orange-400' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {conversation.customerName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {conversation.customerName}
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                          اختبار
                        </span>
                        {openChats.has(conversation.id) && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                            مفتوحة
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(conversation.lastMessageTime)} • {formatTime(conversation.lastMessageTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {multiChatMode && openChats.has(conversation.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeChatWindow(conversation.id);
                        }}
                        className="p-1 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded transition-colors"
                        title="إغلاق النافذة"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(conversation);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="حذف المحادثة"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {conversation.lastMessage}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* منطقة المحادثة */}
      <div className="flex-1 flex flex-col">
        {multiChatMode && openChats.size > 0 ? (
          /* ✅ NEW: عرض الدردشات المتعددة */
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* رأس الدردشات المتعددة */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Squares2X2Icon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    الدردشات المتعددة ({openChats.size})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {sendingToAll && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span className="text-sm">جاري الإرسال لجميع الدردشات...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* شبكة الدردشات */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className={`grid gap-4 ${openChats.size === 1 ? 'grid-cols-1' : openChats.size === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {Array.from(openChats.values()).map((chat) => (
                  <div key={chat.conversation.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-[600px]">
                    {/* رأس الدردشة */}
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {chat.conversation.customerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{chat.conversation.customerName}</h4>
                          {chat.sending && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">جاري الإرسال...</p>
                          )}
                          {chat.isAiTyping && (
                            <p className="text-xs text-green-600 dark:text-green-400">AI يكتب...</p>
                          )}
                          {chat.error && (
                            <p className="text-xs text-red-600 dark:text-red-400">❌ {chat.error}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => closeChatWindow(chat.conversation.id)}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="إغلاق"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* الرسائل */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {chat.messages.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
                          لا توجد رسائل
                        </div>
                      ) : (
                        chat.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${message.isFromCustomer
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                : message.content.includes('النظام صامت')
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-blue-500 dark:bg-blue-600 text-white'
                                }`}
                            >
                              <p>{message.content}</p>
                              {message.aiResponseInfo && (
                                <div className="mt-1 pt-1 border-t border-white/20 dark:border-gray-600 text-xs opacity-90">
                                  {message.aiResponseInfo.model && (
                                    <div>🤖 {message.aiResponseInfo.model}</div>
                                  )}
                                  {message.aiResponseInfo.keyName && (
                                    <div>🔑 {message.aiResponseInfo.keyName}</div>
                                  )}
                                  {message.aiResponseInfo.processingTime && (
                                    <div>⏱️ {message.aiResponseInfo.processingTime}ms</div>
                                  )}
                                </div>
                              )}
                              {/* ✅ NEW: المرفقات (الصور) */}
                              {renderAttachments(message)}
                              {/* ✅ NEW: العناصر التفاعلية */}
                              {renderInteractiveElements(message)}
                            </div>
                          </div>
                        ))
                      )}
                      {chat.isAiTyping && (
                        <div className="flex justify-end">
                          <div className="bg-green-500 dark:bg-green-600 text-white px-3 py-2 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <CpuChipIcon className="w-4 h-4" />
                              <span>AI يكتب...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* إدخال الرسالة */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center gap-2">
                        <textarea
                          value={chat.newMessage}
                          onChange={(e) => {
                            setOpenChats(prev => {
                              const newMap = new Map(prev);
                              const updatedChat = { ...chat, newMessage: e.target.value };
                              newMap.set(chat.conversation.id, updatedChat);
                              return newMap;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessageToChat(chat.conversation.id, chat.newMessage);
                            }
                          }}
                          placeholder="اكتب رسالتك..."
                          rows={1}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                          disabled={chat.sending}
                        />
                        <button
                          onClick={() => sendMessageToChat(chat.conversation.id, chat.newMessage)}
                          disabled={!chat.newMessage.trim() || chat.sending}
                          className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {chat.sending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <PaperAirplaneIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ NEW: إرسال لجميع الدردشات */}
            {openChats.size > 1 && (
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2">
                  <textarea
                    placeholder={`إرسال رسالة لجميع الدردشات (${openChats.size})...`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const textarea = e.target as HTMLTextAreaElement;
                        sendMessageToAllChats(textarea.value);
                        textarea.value = '';
                      }
                    }}
                    rows={1}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={sendingToAll}
                  />
                  <button
                    onClick={(e) => {
                      const textarea = (e.target as HTMLElement).parentElement?.querySelector('textarea') as HTMLTextAreaElement;
                      if (textarea) {
                        sendMessageToAllChats(textarea.value);
                        textarea.value = '';
                      }
                    }}
                    disabled={sendingToAll}
                    className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {sendingToAll ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-5 h-5" />
                        إرسال للجميع
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : selectedConversation ? (
          <>
            {/* رأس المحادثة */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedConversation.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {selectedConversation.customerName}
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                        اختبار
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">محادثة اختبار مع الذكاء الاصطناعي</p>
                  </div>
                </div>
              </div>
            </div>

            {/* منطقة الرسائل */}
            <div
              ref={messagesContainerRef}
              key={`messages-container-${messages.length}`}
              className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>لا توجد رسائل في هذه المحادثة</p>
                  <p className="text-sm mt-2">ابدأ بإرسال رسالة لاختبار الذكاء الاصطناعي</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isFromCustomer
                        ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                        : message.content.includes('النظام صامت')
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                          : message.isAiGenerated
                            ? 'bg-green-500 dark:bg-green-600 text-white'
                            : 'bg-blue-500 dark:bg-blue-600 text-white'
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>

                      {/* ✅ NEW: المرفقات (الصور) */}
                      {renderAttachments(message)}

                      {/* ✅ NEW: شريط الإجراءات المتقدمة */}
                      <div className="mt-2 pt-1 border-t border-white/10 dark:border-gray-700 flex justify-end">
                        <button
                          onClick={() => {
                            setReplyingTo(message);
                            // Scroll to input
                            document.querySelector('textarea')?.focus();
                          }}
                          className="text-[10px] opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
                        >
                          <ArrowPathIcon className="w-3 h-3 rotate-180" />
                          <span>رد</span>
                        </button>
                      </div>

                      {/* ✅ NEW: العناصر التفاعلية */}
                      {renderInteractiveElements(message)}

                      {/* عرض معلومات الرد AI */}
                      {message.aiResponseInfo && (
                        <div
                          className="mt-2 pt-2 border-t border-white/20 cursor-help hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessageForDetails(message);
                          }}
                        >
                          <div className="text-xs opacity-90 space-y-1">
                            {message.aiResponseInfo.model && (
                              <div className="flex items-center gap-1">
                                <CpuChipIcon className="w-3 h-3" />
                                <span>{message.aiResponseInfo.model}</span>
                                <span className="ms-auto text-[8px] underline">التفاصيل</span>
                              </div>
                            )}
                            {message.aiResponseInfo.agentMode && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${message.aiResponseInfo.agentMode === 'MODERN'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                  }`}>
                                  {message.aiResponseInfo.agentMode === 'MODERN' ? '⚡ Modern Agent' : '🕰️ Legacy Agent'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs mt-1 opacity-70">
                        <div className="flex items-center gap-1">
                          {!message.isFromCustomer && (
                            message.isAiGenerated ? (
                              <CpuChipIcon className="w-3 h-3" title="رد من الذكاء الاصطناعي" />
                            ) : (
                              <UserIcon className="w-3 h-3" title="رد يدوي" />
                            )
                          )}
                          <span>{message.senderName}</span>
                          {!message.isFromCustomer && message.isAiGenerated && (
                            <span> • 🤖 AI</span>
                          )}
                          <span> • {formatTime(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* مؤشر كتابة AI */}
              {isAiTyping && (
                <div className="flex justify-end">
                  <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg max-w-xs">
                    <div className="flex items-center gap-2">
                      <CpuChipIcon className="w-4 h-4" />
                      <span className="text-xs">الذكاء الاصطناعي يكتب...</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* منطقة إدخال الرسالة */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              {/* ✅ NEW: شريط الرد المعلق (Reply Bar) */}
              {replyingTo && (
                <div className="mb-3 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-2 rounded-r-lg animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">الرد على {replyingTo.senderName}:</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate italic">"{replyingTo.content}"</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 p-1">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ✅ NEW: اقتراحات الرد الذكية */}
              {renderSmartSuggestions()}

              {/* ✅ معاينة الصور المختارة */}
              {selectedImages.length > 0 && (
                <div className="mb-3 flex gap-2 flex-wrap">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-blue-500"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* ✅ زر رفع الصور */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || selectedImages.length >= 5}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="إضافة صور (حد أقصى 5)"
                >
                  <PhotoIcon className="w-6 h-6" />
                </button>

                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="اكتب رسالتك هنا... (Enter للإرسال)"
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  style={{ minHeight: '42px', maxHeight: '120px' }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && selectedImages.length === 0) || sending}
                  className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">اختر محادثة للبدء</h3>
              <p className="text-gray-500 dark:text-gray-400">أو أنشئ محادثة جديدة لاختبار الذكاء الاصطناعي</p>
            </div>
          </div>
        )}
      </div>

      {/* 3️⃣ العمود الثالث: إعدادات المحاكاة والتفاصيل (End Sidebar) */}
      <div className="w-80 bg-white dark:bg-gray-800 border-s border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-sm z-10 overflow-hidden">
        {/* رأس إعدادات المحاكاة */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            إعدادات المحاكاة (Pro)
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* أدوات التحكم العالمية (Global Toolbox) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">أدوات التحكم العام</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={createNewConversation}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-all group"
                title="محادثة جديدة"
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold">جديد</span>
              </button>
              <button
                onClick={handleBulkCreate}
                className="flex flex-col items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all group"
                title="إنشاء مجموعة"
              >
                <QueueListIcon className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold">مجموعة</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (multiChatMode) {
                  setMultiChatMode(false);
                  setOpenChats(new Map());
                } else {
                  setMultiChatMode(true);
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all border ${multiChatMode
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600 dark:text-red-400'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 text-orange-600 dark:text-orange-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Squares2X2Icon className="w-5 h-5" />
                <span className="text-xs font-bold">{multiChatMode ? 'إغلاق الدردشات' : 'وضع التعدد'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${multiChatMode ? 'bg-red-500' : 'bg-orange-400'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${multiChatMode ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>

            <div className="flex flex-col gap-2">
              <button
                onClick={runQuickTest}
                disabled={runningTest}
                className="w-full flex items-center gap-3 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {runningTest ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                <span className="text-xs font-bold">اختبار سريع</span>
              </button>
              <button
                onClick={runAnalysisAndFix}
                disabled={runningTest}
                className="w-full flex items-center gap-3 px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {runningTest ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CpuChipIcon className="w-4 h-4" />}
                <span className="text-xs font-bold">تحليل وإصلاح</span>
              </button>
            </div>
          </div>

          {/* خيارات المحاكاة */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-4 h-4 text-purple-600" />
              إعدادات المحاكاة (Pro)
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">المنصة المحاكية</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'test-chat', label: 'الموقع' },
                    { id: 'facebook', label: 'Facebook' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'instagram', label: 'Instagram' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${selectedPlatform === p.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">سياق الزيارة (Context)</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Post ID:</label>
                    <input
                      type="text"
                      placeholder="محاكاة منشور معين..."
                      value={simulatedPostId}
                      onChange={(e) => setSimulatedPostId(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Ad ID (Optional):</label>
                    <input
                      type="text"
                      placeholder="Ads Manager ID..."
                      value={simulatedAdId}
                      onChange={(e) => setSimulatedAdId(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* ✅ NEW: محاكاة دخول منتج (Product Context) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">محاكاة دخول منتج</label>
                <button
                  onClick={() => {
                    const product = prompt("أدخل اسم المنتج أو الـ ID للمحاكاة:");
                    if (product) {
                      setNewMessage(`أنا مهتم بمنتج ${product}`);
                      setSimulatedPostId(`product_${Date.now()}`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  <PhotoIcon className="w-4 h-4" />
                  اختار منتج للمحاكاة
                </button>
              </div>
            </div>
          </div>

          {/* ✅ NEW: لوحة استخراج البيانات (Extraction Dashboard) */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <QueueListIcon className="w-4 h-4 text-green-600" />
              لوحة استخراج البيانات
            </h4>
            {renderExtractionDashboard() || (
              <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-[10px] text-gray-400 italic">
                بانتظار وصول بيانات من العميل عبر المحادثة...
              </div>
            )}
          </div>

          {/* تفاصيل الرسالة المختارة (Inspector) */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Squares2X2Icon className="w-4 h-4 text-blue-600" />
              مفتش الرسائل (Inspector)
            </h4>

            {selectedMessageForDetails ? (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${selectedMessageForDetails.isFromCustomer ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                    {selectedMessageForDetails.isFromCustomer ? 'رسالة عميل' : 'رد AI'}
                  </span>
                  <button onClick={() => setSelectedMessageForDetails(null)} className="text-gray-400 hover:text-red-500">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                  <p className="font-semibold mb-1">المحتوى المستلم:</p>
                  <p className="italic">"{selectedMessageForDetails.content}"</p>
                </div>

                {selectedMessageForDetails.aiResponseInfo && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">النموذج:</span>
                      <span className="font-mono">{selectedMessageForDetails.aiResponseInfo.model || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">وقت المعالجة:</span>
                      <span className="">{selectedMessageForDetails.aiResponseInfo.processingTime}ms</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">النية (Intent):</span>
                      <span className="font-bold text-blue-600">{selectedMessageForDetails.aiResponseInfo.intent || '--'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">المشاعر (Sentiment):</span>
                      <span className="">{selectedMessageForDetails.aiResponseInfo.sentiment || '--'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">الثقة:</span>
                      <span className="text-green-600">{selectedMessageForDetails.aiResponseInfo.confidence ? `${(selectedMessageForDetails.aiResponseInfo.confidence * 100).toFixed(0)}%` : '--'}</span>
                    </div>
                  </div>
                )}

                {!selectedMessageForDetails.isFromCustomer && (
                  <div className="pt-2 text-[10px] text-gray-400 text-center">
                    🔍 تفاصيل الـ Debug متاحة فقط لرسائل الـ AI
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 px-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                <SparklesIcon className="w-8 h-8 mx-auto text-gray-200 mb-3" />
                <p className="text-[10px] text-gray-500">اضغط على أي رسالة AI لعرض تفاصيل الـ API والنموذج هنا.</p>
              </div>
            )}
          </div>
        </div>

        {/* تذييل العمود الثالث */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>نظام المحاكاة Pro نشط</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && conversationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 ml-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">تأكيد حذف المحادثة</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              هل أنت متأكد من حذف محادثة الاختبار؟
              <br />
              <span className="text-red-600 dark:text-red-400 text-sm">
                ⚠️ سيتم حذف جميع الرسائل نهائياً ولا يمكن استرجاعها.
              </span>
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={deleteConversation}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4 ml-2" />
                    حذف نهائياً
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// المكون الرئيسي مع الحماية
const AITestChat: React.FC = () => {
  return (
    <CompanyProtectedRoute>
      <AITestChatContent />
    </CompanyProtectedRoute>
  );
};

export default AITestChat;

