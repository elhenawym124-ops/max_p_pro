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
  // الحالات الأساسية
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // المراجع
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالات إضافية
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  // تصنيف المحادثات
  const [conversationFilter, setConversationFilter] = useState<'all' | 'new' | 'active' | 'archived' | 'important'>('all');

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      setLoading(true);
      // محاكاة تحميل البيانات
      const mockConversations: Conversation[] = [
        {
          id: '1',
          customerId: 'customer1',
          customerName: 'أحمد محمد',
          lastMessage: 'شكراً لك على المساعدة!',
          lastMessageTime: new Date(),
          unreadCount: 2,
          status: 'active',
          platform: 'facebook',
          messages: [],
          customerOrders: []
        },
        {
          id: '2',
          customerId: 'customer2',
          customerName: 'سارة أحمد',
          lastMessage: 'هل يمكنني معرفة حالة طلبي؟',
          lastMessageTime: new Date(Date.now() - 3600000),
          unreadCount: 0,
          status: 'new',
          platform: 'facebook',
          messages: [],
          customerOrders: []
        }
      ];
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل
  const loadMessages = async (conversationId: string) => {
    try {
      // محاكاة تحميل الرسائل
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'مرحباً، كيف يمكنني مساعدتك؟',
          senderId: 'user1',
          senderName: 'أنت',
          timestamp: new Date(Date.now() - 7200000),
          status: 'read',
          type: 'text',
          conversationId: conversationId,
          isFromCustomer: false,
          repliedBy: 'أنت'
        },
        {
          id: '2',
          content: 'أريد الاستفسار عن منتج معين',
          senderId: 'customer1',
          senderName: 'أحمد محمد',
          timestamp: new Date(Date.now() - 3600000),
          status: 'read',
          type: 'text',
          conversationId: conversationId,
          isFromCustomer: true
        },
        {
          id: '3',
          content: 'بالطبع، أي منتج تريد؟',
          senderId: 'user1',
          senderName: 'أنت',
          timestamp: new Date(Date.now() - 1800000),
          status: 'delivered',
          type: 'text',
          conversationId: conversationId,
          isFromCustomer: false,
          repliedBy: 'أنت'
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // إرسال رسالة
  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'voice' = 'text') => {
    if (!content.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        content: content,
        senderId: 'user1',
        senderName: 'أنت',
        timestamp: new Date(),
        type: type,
        status: 'sent',
        conversationId: selectedConversation.id,
        isFromCustomer: false,
        repliedBy: 'أنت'
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // إرسال عبر WebSocket
      socketService.sendMessage({
        conversationId: selectedConversation.id,
        text: content,
        type: type
      });

      // تحديث حالة المحادثة
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessage: content, lastMessageTime: new Date() }
            : conv
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // حذف محادثة
  const handleDeleteConversation = async (conversation: Conversation) => {
    try {
      setConversations(prev => prev.filter(c => c.id !== conversation.id));
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // تحميل الردود المحفوظة
  const loadSavedReplies = async () => {
    try {
      const mockReplies: SavedReply[] = [
        { id: '1', title: 'ترحيب', content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟', category: 'welcome', createdAt: new Date() },
        { id: '2', title: 'شكر', content: 'شكراً لتواصلك معنا!', category: 'thanks', createdAt: new Date() },
        { id: '3', title: 'اعتذار', content: 'نأسف للإزعاج، سنعمل على حل المشكلة فوراً', category: 'apology', createdAt: new Date() }
      ];
      setSavedReplies(mockReplies);
    } catch (error) {
      console.error('Error loading saved replies:', error);
    }
  };

  // استخدام الرد المحفوظ
  const useSavedReply = (reply: SavedReply) => {
    handleSendMessage(reply.content, 'text');
    setShowSavedReplies(false);
  };

  // البحث في المحادثات
  const searchInChat = (query: string) => {
    if (query.trim()) {
      const results = messages
        .filter(msg => msg.content.toLowerCase().includes(query.toLowerCase()))
        .map(msg => msg.content);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // تصفية المحادثات
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = conversationFilter === 'all' || conv.status === conversationFilter;
    return matchesSearch && matchesFilter;
  });

  // تمرير إلى آخر رسالة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تحميل البيانات عند التحميل
  useEffect(() => {
    loadConversations();
    loadSavedReplies();

    // إعداد WebSocket
    socketService.onMessage((message: any) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  // تحميل الرسائل عند تغيير المحادثة
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      const mockCustomerProfile: CustomerProfile = {
        id: selectedConversation.customerId,
        name: selectedConversation.customerName,
        totalOrders: 5,
        customerSince: new Date('2023-01-01'),
        email: 'customer@example.com',
        phone: '+1234567890'
      };
      setCustomerProfile(mockCustomerProfile);
    }
  }, [selectedConversation]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* قائمة المحادثات */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* رأس القائمة */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">المحادثات</h2>
          
          {/* البحث */}
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

          {/* تصفية المحادثات */}
          <div className="mt-3 flex gap-2">
            {(['all', 'new', 'active', 'important'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setConversationFilter(filter)}
                className={`px-3 py-1 text-sm rounded-full ${
                  conversationFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'الكل' : 
                 filter === 'new' ? 'جديد' :
                 filter === 'active' ? 'نشط' : 'مهم'}
              </button>
            ))}
          </div>
        </div>

        {/* قائمة المحادثات */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center">
                  <img
                    src={conversation.customerAvatar || '/api/placeholder/40/40'}
                    alt={conversation.customerName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="mr-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">{conversation.customerName}
                        {conversation.pageName && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                            {conversation.pageName}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.lastMessageTime).toLocaleTimeString('ar-SA')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    <div className="flex items-center mt-1">
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
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

      {/* منطقة المحادثة */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* رأس المحادثة */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <img
                  src={selectedConversation.customerAvatar || '/api/placeholder/40/40'}
                  alt={selectedConversation.customerName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="mr-3">
                  <h3 className="font-medium text-gray-900">{selectedConversation.customerName}</h3>
                  <p className="text-sm text-gray-500">نشط الآن</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomerProfile(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
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

            {/* منطقة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isFromCustomer
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {message.type === 'image' && message.fileUrl && (
                      <img src={message.fileUrl} alt="صورة" className="rounded-lg max-w-full" />
                    )}
                    {message.type === 'text' && <p>{message.content}</p>}
                    
                    <div className="flex items-center mt-1">
                      <span className="text-xs opacity-75">
                        {new Date(message.timestamp).toLocaleTimeString('ar-SA')}
                      </span>
                      {!message.isFromCustomer && (
                        <div className="mr-1">
                          {message.status === 'sent' && <CheckIcon className="h-3 w-3" />}
                          {message.status === 'delivered' && (
                            <div className="flex">
                              <CheckIcon className="h-3 w-3" />
                              <CheckIcon className="h-3 w-3 -mr-1" />
                            </div>
                          )}
                          {message.status === 'read' && (
                            <div className="flex text-blue-300">
                              <CheckIcon className="h-3 w-3" />
                              <CheckIcon className="h-3 w-3 -mr-1" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {message.repliedBy && message.isFromCustomer && (
                      <p className="text-xs mt-1 opacity-75">
                        تم الرد بواسطة: {message.repliedBy}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* منطقة الإدخال */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
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
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // معالجة رفع الملف
                      console.log('Uploading file:', file.name);
                    }
                  }}
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(newMessage)}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleSendMessage(newMessage)}
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
          onUseReply={useSavedReply}
        />
      )}

      {/* مكون ملف العميل */}
      {showCustomerProfile && customerProfile && (
        <CustomerProfile
          customer={customerProfile}
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
