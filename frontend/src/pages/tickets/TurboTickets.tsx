import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TicketIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

const TurboTickets: React.FC = () => {
  const navigate = useNavigate();
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketType, setTicketType] = useState(1); // Default to inquiry type
  const [inquiryTypeId, setInquiryTypeId] = useState<number | null>(null);
  const [sendingTicket, setSendingTicket] = useState(false);
  const [inquiriesTypes, setInquiriesTypes] = useState<Array<{id: number, name: string, nameEn?: string}>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState({ tickets: 0, missions: 0, orders: 0 });
  const [turboEnabled, setTurboEnabled] = useState(false);

  useEffect(() => {
    checkTurboEnabled();
    loadInquiriesTypes();
    loadTickets();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [ticketsPage]);

  const checkTurboEnabled = async () => {
    try {
      const response = await apiClient.get('/store-settings/turbo');
      if (response.data.success) {
        setTurboEnabled(response.data.data.turboEnabled || false);
      }
    } catch (error) {
      console.error('Error checking Turbo status:', error);
    }
  };

  const loadInquiriesTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await apiClient.get('/turbo/inquiries-types');
      if (response.data.success && response.data.data?.types) {
        const typesData = response.data.data.types;
        const typesArray = Array.isArray(typesData) ? typesData : [];
        setInquiriesTypes(typesArray);
        // Set default inquiry_type_id to first type if available
        if (typesArray.length > 0) {
          setInquiryTypeId(typesArray[0].id || typesArray[0].type || null);
        }
      } else {
        // Fallback to default types
        const defaultTypes = [
          { id: 1, name: 'شكوى' },
          { id: 2, name: 'استفسار' },
          { id: 3, name: 'شكر' }
        ];
        setInquiriesTypes(defaultTypes);
        setInquiryTypeId(defaultTypes[0].id || null);
      }
    } catch (error: any) {
      console.error('Error loading inquiries types:', error);
      // Fallback to default types
      const defaultTypes = [
        { id: 1, name: 'شكوى' },
        { id: 2, name: 'استفسار' },
        { id: 3, name: 'شكر' }
      ];
      setInquiriesTypes(defaultTypes);
      setInquiryTypeId(defaultTypes[0].id || null);
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadTickets = async () => {
    if (!turboEnabled) return;
    
    try {
      setLoadingTickets(true);
      const response = await apiClient.get(`/turbo/tickets?page=${ticketsPage}&per_page=${ticketsPerPage}`);
      
      if (response.data.success) {
        const ticketsData = response.data.data?.tickets || [];
        const paginationData = response.data.data?.pagination || {};
        
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
        setTicketsTotal(paginationData.total || 0);
      } else {
        setTickets([]);
        setTicketsTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast.error('فشل تحميل التذاكر');
      setTickets([]);
      setTicketsTotal(0);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!turboEnabled) return;
    
    try {
      const response = await apiClient.get('/turbo/tickets/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data.counts || { tickets: 0, missions: 0, orders: 0 });
      }
    } catch (error: any) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleViewTicket = (ticketId: number) => {
    navigate(`/settings/turbo/ticket/${ticketId}`);
  };

  const handleSendTicket = async () => {
    if (!ticketDescription.trim()) {
      toast.error('يرجى إدخال وصف التذكرة');
      return;
    }

    if (ticketType === 1 && !inquiryTypeId) {
      toast.error('يرجى اختيار نوع الاستفسار');
      return;
    }

    const requestData: any = {
      description: ticketDescription.trim(),
      type: ticketType
    };

    if (ticketType === 1 && inquiryTypeId) {
      requestData.inquiryTypeId = inquiryTypeId;
    }

    try {
      setSendingTicket(true);

      const response = await apiClient.post('/turbo/tickets', requestData);

      if (response.data.success) {
        toast.success('تم إرسال التذكرة بنجاح');
        setTicketDescription('');
        setTicketType(1);
        setInquiryTypeId(null);
        loadTickets();
        loadUnreadCount();
      } else {
        toast.error(response.data.message || 'فشل إرسال التذكرة');
      }
    } catch (error: any) {
      console.error('Error sending ticket:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'فشل إرسال التذكرة';
      console.error('Ticket request data:', requestData);
      console.error('Error response:', error.response?.data);
      toast.error(errorMessage);
    } finally {
      setSendingTicket(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 ml-2" />
          العودة للطلبات
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <TicketIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          تذاكر Turbo
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          إدارة تذاكر Turbo للشحن - إرسال ومتابعة التذاكر
        </p>
      </div>

      {/* Send Ticket Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">إرسال تذكرة جديدة</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع التذكرة
            </label>
            <select
              value={ticketType}
              onChange={(e) => {
                setTicketType(parseInt(e.target.value));
                if (parseInt(e.target.value) !== 1) {
                  setInquiryTypeId(null);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              <option value={1}>استفسار (Inquiry)</option>
              <option value={2}>شكوى (Complain)</option>
              <option value={3}>شكر (Gratitude)</option>
              <option value={4}>اقتراح (Suggestion)</option>
            </select>
          </div>

          {ticketType === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الاستفسار <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              {loadingTypes ? (
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                  جاري تحميل الأنواع...
                </div>
              ) : (
                <select
                  value={inquiryTypeId || ''}
                  onChange={(e) => setInquiryTypeId(parseInt(e.target.value))}
                  disabled={!Array.isArray(inquiriesTypes) || inquiriesTypes.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  <option value="">اختر نوع الاستفسار</option>
                  {Array.isArray(inquiriesTypes) && inquiriesTypes.length > 0 ? (
                    inquiriesTypes.map((type) => (
                      <option key={type.id || type.type} value={type.id || type.type}>
                        {type.name || type.nameEn || `نوع ${type.id || type.type}`}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1}>نوع 1</option>
                      <option value={2}>نوع 2</option>
                      <option value={3}>نوع 3</option>
                    </>
                  )}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              وصف التذكرة
            </label>
            <textarea
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              rows={5}
              placeholder="اكتب وصف التذكرة هنا..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {ticketDescription.length} حرف
            </p>
          </div>

          <button
            onClick={handleSendTicket}
            disabled={sendingTicket || !ticketDescription.trim() || !turboEnabled}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <PaperAirplaneIcon className="h-4 w-4 ml-1" />
            {sendingTicket ? 'جاري الإرسال...' : 'إرسال التذكرة'}
          </button>

          {!turboEnabled && (
            <p className="text-xs text-red-500 dark:text-red-400">
              يجب تفعيل Turbo أولاً لإرسال التذاكر. يرجى الذهاب إلى{' '}
              <button
                onClick={() => navigate('/settings/turbo')}
                className="underline hover:text-red-700 dark:hover:text-red-300"
              >
                إعدادات Turbo
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Tickets List Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">قائمة التذاكر</h3>
            {unreadCount.tickets > 0 && (
              <span className="mr-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded-full">
                {unreadCount.tickets} غير مقروء
              </span>
            )}
          </div>
          <button
            onClick={loadTickets}
            disabled={loadingTickets}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            {loadingTickets ? 'جاري التحديث...' : 'تحديث'}
          </button>
        </div>

        {!turboEnabled ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            يجب تفعيل Turbo أولاً لعرض التذاكر. يرجى الذهاب إلى{' '}
            <button
              onClick={() => navigate('/settings/turbo')}
              className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              إعدادات Turbo
            </button>
          </div>
        ) : loadingTickets ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">جاري تحميل التذاكر...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد تذاكر</div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(tickets) && tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => handleViewTicket(ticket.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">#{ticket.id}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.status === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        ticket.status === 1 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {ticket.status === 0 ? 'جديد' : ticket.status === 1 ? 'قيد المعالجة' : 'مغلق'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ticket.description || 'لا يوجد وصف'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {ticketsTotal > ticketsPerPage && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <button
                  onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                  disabled={ticketsPage === 1 || loadingTickets}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm disabled:opacity-50"
                >
                  السابق
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  صفحة {ticketsPage} من {Math.ceil(ticketsTotal / ticketsPerPage)}
                </span>
                <button
                  onClick={() => setTicketsPage(p => p + 1)}
                  disabled={ticketsPage >= Math.ceil(ticketsTotal / ticketsPerPage) || loadingTickets}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TurboTickets;

