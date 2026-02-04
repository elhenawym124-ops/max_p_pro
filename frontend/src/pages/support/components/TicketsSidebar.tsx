import React, { useState } from 'react';
import { Plus, Search, Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { Ticket } from '../../../services/supportService';

interface TicketsSidebarProps {
  tickets: Ticket[];
  activeTicketId: string | null;
  onTicketSelect: (ticketId: string) => void;
  onNewTicket: () => void;
  loading: boolean;
}

type TabType = 'open' | 'in_progress' | 'closed' | 'all';

const TicketsSidebar: React.FC<TicketsSidebarProps> = ({
  tickets,
  activeTicketId,
  onTicketSelect,
  onNewTicket,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-3 h-3" />;
      case 'in_progress':
        return <AlertCircle className="w-3 h-3" />;
      case 'closed':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-orange-500 dark:text-orange-400';
      case 'in_progress':
        return 'text-blue-500 dark:text-blue-400';
      case 'closed':
        return 'text-green-500 dark:text-green-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = activeTab === 'all' || ticket.status === activeTab;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTabCount = (tab: TabType) => {
    if (tab === 'all') return tickets.length;
    return tickets.filter(t => t.status === tab).length;
  };

  const getLastMessage = (ticket: Ticket) => {
    if (ticket.messages.length === 0) return 'لا توجد رسائل';
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    return lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return then.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">التذاكر</h2>
          <button
            onClick={onNewTicket}
            className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            title="تذكرة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="البحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
        {[
          { key: 'all' as TabType, label: 'الكل' },
          { key: 'open' as TabType, label: 'مفتوح' },
          { key: 'in_progress' as TabType, label: 'قيد المعالجة' },
          { key: 'closed' as TabType, label: 'مغلق' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            <span className={`mr-1 text-xs ${
              activeTab === tab.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              ({getTabCount(tab.key)})
            </span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">لا توجد تذاكر</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map(ticket => (
              <button
                key={ticket._id}
                onClick={() => onTicketSelect(ticket.ticketId)}
                className={`w-full text-right p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  activeTicketId === ticket.ticketId
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600 dark:border-blue-400'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {ticket.subject}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      #{ticket.ticketId}
                    </p>
                  </div>
                  <div className={`flex items-center mr-2 ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {getLastMessage(ticket)}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {getRelativeTime(ticket.updatedAt)}
                  </span>
                  {ticket.messages.length > 0 && (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-3 h-3 ml-1" />
                      <span>{ticket.messages.length}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsSidebar;
