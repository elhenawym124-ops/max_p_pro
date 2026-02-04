import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Download, User, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Ticket } from '../../../services/supportService';

interface ChatAreaProps {
  ticket: Ticket | null;
  onSendMessage: (content: string, attachments: File[]) => Promise<void>;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  loading: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  ticket,
  onSendMessage,
  onStatusChange,
  onPriorityChange,
  loading
}) => {
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      await onSendMessage(messageContent, attachments);
      setMessageContent('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">اختر تذكرة لعرض المحادثة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {ticket.subject}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              #{ticket.ticketId}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <div className="flex items-center gap-2">
            {getStatusIcon(ticket.status)}
            <select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">مفتوح</option>
              <option value="in_progress">قيد المعالجة</option>
              <option value="closed">مغلق</option>
            </select>
          </div>

          {/* Priority */}
          <select
            value={ticket.priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(ticket.priority)}`}
          >
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="critical">حرجة</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : ticket.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>لا توجد رسائل بعد</p>
          </div>
        ) : (
          ticket.messages.map((message, index) => {
            const isCurrentUser = message.senderType === 'user';
            const isInternal = message.isInternal;

            return (
              <div
                key={message._id || index}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    isInternal
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200'
                      : isCurrentUser
                      ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-none'
                  }`}
                >
                  {/* Sender Info */}
                  {!isCurrentUser && (
                    <div className="flex items-center gap-2 mb-2">
                      {message.senderType === 'admin' ? (
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {message.sender?.name || 'مجهول'}
                      </span>
                      {isInternal && (
                        <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">
                          ملاحظة داخلية
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          {att.originalName}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] mt-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="إرفاق ملف"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="اكتب رسالتك..."
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />

          <button
            onClick={handleSend}
            disabled={sending || (!messageContent.trim() && attachments.length === 0)}
            className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="إرسال"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
