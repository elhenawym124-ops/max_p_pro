import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuthSimple';
import { config } from '../config';

/**
 * Socket.IO Hook and Context
 * 
 * Provides real-time communication throughout the application
 */

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(config.wsUrl, {
      auth: {
        token: localStorage.getItem('accessToken') || localStorage.getItem('token'),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // 🔐 Send user_join with company isolation support
      if (user) {
        const userJoinData = {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
          companyId: user.companyId
        };
        
        console.log('🏢 [SOCKET-CONTEXT] Sending user_join with company isolation:', userJoinData);
        newSocket.emit('user_join', userJoinData);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setIsConnected(false);
    });

    // Authentication events
    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    newSocket.on('unauthorized', (error) => {
      console.error('Socket authentication failed:', error);
      newSocket.disconnect();
    });

    // Global event handlers
    newSocket.on('notification', (notification) => {
      // Handle global notifications
      console.log('Received notification:', notification);
      
      // You can dispatch to a notification store or show toast
      // notificationStore.addNotification(notification);
    });

    newSocket.on('system_announcement', (announcement) => {
      // Handle system announcements
      console.log('System announcement:', announcement);
    });

    newSocket.on('user_status_changed', (data) => {
      // Handle user status changes
      console.log('User status changed:', data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  // Helper functions
  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  const joinRoom = (room: string) => {
    emit('join_room', room);
  };

  const leaveRoom = (room: string) => {
    emit('leave_room', room);
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
