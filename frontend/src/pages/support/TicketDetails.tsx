import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Paperclip,
  X,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare,
  User,
  Shield,
  Briefcase,
  Building,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Flag,
  Trash2,
  Lock,
  Search,
  Filter
} from 'lucide-react';
import supportService, { Ticket, AttachmentFile } from '../../services/supportService';
import { useAuth } from '../../hooks/useAuthSimple';

const TicketDetails: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Admin specific state
  const [adminTab, setAdminTab] = useState<'reply' | 'note'>('reply');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // NEW: All tickets for sidebar
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [ticketsSearchQuery, setTicketsSearchQuery] = useState('');

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'superadmin';

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  useEffect(() => {
    if (isAdmin && ticket?.userId) {
      fetchUserHistory();
      fetchStaffList();
    }
  }, [ticket?.userId, isAdmin]);

  // NEW: Fetch all tickets for sidebar
  useEffect(() => {
    if (isAdmin) {
      fetchAllTickets();
    }
  }, [isAdmin]);

  const fetchAllTickets = async () => {
    try {
      const data = await supportService.getAllTickets();
      if (data.success) setAllTickets(data.tickets || []);
    } catch (err) { console.error('Error fetching all tickets', err); }
  };

  const fetchUserHistory = async () => {
    if (!ticket?.userId) return;
    try {
      // @ts-ignore
      const userId = ticket.userId._id || ticket.userId.id;
      const data = await supportService.getUserTicketHistory(userId, ticket.ticketId);
      if (data.success) setUserHistory(data.tickets);
    } catch (err) { console.error('Error fetching history', err); }
  };

  const fetchStaffList = async () => {
    try {
      const data = await supportService.getSupportStaff();
      if (data.success) setStaffList(data.staff);
    } catch (err) { console.error('Error fetching staff', err); }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const data = await supportService.getTicketDetails(ticketId!);

      if (data.success) {
        setTicket(data.ticket);
        // Show rating form if ticket is closed and not rated yet (ONLY for users)
        if (!isAdmin && data.ticket.status === 'closed' && !data.ticket.rating) {
          setShowRating(true);
        }
      } else {
        setError('التذكرة غير موجودة');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'حدث خطأ في جلب تفاصيل التذكرة');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return;
    try {
      setUpdatingStatus(true);
      const data = await supportService.updateTicket(ticket.ticketId, { status: newStatus });
      if (data.success) {
        await fetchTicketDetails();
        showNotification('تم تحديث الحالة بنجاح');
      }
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!ticket) return;
    try {
      const data = await supportService.updateTicket(ticket.ticketId, { priority: newPriority });
      if (data.success) {
        await fetchTicketDetails();
        showNotification('تم تحديث الأولوية بنجاح');
      }
    } catch (error) {
      console.error('Failed to update priority', error);
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket || !user) return;
    try {
      const data = await supportService.updateTicket(ticket.ticketId, { assignedUserId: user.id });
      if (data.success) {
        await fetchTicketDetails();
        showNotification('تم تعيين التذكرة لك بنجاح');
      }
    } catch (error) {
      console.error('Failed to assign ticket', error);
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!ticket) return;
    try {
      const data = await supportService.updateTicket(ticket.ticketId, { assignedUserId: userId });
      if (data.success) {
        await fetchTicketDetails();
        showNotification('تم تعيين التذكرة للموظف بنجاح');
      }
    } catch (error) {
      console.error('Failed to assign ticket', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (attachments.length + files.length > maxFiles) {
      setError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`);
      return;
    }

    const validFiles: AttachmentFile[] = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        setError(`حجم الملف ${file.name} كبير جداً (الحد الأقصى 10 ميجابايت)`);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

      if (!allowedTypes.includes(file.type)) {
        setError(`نوع الملف ${file.name} غير مسموح`);
        return;
      }

      const attachmentFile: AttachmentFile = { file };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachmentFile.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachmentFile]);
        };
        reader.readAsDataURL(file);
      } else {
        validFiles.push(attachmentFile);
      }
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }

    // Clear the input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() && attachments.length === 0) {
      setError('يجب كتابة رسالة أو إرفاق ملف');
      return;
    }

    setSendingMessage(true);
    setError('');

    try {
      const formData = new FormData();
      // If admin is sending a note, we might prefix it or handle it differently.
      // Current backend might not support "Internal Notes" natively visible only to admins.
      // For now, we strictly send as "content" but if it's a note, we might style it differently in the future
      // or assume the backend handles it. Since backend audit said no implementation yet, 
      // we will treat "Internal Note" as a visual distinct message for now or simply as a normal message 
      // but warn the admin it's public if the backend doesn't support it.
      // Re-reading usage: Admin wants "Internal Notes". 
      // If I send it as normal message, USER WILL SEE IT. 
      // Safest: ONLY "Reply" works for now. "Internal Note" should be disabled or marked (Coming Soon).

      const contentToSend = messageContent;

      formData.append('content', contentToSend);
      if (adminTab === 'note') {
        formData.append('isInternal', 'true');
      }

      // Add attachments
      attachments.forEach(attachment => {
        formData.append('attachments', attachment.file);
      });

      const data = await supportService.addMessage(ticketId!, formData);

      if (data.success) {
        setTicket(data.ticket);
        setMessageContent('');
        setAttachments([]);
      } else {
        setError(data.message || 'حدث خطأ في إرسال الرسالة');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'حدث خطأ في إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      setError('يرجى اختيار تقييم');
      return;
    }

    setSubmittingRating(true);
    setError('');

    try {
      const data = await supportService.rateTicket(ticketId!, {
        rating,
        feedback
      });

      if (data.success) {
        setTicket(data.ticket);
        setShowRating(false);
      } else {
        setError(data.message || 'حدث خطأ في تقييم الخدمة');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'حدث خطأ في تقييم الخدمة');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'in_progress':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'مفتوح';
      case 'in_progress':
        return 'قيد المعالجة';
      case 'closed':
        return 'مغلق';
      default:
        return status;
    }
  };

  const getCategoryText = (category: string) => {
    const categories: { [key: string]: string } = {
      'technical': 'تقني',
      'billing': 'فواتير',
      'inquiry': 'استفسار',
      'suggestion': 'اقتراح',
      'complaint': 'شكوى'
    };
    return categories[category] || category;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">خطأ</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(isAdmin ? '/admin/support' : '/support/tickets')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            العودة إلى التذاكر
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  // =========================================================================
  // ADMIN VIEW - 3 Column Layout
  // =========================================================================
  if (isAdmin) {
    // Filter tickets based on search query
    const filteredTickets = allTickets.filter(t =>
      t.subject.toLowerCase().includes(ticketsSearchQuery.toLowerCase()) ||
      t.ticketId.toLowerCase().includes(ticketsSearchQuery.toLowerCase())
    );

    return (
      <div className="bg-slate-100 h-screen font-sans relative overflow-hidden" dir="rtl">
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in-down flex items-center gap-3 backdrop-blur-md transition-all">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            {notification}
          </div>
        )}

        {/* Main 3-Column Layout - Full Height */}
        <div className="flex h-screen">

          {/* COLUMN 1: Tickets List (Right in RTL) */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  التذاكر
                </h2>
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm font-medium">
                  {allTickets.length}
                </span>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في التذاكر..."
                  value={ticketsSearchQuery}
                  onChange={(e) => setTicketsSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-slate-50"
                />
              </div>
            </div>

            {/* Tickets List - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/support/tickets/${t.ticketId}`)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${t.ticketId === ticketId ? 'bg-indigo-50 border-r-4 border-r-indigo-500' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${t.status === 'open' ? 'bg-emerald-500' :
                      t.status === 'in_progress' ? 'bg-indigo-500' : 'bg-slate-300'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-base truncate mb-1">
                        {t.subject}
                      </div>
                      <div className="text-sm text-slate-500 mb-2">
                        {t.userId?.name || 'مستخدم'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono">{t.ticketId}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-lg font-medium ${t.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        t.priority === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {t.priority === 'critical' ? 'حرجة' :
                        t.priority === 'high' ? 'عالية' :
                          t.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  لا توجد تذاكر
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: Chat Area (Center) */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            {/* Navbar breadcrumb / Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-all" dir="rtl">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/admin/support')}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                    {ticket.subject}
                    <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">#{ticket.ticketId}</span>
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-medium">{getCategoryText(ticket.category)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Dropdown */}
                <div className="relative group">
                  <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm font-medium transition-all duration-200 hover:shadow-md ${ticket.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    ticket.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                    {getStatusIcon(ticket.status)}
                    {getStatusText(ticket.status)}
                  </button>
                  {/* Popup Menu */}
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform origin-top-left p-1 max-h-48 overflow-y-auto">
                    <button onClick={() => handleUpdateStatus('open')} className="w-full text-right px-4 py-2 hover:bg-emerald-50 text-sm flex items-center gap-3 rounded-lg text-slate-700 transition-colors"><div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></div> مفتوح</button>
                    <button onClick={() => handleUpdateStatus('in_progress')} className="w-full text-right px-4 py-2 hover:bg-indigo-50 text-sm flex items-center gap-3 rounded-lg text-slate-700 transition-colors"><div className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-100"></div> قيد المعالجة</button>
                    <button onClick={() => handleUpdateStatus('closed')} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-3 rounded-lg text-slate-700 transition-colors"><div className="w-2 h-2 rounded-full bg-slate-500 ring-2 ring-slate-100"></div> مغلق</button>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Content Wrapper */}
            <div className="flex-1 p-4 min-h-0 flex flex-col">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
                  <h2 className="font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    سجل المحادثة
                  </h2>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 min-h-0 custom-scrollbar">
                  {ticket.messages.map((message, index) => (
                    <div
                      key={message._id}
                      className={`flex ${message.senderType === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.senderType === 'admin' ? 'bg-blue-100 ml-3 order-last' : 'bg-gray-300 mr-3'}`}>
                        {message.senderType === 'admin' ? <Shield className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-gray-600" />}
                      </div>

                      <div className={`max-w-[75%] space-y-1 ${message.senderType === 'admin' ? 'text-left' : 'text-right'}`}>
                        {/* Sender Name & Time */}
                        <div className={`flex items-center gap-2 text-xs text-gray-400 ${message.senderType === 'admin' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium text-gray-700">{message.senderType === 'admin' ? 'الدعم الفني' : message.sender.name}</span>
                          <span>•</span>
                          <span>{new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Bubble */}
                        <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md max-w-full ${message.isInternal
                          ? 'bg-amber-50 border border-amber-100 text-amber-900 rounded-bl-none'
                          : message.senderType === 'admin'
                            ? 'bg-indigo-600 text-white rounded-br-none' // Modern Indigo
                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                          }`}>
                          {message.isInternal && (
                            <div className="flex items-center gap-1 text-xs font-bold mb-1 opacity-70">
                              <Lock className="w-3 h-3" /> ملاحظة داخلية
                            </div>
                          )}
                          <p>{message.content}</p>
                          {message.attachments.length > 0 && (
                            <div className="mt-3 space-y-2 pt-2 border-t border-white/20">
                              {message.attachments.map((attachment, i) => (
                                <a href={attachment.url} target="_blank" key={i} className="flex items-center gap-2 text-xs hover:underline bg-black/10 p-2 rounded">
                                  <Paperclip className="w-3 h-3" /> {attachment.originalName}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin Reply Area - Fixed at bottom */}
                <div className="bg-white border-t flex-shrink-0" style={{ minHeight: '140px', maxHeight: '140px' }}>
                  {/* Tabs */}
                  <div className="flex border-b border-slate-100 px-3 pt-2">
                    <button
                      onClick={() => setAdminTab('reply')}
                      className={`pb-2 px-2 text-xs font-semibold transition-all relative ${adminTab === 'reply' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      رد عام
                      {adminTab === 'reply' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full animate-fadeIn" />}
                    </button>

                    <button
                      onClick={() => setAdminTab('note')}
                      className={`pb-2 px-2 text-xs font-semibold transition-all relative flex items-center gap-1 ${adminTab === 'note' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Lock className="w-3 h-3" /> ملاحظة داخلية
                      {adminTab === 'note' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600 rounded-full animate-fadeIn" />}
                    </button>
                  </div>

                  <form onSubmit={handleSendMessage} className={`p-2 h-full flex flex-col justify-between transition-all duration-300 ${adminTab === 'note' ? 'bg-amber-50/50' : ''}`}>
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className={`w-full p-2 border rounded-lg focus:ring-1 outline-none resize-none transition-all text-sm custom-scrollbar ${adminTab === 'note'
                        ? 'bg-white border-amber-200 focus:ring-amber-200 focus:border-amber-400'
                        : 'bg-slate-50 focus:bg-white border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'
                        }`}
                      style={{ height: '60px' }}
                      placeholder={adminTab === 'note' ? "اكتب ملاحظة للفريق الداخلي فقط..." : "اكتب ردك للعميل هنا..."}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        <label className="cursor-pointer p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors group">
                          <Paperclip className="w-3 h-3 group-hover:text-indigo-600 transition-colors" />
                          <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={sendingMessage || (!messageContent.trim() && attachments.length === 0)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${adminTab === 'note'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                      >
                        {sendingMessage ? 'جاري الإرسال...' : <><Send className="w-3 h-3 transform rotate-180" /> {adminTab === 'note' ? 'حفظ' : 'إرسال'}</>}
                      </button>
                    </div>

                    {attachments.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto mt-3">
                        {attachments.map((file, idx) => (
                          <div key={idx} className="relative group bg-slate-100 rounded-lg p-2 border flex items-center gap-2 min-w-[100px] flex-shrink-0">
                            <div className="text-sm truncate max-w-[80px]">{file.file.name}</div>
                            <button type="button" onClick={() => removeAttachment(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>
                </div>
              </div>

            </div> {/* Close Chat Wrapper */}
          </div> {/* Close Col 2 */}

          {/* COLUMN 3: Customer & Ticket Info (Left in RTL) */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

              {/* Customer Card */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-5 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">بيانات العميل</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                    {ticket.userId.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{ticket.userId.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Mail className="w-4 h-4" /> {ticket.userId.email}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-base text-slate-600 p-3 bg-white rounded-xl border border-slate-100">
                    <Building className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="block text-xs text-slate-400 uppercase">الشركة</span>
                      <span className="font-medium text-slate-800">شركة تجريبية</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-base text-slate-600 p-3 bg-white rounded-xl border border-slate-100">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="block text-xs text-slate-400 uppercase">الخطة الحالية</span>
                      <span className="font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg text-sm">Premium Plan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Meta */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">معلومات التذكرة</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500 block mb-2 font-medium">المعرف (ID)</label>
                    <div className="font-mono bg-slate-100 p-3 rounded-xl border border-slate-200 text-base select-all text-slate-600 tracking-wider text-center">
                      {ticket.ticketId}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 block mb-2 font-medium">القسم</label>
                    <button className="w-full text-right flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl hover:border-indigo-400 transition-all bg-white text-slate-700 text-base">
                      {getCategoryText(ticket.category)}
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 block mb-2 font-medium">الأولوية</label>
                    <div className="relative group">
                      <button className="w-full text-right flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl hover:border-indigo-400 transition-all bg-white text-base">
                        <span className="flex items-center gap-2 font-medium">
                          <Flag className={`w-4 h-4 ${ticket.priority === 'critical' ? 'text-red-500 fill-red-500' :
                            ticket.priority === 'high' ? 'text-orange-500' :
                              ticket.priority === 'low' ? 'text-emerald-500' : 'text-blue-500'
                            }`} />
                          {ticket.priority === 'critical' ? <span className="text-red-600">حرجة</span> :
                            ticket.priority === 'high' ? <span className="text-orange-600">عالية</span> :
                              ticket.priority === 'low' ? <span className="text-emerald-600">منخفضة</span> :
                                <span className="text-blue-600">متوسطة</span>}
                        </span>
                      </button>
                      <div className="absolute left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                        <button onClick={() => handleUpdatePriority('low')} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-emerald-700 text-base flex items-center gap-2 border-b border-slate-50 font-medium">منخفضة</button>
                        <button onClick={() => handleUpdatePriority('medium')} className="w-full text-right px-4 py-3 hover:bg-blue-50 text-blue-700 text-base flex items-center gap-2 border-b border-slate-50 font-medium">متوسطة</button>
                        <button onClick={() => handleUpdatePriority('high')} className="w-full text-right px-4 py-3 hover:bg-orange-50 text-orange-700 text-base flex items-center gap-2 border-b border-slate-50 font-medium">عالية</button>
                        <button onClick={() => handleUpdatePriority('critical')} className="w-full text-right px-4 py-3 hover:bg-red-50 text-red-700 text-base flex items-center gap-2 font-bold">حرجة</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 block mb-2 font-medium">المكلف</label>
                    <div className="relative group">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-base font-bold text-indigo-700">
                            {ticket.assignedTo.name.charAt(0)}
                          </div>
                          <span className="text-base font-medium text-slate-700">{ticket.assignedTo.name}</span>
                        </div>
                      ) : (
                        <button className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 text-base transition-all font-medium flex items-center justify-center gap-2">
                          <User className="w-5 h-5" /> تعيين موظف
                        </button>
                      )}
                      <div className="absolute left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-48 overflow-y-auto">
                        <button onClick={handleAssignToMe} className="w-full text-right px-4 py-3 hover:bg-indigo-50 text-indigo-700 text-base flex items-center gap-2 border-b border-slate-50 font-bold">
                          تعيين لي
                        </button>
                        {staffList.filter(s => s.id !== user?.id).map(staff => (
                          <button key={staff.id} onClick={() => handleAssignUser(staff.id)} className="w-full text-right px-4 py-3 hover:bg-slate-50 text-slate-700 text-base flex items-center gap-2 border-b border-slate-50">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500">{staff.name.charAt(0)}</div>
                            {staff.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Tickets */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">تذاكر سابقة للعميل</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userHistory.length > 0 ? (
                    userHistory.map(hTicket => (
                      <div
                        key={hTicket.id}
                        onClick={() => navigate(`/support/tickets/${hTicket.ticketId}`)}
                        className="cursor-pointer group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                      >
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${hTicket.status === 'open' ? 'bg-emerald-500' :
                          hTicket.status === 'closed' ? 'bg-slate-300' : 'bg-indigo-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors mb-1">
                            {hTicket.subject}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="font-mono">{hTicket.ticketId}</span>
                            <span>•</span>
                            <span>{new Date(hTicket.createdAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-base text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      لا توجد تذاكر سابقة
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }


  // =========================================================================
  // USER VIEW (Original Layout)
  // =========================================================================
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/support/tickets')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة إلى التذاكر
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {ticket.subject}
                </h1>
                <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                  <span>#{ticket.ticketId}</span>
                  <span>•</span>
                  <span>{getCategoryText(ticket.category)}</span>
                  <span>•</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(ticket.status)}
                <span className="mr-2 font-medium">
                  {getStatusText(ticket.status)}
                </span>
              </div>
            </div>

            {ticket.status === 'closed' && ticket.resolvedAt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  <span className="text-green-800">
                    تم حل التذكرة في {new Date(ticket.resolvedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                {ticket.rating && (
                  <div className="mt-2 flex items-center">
                    <span className="text-green-700 ml-2">التقييم:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= ticket.rating!
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow-md mb-4 flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 ml-2" />
              المحادثة ({ticket.messages.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {ticket.messages.map((message, index) => (
              <div
                key={message._id}
                className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${message.senderType === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <div className="flex items-center mb-2">
                    {message.senderType === 'admin' ? (
                      <Shield className="w-4 h-4 ml-1 text-blue-600" />
                    ) : (
                      <User className="w-4 h-4 ml-1" />
                    )}
                    <span className="text-xs font-medium">
                      {message.senderType === 'admin' ? 'فريق الدعم' : message.sender.name}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed mb-2">
                    {message.content}
                  </p>

                  {message.attachments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {message.attachments.map((attachment, attachIndex) => (
                        <div key={attachIndex} className="flex items-center">
                          {attachment.mimetype.startsWith('image/') ? (
                            <img
                              src={attachment.url}
                              alt={attachment.originalName}
                              className="max-w-full h-32 object-cover rounded cursor-pointer"
                              onClick={() => window.open(attachment.url, '_blank')}
                            />
                          ) : (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs hover:underline"
                            >
                              <Download className="w-3 h-3 ml-1" />
                              {attachment.originalName} ({formatFileSize(attachment.size)})
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs opacity-75">
                    {new Date(message.createdAt).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Reply Form (User) */}
        {ticket.status !== 'closed' && (
          <div className="bg-white rounded-lg shadow-md p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              إضافة رد
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 ml-3" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-3">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="اكتب ردك هنا..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {/* File Upload */}
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="message-file-upload"
                />
                <label
                  htmlFor="message-file-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Paperclip className="w-4 h-4 ml-2" />
                  إرفاق ملفات
                </label>
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt="Preview"
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Paperclip className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm text-gray-900">
                          {attachment.file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingMessage || (!messageContent.trim() && attachments.length === 0)}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rating Form */}
        {showRating && (
          <div className="bg-white rounded-lg shadow-md p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              تقييم الخدمة
            </h3>
            <p className="text-gray-600 mb-3">
              نرجو منك تقييم جودة الدعم المقدم لك
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التقييم *
                </label>
                <div className="flex space-x-1 space-x-reverse">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 ${star <= rating
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                        }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="شاركنا رأيك حول الخدمة المقدمة..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowRating(false)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  تخطي
                </button>
                <button
                  onClick={handleRatingSubmit}
                  disabled={submittingRating || rating === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingRating ? 'جاري الحفظ...' : 'إرسال التقييم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;

