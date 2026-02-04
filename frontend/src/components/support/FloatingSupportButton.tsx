import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Plus,
  ArrowLeft,
  Send,
  Loader2
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import supportService, { Ticket } from '../../services/supportService';

type ViewState = 'list' | 'chat' | 'new_ticket';

const FloatingSupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewState>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Chat State
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Ticket State
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketContent, setNewTicketContent] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const location = useLocation();
  const isSupportPage = location.pathname.startsWith('/support') || location.pathname.startsWith('/admin/support');

  // Detect RTL/LTR direction
  const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
  const isProductsPage = location.pathname.startsWith('/products');
  // موقع جديد: أعلى يسار الشاشة (أو يمين للـ LTR) - أقل إزعاجاً
  const floatingPositionClass = isRTL ? 'left-6 items-start' : 'right-6 items-end';
  const triggerSizeClass = 'px-4 h-11 gap-2';
  const triggerIconClass = 'w-5 h-5';
  const triggerTextClass = 'text-sm';

  // Fetch Tickets List
  useEffect(() => {
    if (!isSupportPage && isOpen && view === 'list') {
      fetchTickets();
    }
  }, [isOpen, view, isSupportPage]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (view === 'chat' && activeTicket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, view]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/support/tickets?limit=5');
      if (response.data.success) {
        // Log to debug ID structure
        console.log('Tickets fetched:', response.data.tickets);
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = async (ticket: any) => {
    // Prefer friendly ticketId (e.g. "TKT-123") over database keys, as the API likely expects it
    const targetId = ticket.ticketId || ticket._id || ticket.id;

    if (!targetId) {
      console.error('Missing ticket ID for ticket object:', ticket);
      return;
    }

    try {
      setChatLoading(true);
      setView('chat');

      const data = await supportService.getTicketDetails(targetId);

      if (data.success) {
        console.log('Active Ticket Set:', data.ticket);
        setActiveTicket(data.ticket);
      }
    } catch (error) {
      console.error('Error fetching details', error);
      // Optional: Add a UI toast or alert here
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTicket = activeTicket as any;
    // Consistent priority: ticketId > _id > id
    const targetId = currentTicket?.ticketId || currentTicket?._id || currentTicket?.id;

    if (!activeTicket || !targetId || !messageContent.trim()) {
      console.error('Cannot send message: Missing ticket ID or content', activeTicket, targetId);
      return;
    }

    setSendingMessage(true);
    try {
      const formData = new FormData();
      formData.append('content', messageContent);

      const data = await supportService.addMessage(targetId, formData);

      if (data.success) {
        // Re-fetch details to ensure we have the latest messages
        // The addMessage response might not include the full populated messages array
        setMessageContent('');
        const updatedDetails = await supportService.getTicketDetails(targetId);
        if (updatedDetails.success) {
          setActiveTicket(updatedDetails.ticket);
        } else {
          // Fallback: use the ticket from addMessage if re-fetch fails, or keep current
          if (data.ticket) setActiveTicket(data.ticket);
        }
      }
    } catch (error) {
      console.error('Error sending message', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketContent.trim()) return;

    setCreatingTicket(true);
    try {
      const formData = new FormData();
      formData.append('subject', newTicketSubject);
      formData.append('content', newTicketContent);
      formData.append('category', 'inquiry'); // Default category

      const data = await supportService.createTicket(formData);

      if (data.success) {
        // Switch to chat view with the new ticket
        setActiveTicket(data.ticket);
        setView('chat');
        // Reset form
        setNewTicketSubject('');
        setNewTicketContent('');
        // Refresh list in background
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket', error);
    } finally {
      setCreatingTicket(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوح';
      case 'in_progress': return 'جار المعالجة';
      case 'closed': return 'مغلق';
      default: return status;
    }
  };

  if (isSupportPage) return null;

  return (
    <div className={`fixed top-20 z-40 flex flex-col gap-4 ${floatingPositionClass}`}>

      {/* Widget Container */}
      {isOpen && (
        <div className="w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-300 origin-bottom-left">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white relative flex-shrink-0">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                {view !== 'list' && (
                  <button
                    onClick={() => setView('list')}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h2 className="font-bold text-lg">
                    {view === 'list' && 'مركز المساعدة'}
                    {view === 'new_ticket' && 'محادثة جديدة'}
                    {view === 'chat' && (activeTicket?.subject || 'المحادثة')}
                  </h2>
                  {view === 'chat' && activeTicket && (
                    <div className="flex items-center gap-2 text-xs text-blue-100">
                      <span className={`w-2 h-2 rounded-full ${activeTicket.status === 'open' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                      {getStatusText(activeTicket.status)}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* VIEWS */}

          {/* 1. Ticket List View */}
          {view === 'list' && (
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 custom-scrollbar">
              <button
                onClick={() => setView('new_ticket')}
                className="w-full bg-blue-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mb-6 group"
              >
                <div className="bg-white/20 p-1 rounded-full">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-semibold">بدء محادثة جديدة</span>
              </button>

              <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">المحادثات السابقة</h3>

              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket: any, idx) => (
                    <div
                      // Use robust key generation
                      key={ticket._id || ticket.id || ticket.ticketId || idx}
                      onClick={() => handleTicketClick(ticket)}
                      className="cursor-pointer bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(ticket.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm mb-1">
                        {ticket.subject}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {ticket.lastMessage?.content || 'عرض التفاصيل...'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">لا توجد محادثات سابقة</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Chat View */}
          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4 custom-scrollbar space-y-4">
                {chatLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : activeTicket?.messages && activeTicket.messages.length > 0 ? (
                  activeTicket.messages.map((msg, idx) => (
                    <div key={msg._id || idx} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.senderType === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                        }`}>
                        <p>{msg.content}</p>
                        <div className={`text-[10px] mt-1 ${msg.senderType === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm mt-10">بداية المحادثة</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    rows={1}
                    className="flex-1 max-h-32 min-h-[44px] bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 resize-none custom-scrollbar"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageContent.trim()}
                    className="h-11 w-11 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* 3. New Ticket View */}
          {view === 'new_ticket' && (
            <div className="flex-1 overflow-y-auto bg-white p-6 custom-scrollbar">
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع</label>
                  <input
                    type="text"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="عنوان المشكلة"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرسالة</label>
                  <textarea
                    value={newTicketContent}
                    onChange={(e) => setNewTicketContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                    placeholder="كيف يمكننا مساعدتك؟"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingTicket ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'بدء المحادثة'
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center rounded-full shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${triggerSizeClass}
          ${isOpen
            ? 'bg-gray-800 text-white'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30'
          }
        `}
      >
        <div className={`relative transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
          {isOpen ? <X className={triggerIconClass} /> : <MessageCircle className={triggerIconClass} />}
        </div>

        <span className={`font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${triggerTextClass} ${isOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <span className="hidden md:inline">تحدث معنا</span>
          <span className="md:hidden">دعم</span>
        </span>

        {/* Unread Indicator */}
        {!isOpen && tickets.some(t => t.status !== 'closed') && (
          <span className="absolute top-1 right-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingSupportButton;
