import React, { useState, useEffect } from 'react';

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

const ConversationsImprovedSimple: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل المحادثات من API
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading conversations from API...');
      const response = await fetch('https://www.maxp-ai.pro/api/v1/conversations');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Conversations loaded successfully:', data.data.length);
        
        // تحويل البيانات للتنسيق المطلوب
        const formattedConversations = data.data.map((conv: any) => ({
          id: conv.id,
          customerName: conv.customerName || 'عميل غير معروف',
          lastMessage: conv.lastMessage || 'لا توجد رسائل',
          lastMessageTime: new Date(conv.lastMessageTime || Date.now()),
          unreadCount: conv.unreadCount || 0,
          pageName: conv.pageName || null, // إضافة اسم الصفحة
          pageId: conv.pageId || null // إضافة معرف الصفحة
        }));
        
        setConversations(formattedConversations);
      } else {
        throw new Error(data.message || 'فشل في تحميل المحادثات');
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      setError('فشل في تحميل المحادثات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">جاري تحميل المحادثات...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">❌ خطأ في التحميل</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadConversations}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            🚀 المحادثات المحسنة (نسخة مبسطة)
          </h1>
          <p className="text-gray-600 mt-2">
            تم تحميل {conversations.length} محادثة بنجاح
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              لا توجد محادثات متاحة
            </div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {conversation.customerName}
                      {conversation.pageName && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                          {conversation.pageName}
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {conversation.lastMessageTime.toLocaleTimeString('ar-SA')}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 mt-1">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsImprovedSimple;
