import { apiClient as globalApiClient } from './apiClient';

/**
 * API Service for Conversations and Customer Management
 * Uses standardized apiClient for all requests
 */

// Local apiClient alias for easier refactoring of existing methods
const apiClient = globalApiClient;

// أنواع البيانات
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'voice';
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  repliedBy?: string;
  isFacebookReply?: boolean; // إضافة معلومة الردود من فيسبوك
  facebookMessageId?: string; // إضافة معرف رسالة فيسبوك
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  platform: 'facebook' | 'whatsapp' | 'telegram' | 'unknown';
  status: 'new' | 'active' | 'archived' | 'important';
  messages: Message[];
  customerOrders?: any[];
  lastRepliedBy?: string;
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: 'welcome' | 'thanks' | 'apology' | 'followup' | 'closing' | 'custom';
  createdAt: Date;
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  lastOrder?: any;
  customerSince: Date;
  notes?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  createdAt: Date;
  items: OrderItem[];
}

// خدمات API
export const apiService = {
  // جلب المحادثات
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get('/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // جلب الرسائل لمحادثة معينة
  async getMessages(conversationId: string, includeFacebookReplies: boolean = true): Promise<Message[]> {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
        params: { includeFacebookReplies }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // إرسال رسالة
  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
    try {
      const response = await apiClient.post('/messages', message);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // جلب الردود المحفوظة
  async getSavedReplies(): Promise<SavedReply[]> {
    try {
      const response = await apiClient.get('/saved-replies');
      return response.data;
    } catch (error) {
      console.error('Error fetching saved replies:', error);
      throw error;
    }
  },

  // إنشاء رد محفوظ
  async createSavedReply(reply: Omit<SavedReply, 'id' | 'createdAt'>): Promise<SavedReply> {
    try {
      const response = await apiClient.post('/saved-replies', reply);
      return response.data;
    } catch (error) {
      console.error('Error creating saved reply:', error);
      throw error;
    }
  },

  // حذف رد محفوظ
  async deleteSavedReply(id: string): Promise<void> {
    try {
      await apiClient.delete(`/saved-replies/${id}`);
    } catch (error) {
      console.error('Error deleting saved reply:', error);
      throw error;
    }
  },

  // جلب ملف العميل
  async getCustomerProfile(customerId: string): Promise<CustomerProfile> {
    try {
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      throw error;
    }
  },

  // حذف محادثة
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // جلب معلومات مستخدم Facebook
  async getFacebookUserProfile(userId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/facebook/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Facebook user profile:', error);
      throw error;
    }
  },

  // جلب طلبات العميل
  async getCustomerOrders(customerId: string): Promise<Order[]> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/orders`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      // إرجاع مصفوفة فارغة بدلاً من رمي خطأ لتجنب تعطيل المكون
      return [];
    }
  },

  // 🚫 حظر عميل على صفحة فيس بوك
  async blockCustomerOnPage(customerId: string, pageId: string, reason?: string): Promise<any> {
    try {
      const response = await apiClient.post('/customers/block', {
        customerId,
        pageId,
        reason
      });
      return response.data;
    } catch (error: any) {
      console.error('Error blocking customer:', error);
      throw new Error(error.response?.data?.message || 'فشل حظر العميل');
    }
  },

  // ✅ إلغاء حظر عميل على صفحة فيس بوك
  async unblockCustomerOnPage(customerId: string, pageId: string): Promise<any> {
    try {
      const response = await apiClient.post('/customers/unblock', {
        customerId,
        pageId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error unblocking customer:', error);
      throw new Error(error.response?.data?.message || 'فشل إلغاء حظر العميل');
    }
  },

  // 📋 جلب قائمة العملاء المحظورين على صفحة معينة
  async getBlockedCustomersOnPage(pageId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/customers/blocked/${pageId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching blocked customers:', error);
      throw error;
    }
  },

  // 🔍 التحقق من حالة حظر عميل على صفحة معينة
  async checkCustomerBlockStatus(customerId: string, pageId: string): Promise<{ isBlocked: boolean; data?: any }> {
    try {
      const response = await apiClient.get('/customers/block-status', {
        params: { customerId, pageId }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking block status:', error);
      throw error;
    }
  }
};

export default apiService;