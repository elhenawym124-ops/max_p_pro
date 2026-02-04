import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isFromCustomer: boolean;
}

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  messages?: Message[];
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

const ConversationsSimpleTest: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      console.log('🔄 [TEST] Loading conversations...');
      const response = await fetch('https://www.maxp-ai.pro/api/v1/conversations');
      const data = await response.json();
      
      console.log('📊 [TEST] Response:', data);
      
      if (data.success) {
        setConversations(data.data);
        console.log('✅ [TEST] Conversations loaded:', data.data.length);
      } else {
        setError('فشل في تحميل المحادثات');
      }
    } catch (error) {
      console.error('❌ [TEST] Error:', error);
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = async (conversationId: string) => {
    try {
      console.log('🔄 [TEST] Loading messages for:', conversationId);
      const response = await fetch(`https://www.maxp-ai.pro/api/v1/conversations/${conversationId}/messages`);
      const data = await response.json();
      
      console.log('📨 [TEST] Messages response:', data);
      
      if (data.success) {
        setMessages(data.data);
        console.log('✅ [TEST] Messages loaded:', data.data.length);
      } else {
        console.log('❌ [TEST] Failed to load messages:', data.message);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ [TEST] Error loading messages:', error);
      setMessages([]);
    }
  };

  // اختيار محادثة
  const selectConversation = (conversation: Conversation) => {
    console.log('👆 [TEST] Selected conversation:', conversation.id);
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🧪 اختبار المحادثات المبسط</h1>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🧪 اختبار المحادثات المبسط</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-700">❌ {error}</p>
          <button 
            onClick={loadConversations}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 اختبار المحادثات المبسط</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* قائمة المحادثات */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">📋 المحادثات ({conversations.length})</h2>
          
          {conversations.length === 0 ? (
            <p className="text-gray-500">لا توجد محادثات</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  <div className="font-medium">{conv.customerName}
                    {conv.pageName && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                        {conv.pageName}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 truncate">{conv.lastMessage}</div>
                  <div className="text-xs text-gray-400 mt-1">ID: {conv.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الرسائل */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">
            💬 الرسائل ({messages.length})
            {selectedConversation && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - {selectedConversation.customerName}
              </span>
            )}
          </h2>
          
          {!selectedConversation ? (
            <p className="text-gray-500">اختر محادثة لعرض الرسائل</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500">لا توجد رسائل في هذه المحادثة</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.isFromCustomer 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {message.senderName} 
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(message.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                  <div className="mt-1">{message.content}</div>
                  <div className="text-xs text-gray-400 mt-1">ID: {message.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* معلومات التشخيص */}
      <div className="mt-6 bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">🔍 معلومات التشخيص</h3>
        <div className="text-sm space-y-1">
          <div>عدد المحادثات: {conversations.length}</div>
          <div>المحادثة المختارة: {selectedConversation?.id || 'لا يوجد'}</div>
          <div>عدد الرسائل: {messages.length}</div>
          <div>حالة التحميل: {loading ? 'جاري التحميل' : 'مكتمل'}</div>
          <div>الأخطاء: {error || 'لا يوجد'}</div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsSimpleTest;
