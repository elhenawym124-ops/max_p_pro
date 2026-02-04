import React from 'react';
import { Calendar, Tag, User, Mail, Clock, Star, TrendingUp } from 'lucide-react';
import { Ticket } from '../../../services/supportService';

interface DetailsPanelProps {
  ticket: Ticket | null;
  userHistory?: any[];
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ ticket, userHistory }) => {
  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد تفاصيل</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'billing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'inquiry':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'suggestion':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'complaint':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      open: 'مفتوح',
      in_progress: 'قيد المعالجة',
      closed: 'مغلق'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      critical: 'حرجة',
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة'
    };
    return priorityMap[priority] || priority;
  };

  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      technical: 'تقني',
      billing: 'فواتير',
      inquiry: 'استفسار',
      suggestion: 'اقتراح',
      complaint: 'شكوى'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 space-y-6">
        {/* Ticket Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            معلومات التذكرة
          </h3>

          <div className="space-y-3">
            {/* Ticket ID */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                رقم التذكرة
              </label>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white">
                  {ticket.ticketId}
                </code>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                الحالة
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {getStatusText(ticket.status)}
              </span>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                الأولوية
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {getPriorityText(ticket.priority)}
              </span>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                النوع
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(ticket.category)}`}>
                {getCategoryText(ticket.category)}
              </span>
            </div>

            {/* Created Date */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                تاريخ الإنشاء
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(ticket.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Last Update */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                آخر تحديث
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(ticket.updatedAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Assigned To */}
            {ticket.assignedTo && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  مُعيّن إلى
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.assignedTo.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ticket.assignedTo.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {ticket.userId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              معلومات المستخدم
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  الاسم
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {ticket.userId.name || 'غير محدد'}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  البريد الإلكتروني
                </label>
                <p className="text-sm text-gray-900 dark:text-white break-all">
                  {ticket.userId.email || 'غير محدد'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rating */}
        {ticket.rating && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4" />
              التقييم
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= ticket.rating!
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>

              {ticket.feedback && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    الملاحظات
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {ticket.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User History */}
        {userHistory && userHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              سجل التذاكر السابقة
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إجمالي التذاكر: {userHistory.length}
              </p>
              <div className="space-y-1">
                {userHistory.slice(0, 5).map((historyTicket) => (
                  <div
                    key={historyTicket._id}
                    className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {historyTicket.subject}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {new Date(historyTicket.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;
