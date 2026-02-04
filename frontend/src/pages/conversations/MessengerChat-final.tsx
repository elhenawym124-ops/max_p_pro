import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  ChatBubbleLeftRightIcon, 
  InformationCircleIcon, 
  MagnifyingGlassIcon, 
  TrashIcon, 
  CheckIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import apiService, { Message, Conversation, SavedReply, CustomerProfile as CustomerProfileType } from '../../services/apiService';

const MessengerChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileType | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'new' | 'active' | 'archived' | 'important'>('all');
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConversations();
    loadSavedReplies();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      if (selectedConversation.customerId) {
        loadCustomerProfile(selectedConversation.customerId);
      }
    }
  }, [selectedConversation]);

  // Auto-refresh messages every 5 seconds for the selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const fetchedConversations = await apiService.getConversations();
      if (Array.isArray(fetchedConversations)) {
        setConversations(fetchedConversations);
        if (fetchedConversations.length > 0) {
          setSelectedConversation(fetchedConversations[0]);
        }
      } else {
        // إذا لم تكن البيانات array، استخدم بيانات وهمية
        const mockConversations: Conversation[] = [
          {
            id: '1',
            customerId: '1',
            customerName: 'أحمد محمد',
            lastMessage: 'مرحبا، أحتاج مساعدة',
            lastMessageTime: new Date(),
            status: 'active',
            unreadCount: 2,
            platform: 'facebook',
            messages: []
          },
          {
            id: '2',
            customerId: '2',
            customerName: 'فاطمة علي',
            lastMessage: 'شكرا لكم',
            lastMessageTime: new Date(),
            status: 'active',
            unreadCount: 0,
            platform: 'facebook',
            messages: []
          }
        ];
        setConversations(mockConversations);
        setSelectedConversation(mockConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // في حالة الخطأ، استخدم بيانات وهمية
      const mockConversations: Conversation[] = [
        {
          id: '1',
          customerId: '1',
          customerName: 'أحمد محمد',
          lastMessage: 'مرحبا، أحتاج مساعدة',
          lastMessageTime: new Date(),
          status: 'active',
          unreadCount: 2,
          platform: 'facebook',
          messages: []
        },
        {
          id: '2',
          customerId: '2',
          customerName: 'فاطمة علي',
          lastMessage: 'شكرا لكم',
          lastMessageTime: new Date(),
          status: 'active',
          unreadCount: 0,
          platform: 'facebook',
          messages: []
        }
      ];
      setConversations(mockConversations);
      setSelectedConversation(mockConversations[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      console.log('📨 Loading real messages for conversation:', conversationId);
      const realMessages = await apiService.getMessages(conversationId);

      // تحويل الرسائل الحقيقية إلى تنسيق الواجهة
      const formattedMessages: Message[] = realMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender?.id || (msg.isFromCustomer ? 'customer' : 'agent'),
        senderName: msg.sender?.name || (msg.isFromCustomer ? 'العميل' : 'المندوب'),
        timestamp: new Date(msg.timestamp),
        status: 'read',
        type: msg.type || 'text',
        conversationId: conversationId,
        isFromCustomer: msg.isFromCustomer,
        repliedBy: msg.isFromCustomer ? undefined : (msg.sender?.name || 'المندوب'),
        attachments: msg.attachments || [],
        isFacebookReply: msg.isFacebookReply || false, // Include Facebook reply flag
        facebookMessageId: msg.facebookMessageId || null // Include Facebook message ID
      }));

      console.log('✅ Loaded', formattedMessages.length, 'real messages');
      setMessages(formattedMessages);
    } catch (error) {
      console.error('❌ Error loading real messages:', error);
      // في حالة الخطأ، استخدم رسائل فارغة
      setMessages([]);
    }
  };

  const loadSavedReplies = async () => {
    try {
      const fetchedReplies = await apiService.getSavedReplies();
      if (Array.isArray(fetchedReplies)) {
        setSavedReplies(fetchedReplies);
      } else {
        // استخدم ردود وهمية في حالة عدم وجود البيانات
        const mockReplies: SavedReply[] = [
          { id: '1', title: 'ترحيب', content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟', category: 'welcome', createdAt: new Date() },
          { id: '2', title: 'شكر', content: 'شكراً لتواصلك معنا. نقدر ثقتك بنا.', category: 'thanks', createdAt: new Date() },
          { id: '3', title: 'اعتذار', content: 'نعتذر عن أي إزعاج. سنعمل على حل المشكلة فوراً.', category: 'apology', createdAt: new Date() }
        ];
        setSavedReplies(mockReplies);
      }
    } catch (error) {
      console.error('Error loading saved replies:', error);
      // في حالة الخطأ، استخدم ردود وهمية
      const mockReplies: SavedReply[] = [
        { id: '1', title: 'ترحيب', content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟', category: 'welcome', createdAt: new Date() },
        { id: '2', title: 'شكر', content: 'شكراً لتواصلك معنا. نقدر ثقتك بنا.', category: 'thanks', createdAt: new Date() },
        { id: '3', title: 'اعتذار', content: 'نعتذر عن أي إزعاج. سنعمل على حل المشكلة فوراً.', category: 'apology', createdAt: new Date() }
      ];
      setSavedReplies(mockReplies);
    }
  };

  const loadCustomerProfile = async (customerId: string) => {
    try {
      const profile = await apiService.getCustomerProfile(customerId);
      setCustomerProfile(profile);
    } catch (error) {
      console.error('Error loading customer profile:', error);
      // استخدم ملف عميل وهمي في حالة الخطأ
      const mockProfile = {
        id: customerId,
        name: 'عميل',
        email: 'customer@example.com',
        phone: '+201234567890',
        avatar: null,
        orders: [],
        totalSpent: 0,
        joinDate: new Date().toISOString()
      };
      setCustomerProfile(mockProfile);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // إنشاء معرف مؤقت للرسالة خارج try-catch
    const tempMessageId = Date.now().toString();

    try {
      if (!selectedConversation) return;

      const messageToSend: Omit<Message, 'id' | 'timestamp' | 'status'> = {
        content: newMessage,
        senderId: 'agent1',
        senderName: 'أنت',
        type: 'text',
        isFromCustomer: false,
        conversationId: selectedConversation.id
      };

      // إضافة الرسالة محلياً
      const tempMessage: Message = {
        ...messageToSend,
        id: tempMessageId,
        timestamp: new Date(),
        status: 'sending'
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // إرسال الرسالة للخادم
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessageId
              ? { ...savedMessage, status: 'sent' }
              : msg
          )
        );
      } else {
        throw new Error('فشل في إرسال الرسالة');
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessageId
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    try {
      await apiService.deleteConversation(conversation.id);
      setConversations(prev => prev.filter(conv => conv.id !== conversation.id));
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const useSavedReply = (reply: SavedReply) => {
    setNewMessage(reply.content);
    setShowSavedReplies(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedConversation) return;
    
    try {
      // محاكاة رفع الملف
      const fileUrl = URL.createObjectURL(file);
      const messageToSend: Partial<Message> = {
        content: file.name,
        senderId: 'currentUserId', // يجب استبدال هذا بمعرف المستخدم الفعلي
        senderName: 'أنت',
        timestamp: new Date(),
        status: 'sent',
        type: 'image', // نوع الرسالة سيكون صورة
        conversationId: selectedConversation.id,
        isFromCustomer: false,
        repliedBy: 'أنت',
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: file.size,
      };

      // تحديث الواجهة فوراً
      setMessages(prev => [...prev, messageToSend as Message]);
      // سيتم إرسال الرسالة عبر WebSocket عند تنفيذ التكامل الحقيقي
      
      // إغلاق مربع اختيار الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conv: Conversation) => {
    const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = conversationFilter === 'all' || conv.status === conversationFilter;
    return matchesSearch && matchesFilter;
  }) : [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* قائمة المحادثات */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">المحادثات</h2>
          
          <div className="mt-3 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن محادثة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mt-3 flex gap-1">
            {(['all', 'new', 'active', 'archived', 'important'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setConversationFilter(filter)}
                className={`px-3 py-1 text-xs rounded-full ${
                  conversationFilter === filter 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'الكل' : 
                 filter === 'new' ? 'جديد' :
                 filter === 'active' ? 'نشط' :
                 filter === 'archived' ? 'مؤرشف' : 'مهم'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center">
                  {conversation.customerAvatar ? (
                    <img
                      src={conversation.customerAvatar}
                      alt={conversation.customerName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-sm font-medium">
                        {conversation.customerName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.customerName}
                        {conversation.pageName && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                            {conversation.pageName}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessageTime ?
                          new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          'الآن'
                        }
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        conversation.status === 'new' ? 'bg-green-100 text-green-800' :
                        conversation.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        conversation.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {conversation.status === 'new' ? 'جديد' :
                         conversation.status === 'active' ? 'نشط' :
                         conversation.status === 'archived' ? 'مؤرشف' : 'مهم'}
                      </span>
                      {conversation.isOnline && (
                        <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* منطقة المحادثة */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                {selectedConversation.customerAvatar ? (
                  <img
                    src={selectedConversation.customerAvatar}
                    alt={selectedConversation.customerName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {selectedConversation.customerName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">{selectedConversation.customerName}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.isOnline ? 'نشط الآن' : 'غير متصل'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowCustomerProfile(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowSavedReplies(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setConversationToDelete(selectedConversation);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50"
              style={{ minHeight: 0, height: 'auto' }}
              onScroll={() => {
                // يمكن إضافة تحميل الرسائل القديمة عند التمرير لأعلى
              }}
            >
              <div className="space-y-4 w-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl 2xl:max-w-4xl px-4 py-2 rounded-lg min-h-fit ${
                        message.isFromCustomer
                          ? 'bg-white border border-gray-200'
                          : 'bg-blue-500 text-white'
                      }`}
                      style={{
                        maxHeight: 'none',
                        height: 'auto',
                        overflow: 'visible'
                      }}
                    >
                      {message.type === 'image' && message.fileUrl && (
                        <div className="mb-2">
                          <img
                            src={getImageUrl(message)}
                            alt={message.fileName}
                            className="rounded-lg max-h-48 object-cover"
                          />
                        </div>
                      )}
                      {message.type === 'voice' && message.fileUrl && (
                        <div className="mb-2">
                          <audio controls className="w-full">
                            <source src={message.fileUrl} type="audio/mpeg" />
                            متصفحك لا يدعم عنصر الصوت.
                          </audio>
                        </div>
                      )}
                      <div
                        className="text-sm whitespace-pre-wrap break-words leading-relaxed overflow-visible w-full"
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          maxHeight: 'none',
                          height: 'auto',
                          textOverflow: 'clip',
                          overflow: 'visible',
                          display: 'block'
                        }}
                      >
                        {message.content.length > 500 && !expandedMessages.has(message.id)
                          ? message.content.substring(0, 500) + '...'
                          : message.content
                        }
                        {message.content.length > 500 && (
                          <button
                            onClick={() => toggleMessageExpansion(message.id)}
                            className="text-xs text-blue-400 hover:text-blue-600 mt-1 block"
                          >
                            {expandedMessages.has(message.id) ? 'إخفاء' : 'عرض المزيد'}
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!message.isFromCustomer && (
                          <span className="text-xs opacity-70 mr-1">
                            {message.status === 'sent' ? '✓' : 
                             message.status === 'delivered' ? '✓✓' : '👁'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center">
                <button
                  onClick={() => setShowSavedReplies(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,audio/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </div>

      {/* مكون الردود المحفوظة */}
      {showSavedReplies && (
        <SavedReplies 
          replies={savedReplies}
          onClose={() => setShowSavedReplies(false)} 
          onUseReply={(reply: SavedReply) => {
            setNewMessage(reply.content);
            setShowSavedReplies(false);
          }}
        />
      )}

      {/* مكون ملف العميل */}
      {showCustomerProfile && customerProfile && selectedConversation && (
        <CustomerProfile 
          customerId={selectedConversation.customerId} 
          isOpen={showCustomerProfile}
          onClose={() => setShowCustomerProfile(false)} 
        />
      )}

      {/* مودال حذف المحادثة */}
      {showDeleteModal && conversationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من حذف محادثة {conversationToDelete.customerName}؟
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteConversation(conversationToDelete)}
                className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessengerChat;
