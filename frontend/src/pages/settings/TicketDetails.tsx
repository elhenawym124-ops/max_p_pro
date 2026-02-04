import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface Message {
  id: number;
  ticket_id: number;
  message: string;
  sender_name: string;
  created_at: string;
  is_client_message: number;
  is_comment: number;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    role_name: string;
  };
}

interface TicketDetails {
  id: number;
  description: string;
  status: number;
  created_at: string;
  messages: Message[];
}

const TicketDetails: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🎫 Loading ticket details from Backend for ID: ${ticketId}`);

      // Call both backend endpoints parallel
      const [ticketResponse, logResponse] = await Promise.all([
        apiClient.get(`/turbo/tickets/${ticketId}`),
        apiClient.get(`/turbo/tickets/${ticketId}/log`)
      ]);

      console.log('📋 Backend ticket response:', ticketResponse.data);
      console.log('📋 Backend log response:', logResponse.data);

      if (!ticketResponse.data.success) {
        throw new Error(ticketResponse.data.message || 'فشل تحميل تفاصيل التذكرة');
      }

      // Backend structure: { success: true, data: { success: true, ticket: {...}, ... } }
      const ticketResult = ticketResponse.data.data;
      const logResult = logResponse.data.data;

      // Extract ticket data - ticketResult.ticket contains the actual ticket from Turbo API
      const ticketData = ticketResult.ticket || {};
      // Extract logs - logResult.logs contains the log array
      const logsData = logResult.logs || [];

      // Turbo API returns messages in replies field, not messages
      // Convert replies to messages for consistency
      const messages = ticketData.messages || ticketData.replies || [];
      
      // Sort messages by created_at ascending (oldest first) for display from top to bottom
      const sortedMessages = [...messages].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      });

      // Combine ticket data with logs
      const combinedTicket = {
        id: ticketData.id || parseInt(ticketId || '0'),
        description: ticketData.description || 'تذكرة Turbo',
        status: ticketData.status !== undefined ? ticketData.status : 1,
        created_at: ticketData.created_at || new Date().toISOString(),
        messages: sortedMessages,
        logs: logsData
      };

      console.log('✅ Combined ticket data:', combinedTicket);
      console.log('📋 Ticket messages count:', combinedTicket.messages?.length || 0);
      console.log('📋 Ticket logs count:', combinedTicket.logs?.length || 0);
      console.log('📋 Sample message:', combinedTicket.messages?.[0]);
      console.log('📋 Sample log:', combinedTicket.logs?.[0]);
      setTicket(combinedTicket);

    } catch (error: any) {
      console.error('❌ Error loading ticket from Backend:', error);
      setError(error.response?.data?.message || error.message || 'فشل تحميل تفاصيل التذكرة');
      toast.error('فشل تحميل تفاصيل التذكرة');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'جديد';
      case 1: return 'قيد المعالجة';
      case 2: return 'مغلق';
      default: return 'غير معروف';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyMessage.trim() && !replyImage) {
      toast.error('يرجى إدخال رسالة أو رفع صورة');
      return;
    }

    if (!ticketId) {
      toast.error('معرف التذكرة غير موجود');
      return;
    }

    try {
      setSendingReply(true);

      // إنشاء FormData
      const formData = new FormData();
      formData.append('message', replyMessage);

      // إضافة الصورة إذا كانت موجودة
      if (replyImage) {
        formData.append('image', replyImage);
      }

      const response = await apiClient.post(
        `/turbo/tickets/${ticketId}/reply`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('تم إرسال الرد بنجاح');
        setReplyMessage('');
        setReplyImage(null);
        // إعادة تحميل تفاصيل التذكرة لتحديث الرسائل
        loadTicketDetails();
      } else {
        throw new Error(response.data.message || 'فشل إرسال الرد');
      }
    } catch (error: any) {
      console.error('❌ Error sending reply:', error);
      toast.error(error.response?.data?.error || error.message || 'فشل إرسال الرد');
    } finally {
      setSendingReply(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى رفع ملف صورة فقط');
        return;
      }
      // التحقق من حجم الملف (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 10MB');
        return;
      }
      setReplyImage(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل تفاصيل التذكرة...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="w-full">
          <button
            onClick={() => navigate('/settings/turbo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">خطأ في تحميل التذكرة</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadTicketDetails}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="w-full">
          <button
            onClick={() => navigate('/settings/turbo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">لم يتم العثور على التذكرة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/settings/turbo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <h1 className="text-2xl font-bold text-gray-900">
            تذكرة #{ticket.id}
          </h1>
        </div>

        {/* Ticket Info */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">معلومات التذكرة</h2>
            </div>

            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(ticket.status)}`}>
              {getStatusText(ticket.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              تاريخ الإنشاء: {formatDate(ticket.created_at)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">وصف المشكلة</label>
            <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{ticket.description}</p>
          </div>
        </div>

        {/* Messages/Conversation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">المحادثة</h2>
            <span className="text-sm text-gray-500">
              ({ticket.messages?.length || 0} رسالة)
            </span>
          </div>

          {ticket.messages && ticket.messages.length > 0 ? (
            <div className="space-y-4">
              {ticket.messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.is_client_message ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${message.is_client_message
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-indigo-600 text-white'
                    } rounded-lg p-4`}>

                    {/* Sender info */}
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {message.sender_name || `${message.sender?.first_name} ${message.sender?.last_name}`}
                      </span>
                      {message.sender?.role_name && (
                        <span className={`text-xs px-2 py-1 rounded ${message.is_client_message
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-indigo-500 text-indigo-100'
                          }`}>
                          {message.sender.role_name}
                        </span>
                      )}
                    </div>

                    {/* Message content */}
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>

                    {/* Timestamp */}
                    <p className={`text-xs mt-2 ${message.is_client_message ? 'text-gray-500' : 'text-indigo-200'
                      }`}>
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد رسائل في هذه التذكرة</p>
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">إرسال رد</h2>
          <form onSubmit={handleReply} className="space-y-4">
            <div>
              <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">
                الرسالة
              </label>
              <textarea
                id="replyMessage"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="اكتب رسالتك هنا..."
                disabled={sendingReply}
              />
            </div>

            <div>
              <label htmlFor="replyImage" className="block text-sm font-medium text-gray-700 mb-2">
                صورة (اختياري)
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="replyImage"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <PhotoIcon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {replyImage ? replyImage.name : 'اختر صورة'}
                  </span>
                </label>
                <input
                  id="replyImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={sendingReply}
                />
                {replyImage && (
                  <button
                    type="button"
                    onClick={() => setReplyImage(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                    disabled={sendingReply}
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingReply || (!replyMessage.trim() && !replyImage)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              {sendingReply ? 'جاري الإرسال...' : 'إرسال الرد'}
            </button>
          </form>
        </div>

        {/* Logs Section */}
        {ticket.logs && ticket.logs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <ClockIcon className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">سجل التذكرة</h2>
              <span className="text-sm text-gray-500">
                ({ticket.logs.length} سجل)
              </span>
            </div>

            <div className="space-y-3">
              {ticket.logs.map((log: any, index: number) => (
                <div
                  key={log.id || index}
                  className="border-r-4 border-indigo-500 bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-2">
                        {log.description?.ar || log.description || 'لا يوجد وصف'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <UserIcon className="w-3 h-3" />
                        <span>{log.user?.full_name || 'مستخدم'}</span>
                        <span>•</span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;

