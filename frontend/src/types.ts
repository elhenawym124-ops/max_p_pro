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
  messages?: Message[]; // Make messages optional
  customerOrders?: any[];
  lastRepliedBy?: string;
  aiEnabled?: boolean;
}

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

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  createdAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profilePic?: string;
}