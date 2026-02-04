import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supportService, { Ticket } from '../../services/supportService';
import TicketsSidebar from './components/TicketsSidebar';
import ChatArea from './components/ChatArea';
import DetailsPanel from './components/DetailsPanel';
import { useAuth } from '../../hooks/useAuthSimple';

const MyTickets: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);

  // Get ticket ID from URL
  const ticketIdFromUrl = searchParams.get('ticket');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find(t => t.ticketId === ticketIdFromUrl);
      if (ticket) {
        handleTicketSelect(ticketIdFromUrl);
      }
    } else if (tickets.length > 0 && !activeTicket) {
      // Auto-select first ticket
      handleTicketSelect(tickets[0].ticketId);
    }
  }, [ticketIdFromUrl, tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100' // Get all tickets for sidebar
      });

      const data = await supportService.getUserTickets(params);

      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSelect = async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setSearchParams({ ticket: ticketId });
      
      const data = await supportService.getTicketDetails(ticketId);
      
      if (data.success) {
        setActiveTicket(data.ticket);
        
        // Fetch user history if admin
        if (user?.role === 'SUPER_ADMIN' && data.ticket.userId) {
          fetchUserHistory(data.ticket.userId._id || data.ticket.userId.id, ticketId);
        }
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchUserHistory = async (userId: string, currentTicketId: string) => {
    try {
      const data = await supportService.getUserTicketHistory(userId, currentTicketId);
      if (data.success) {
        setUserHistory(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching user history:', error);
    }
  };

  const handleSendMessage = async (content: string, attachments: File[]) => {
    if (!activeTicket) return;

    try {
      const formData = new FormData();
      formData.append('content', content);
      attachments.forEach(file => formData.append('attachments', file));

      const data = await supportService.addMessage(activeTicket.ticketId, formData);
      
      if (data.success) {
        // Refresh ticket details
        const updatedData = await supportService.getTicketDetails(activeTicket.ticketId);
        if (updatedData.success) {
          setActiveTicket(updatedData.ticket);
          // Update ticket in list
          setTickets(prev => prev.map(t => 
            t.ticketId === activeTicket.ticketId ? updatedData.ticket : t
          ));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!activeTicket) return;

    try {
      const data = await supportService.updateTicketStatus(activeTicket.ticketId, status);
      
      if (data.success) {
        setActiveTicket(prev => prev ? { ...prev, status } : null);
        setTickets(prev => prev.map(t => 
          t.ticketId === activeTicket.ticketId ? { ...t, status } : t
        ));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!activeTicket) return;

    try {
      const data = await supportService.updateTicketPriority(activeTicket.ticketId, priority);
      
      if (data.success) {
        setActiveTicket(prev => prev ? { ...prev, priority } : null);
        setTickets(prev => prev.map(t => 
          t.ticketId === activeTicket.ticketId ? { ...t, priority } : t
        ));
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleNewTicket = () => {
    navigate('/support/tickets/new');
  };


  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Tickets Sidebar */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <TicketsSidebar
            tickets={tickets}
            activeTicketId={activeTicket?.ticketId || null}
            onTicketSelect={handleTicketSelect}
            onNewTicket={handleNewTicket}
            loading={loading}
          />
        </div>

        {/* Column 2: Chat Area */}
        <div className="flex-1 min-w-0">
          <ChatArea
            ticket={activeTicket}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            loading={ticketLoading}
          />
        </div>

        {/* Column 3: Details Panel */}
        <div className={`w-80 flex-shrink-0 hidden xl:block ${!showDetailsPanel ? 'hidden' : ''}`}>
          <DetailsPanel
            ticket={activeTicket}
            userHistory={userHistory}
          />
        </div>
      </div>

      {/* Mobile: Show sidebar as overlay */}
      <div className="lg:hidden">
        {/* Mobile implementation can be added later */}
      </div>
    </div>
  );
};

export default MyTickets;

