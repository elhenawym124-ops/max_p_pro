import React, { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EyeIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import SavedReplies from '../../components/conversations/SavedReplies';
import CustomerProfile from '../../components/conversations/CustomerProfile';
import { socketService } from '../../services/socketService';
import { uploadService } from '../../services/uploadService';

// Types
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'voice';
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  repliedBy?: string;
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  platform: 'facebook' | 'whatsapp' | 'telegram' | 'unknown';
  status: 'new' | 'active' | 'archived' | 'important';
  messages: Message[];
  customerOrders?: any[];
  lastRepliedBy?: string;
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: 'welcome' | 'thanks' | 'apology' | 'followup' | 'closing' | 'custom';
  createdAt: Date;
}

interface CustomerProfile {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  lastOrder?: any;
  customerSince: Date;
  notes?: string;
}

const MessengerChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const [conversationFilter, setConversationFilter] = useState<'all' | 'new' | 'active' | 'archived' | 'important'>('all');

  // إعداد الإشعارات


  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://www.maxp-ai.pro/api/v1/conversations');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if data is an array (direct response) or has success property
      if (Array.isArray(data)) {
        setConversations(data);
      } else if (data.success && data.data) {
        setConversations(data.data);
      } else {
        console.error('❌ API returned unexpected format:', data);
        setError('تنسيق غير متوقع من الخادم');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('فشل تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`https://www.maxp-ai.pro/api/v1/conversations/${conversationId}/messages`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if data is an array (direct response) or has success property
      if (Array.isArray(data)) {
        setMessages(data);
        scrollToBottom();
      } else if (data.success && data.data) {
        setMessages(data.data);
        scrollToBottom();
      } else {
        console.error('❌ Failed to load messages:', data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // التمرير إلى أسفل
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // اختيار محادثة
  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    loadCustomerProfile(conversation.customerId);
    
    // تعليم الرسائل كمقروءة
    if (conversation.unreadCount > 0) {
      messages.forEach(message => {
        if (message.isFromCustomer && message.status !== 'read') {
          socketService.markAsRead(message.id, conversation.id);
        }
      });
    }
  };

  // تحميل بروفايل العميل
  const loadCustomerProfile = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      
      if (data.success) {
        setCustomerProfile(data.data);
      }
    } catch (error) {
      console.error('Error loading customer profile:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Validate file
    const validation = uploadService.validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingFile(true);

    try {
      // Upload file
      const uploadResult = await uploadService.uploadConversationImage(file);

      if (!uploadResult.success) {
        alert(uploadResult.error || 'Failed to upload image');
        return;
      }

      // Send message with image
      const imageMessage = {
        content: file.name,
        conversationId: selectedConversation.id,
        type: 'image' as const,
        isFromCustomer: false,
        status: 'sending' as const,
        fileUrl: uploadResult.data?.fullUrl,
        fileName: file.name,
        fileSize: file.size
      };

      // Send via Socket.IO
      socketService.sendMessage({
        ...imageMessage,
        senderId: 'current-user',
        senderName: 'المستخدم'
      });

      // Update local state
      const newMsg = {
        id: Date.now().toString(),
        ...imageMessage,
        senderId: 'current-user',
        senderName: 'المستخدم',
        timestamp: new Date(),
        status: 'sent' as const
      };

      setMessages(prev => [...prev, newMsg]);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingFile(false);
    }
  };

  // إرسال رسالة
  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'voice' = 'text') => {
    if (!selectedConversation || !content.trim()) return;

    setSending(true);
    
    try {
      const message = {
        content: content.trim(),
        conversationId: selectedConversation.id,
        type,
        isFromCustomer: false,
        status: 'sending' as const
      };

      // إرسال عبر Socket.IO
      socketService.sendMessage({
        content: content.trim(),
        conversationId: selectedConversation.id,
        senderId: 'current-user', // يجب استبداله بالمستخدم الفعلي
        senderName: 'المستخدم',
        type,
        isFromCustomer: false,
        status: 'sending'
      });

      // تحديث المحلي
      const newMsg = {
        id: Date.now().toString(),
        content: content.trim(),
        senderId: 'current-user',
        senderName: 'المستخدم',
        timestamp: new Date(),
        type: type as 'text' | 'image' | 'voice',
        isFromCustomer: false,
        status: 'sent' as const,
        conversationId: selectedConversation.id
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // تحديث آخر رسالة في المحادثة
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, lastMessage: content.trim(), lastMessageTime: new Date() }
          : conv
      ));

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // حذف محادثة
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`https://www.maxp-ai.pro/api/v1/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
        setConversationToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // تصفية المحادثات
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = conversationFilter === 'all' || conversation.status === conversationFilter;
    
    return matchesSearch && matchesFilter;
  });

  // تحميل الردود المحفوظة
  const loadSavedReplies = async () => {
    try {
      const response = await fetch('https://www.maxp-ai.pro/api/v1/saved-replies');
      const data = await response.json();
      
      if (data.success) {
        setSavedReplies(data.data);
      }
    } catch (error) {
      console.error('Error loading saved replies:', error);
    }
  };

  // استخدام الرد المحفوظ
  const useSavedReply = (reply: SavedReply) => {
    handleSendMessage(reply.content);
    setShowSavedReplies(false);
  };

  // البحث داخل المحادثة
  const searchInChat = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = messages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  // إعداد التأثيرات
  useEffect(() => {
    loadConversations();
    loadSavedReplies();
    
    // توصيل Socket.IO
    const socket = socketService.connect();
    
    // الاستماع للأحداث
    socketService.onMessage((message) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socketService.onMessageDelivered((data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: 'delivered' } : msg
      ));
    });

    socketService.onMessageRead((data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: 'read' } : msg
      ));
    });

    socketService.onTypingStart((data) => {
      if (data.conversationId === selectedConversation?.id) {
        setTypingUsers(prev => [...prev, data.userName]);
      }
    });

    socketService.onTypingStop((data) => {
      if (data.conversationId === selectedConversation?.id) {
        setTypingUsers(prev => prev.filter(name => name !== data.userName));
      }
    });

    socketService.onConversationUpdated((conversation) => {
      setConversations(prev => prev.map(conv => 
        conv.id === conversation.id ? conversation : conv
      ));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      socketService.joinConversation(selectedConversation.id);
      
      return () => {
        socketService.leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (chatSearchQuery) {
      searchInChat(chatSearchQuery);
    }
  }, [chatSearchQuery, messages]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - قائمة المحادثات */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">المحادثات</h2>
          
          {/* Search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {['all', 'new', 'active', 'important', 'archived'].map((filter) => (
              <button
                key={filter}
                onClick={() => setConversationFilter(filter as any)}
                className={`flex-1 px-2 py-1 text-sm rounded-md transition-colors ${
                  conversationFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'الكل' :
                 filter === 'new' ? 'جديد' :
                 filter === 'active' ? 'نشط' :
                 filter === 'important' ? 'مهم' : 'مؤرشف'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-center">
                  <img
                    src={conversation.customerAvatar || `https://ui-avatars.com/api/?name=${conversation.customerName}&background=random`}
                    alt={conversation.customerName}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="mr-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">{conversation.customerName}
                        {conversation.pageName && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                            {conversation.pageName}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.lastMessageTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        conversation.status === 'new' ? 'bg-green-100 text-green-800' :
                        conversation.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        conversation.status === 'important' ? 'bg-red-100 text-red-800' :
                        conversation.status === 'archived' ? 'bg-gray-100 text-gray-800' : ''
                      }`}>
                        {conversation.status === 'new' ? 'جديد' :
                         conversation.status === 'active' ? 'نشط' :
                         conversation.status === 'important' ? 'مهم' : 'مؤرشف'}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <img
                  src={selectedConversation.customerAvatar || `https://ui-avatars.com/api/?name=${selectedConversation.customerName}&background=random`}
                  alt={selectedConversation.customerName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="mr-3">
                  <h3 className="font-semibold text-gray-900">{selectedConversation.customerName}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.isOnline ? 'متصل الآن' : 'غير متصل'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCustomerProfile(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <InformationCircleIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setConversationToDelete(selectedConversation);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                      message.isFromCustomer ? 'bg-gray-100' : 'bg-blue-600 text-white'
                    } rounded-lg p-3`}>
                      {message.type === 'image' && (
                        <img
                          src={message.fileUrl}
                          alt={message.fileName}
                          className="rounded-lg max-w-full"
                        />
                      )}
                      {message.type === 'text' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <div className={`flex items-center mt-1 text-xs ${
                        message.isFromCustomer ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        <span>{new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        {!message.isFromCustomer && (
                          <span className="mr-1">
                            {message.status === 'sent' && <CheckIcon className="w-4 h-4" />}
                            {message.status === 'delivered' && <CheckCheckIcon className="w-4 h-4" />}
                            {message.status === 'read' && <EyeIcon className="w-4 h-4" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSavedReplies(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className={`p-2 ${uploadingFile ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {uploadingFile ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  ) : (
                    <PaperClipIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <FaceSmileIcon className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(newMessage, 'text');
                      }
                    }}
                    placeholder="اكتب رسالتك..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => handleSendMessage(newMessage, 'text')}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">اختر محادثة للبدء</h3>
              <p>اختر محادثة من القائمة لعرض الرسائل</p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Profile Sidebar */}
      {showCustomerProfile && selectedConversation && (
        <div className="w-80 bg-white border-r border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">بروفايل العميل</h3>
            <button
              onClick={() => setShowCustomerProfile(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {customerProfile && (
            <div className="space-y-4">
              <div className="text-center">
                <img
                  src={customerProfile.avatar || `https://ui-avatars.com/api/?name=${customerProfile.name}&background=random`}
                  alt={customerProfile.name}
                  className="w-20 h-20 rounded-full mx-auto mb-2"
                />
                <h4 className="font-semibold">{customerProfile.name}</h4>
                <p className="text-sm text-gray-600">{customerProfile.email}</p>
              </div>
              
              <div className="border-t pt-4">
                <h5 className="font-semibold mb-2">معلومات العميل</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الطلبات الكلية:</span>
                    <span>{customerProfile.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ التسجيل:</span>
                    <span>{new Date(customerProfile.customerSince).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessengerChat;
