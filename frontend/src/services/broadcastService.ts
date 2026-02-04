import { authService } from './authService';
import { buildApiUrl } from '../utils/urlHelper';

const API_BASE_URL = buildApiUrl('');

interface CampaignData {
  name: string;
  message: string;
  targetAudience: string;
  scheduledAt?: string | undefined;
  scheduledTime?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  includeImages: boolean;
  trackClicks: boolean;
  autoResend: boolean;
  sendNow: boolean;
  images: string[];
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  targetAudience: string;
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled' | string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  failedCount: number;
  openRate?: number;
  clickRate?: number;
  priority: string;
  includeImages: boolean;
  trackClicks: boolean;
  autoResend: boolean;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface CustomerList {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: any;
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean;
}

interface BroadcastAnalytics {
  totalCampaigns: number;
  activeCampaigns?: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  totalRevenue: number;
  bestPerformingTime: string;
  campaignsThisMonth?: number;
  campaignMetrics: Array<{
    campaignId: string;
    campaignName: string;
    sentAt: string;
    recipientCount: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }>;
}

interface BroadcastSettings {
  id: string;
  companyId: string;
  defaultSendTime: string;
  timezone: string;
  maxRecipientsPerCampaign: number;
  maxCampaignsPerDay: number;
  enableDeliveryReports: boolean;
  enableOpenTracking: boolean;
  enableClickTracking: boolean;
  enableUnsubscribeTracking: boolean;
  notifyOnCampaignSent: boolean;
  notifyOnHighUnsubscribeRate: boolean;
  notifyOnLowDeliveryRate: boolean;
  adminEmail?: string;
  requireApprovalForHighVolume: boolean;
  highVolumeThreshold: number;
  enableContentFiltering: boolean;
  blockedWords: string[];
  messagesPerMinute: number;
  messagesPerHour: number;
  messagesPerDay: number;
  defaultFooter?: string;
  unsubscribeText: string;
  companyName?: string;
  companyAddress?: string;
}

class BroadcastService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = authService.getAccessToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Campaign methods
  async createCampaign(campaignData: FormData): Promise<Campaign> {
    const token = authService.getAccessToken();
    
    // 🚀 Create AbortController with 60 second timeout for campaign creation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
    
    try {
      const response = await fetch(`${API_BASE_URL}/broadcast/campaigns`, {
        method: 'POST',
        body: campaignData,
        headers: {
          'Authorization': `Bearer ${token}`
          // لا تضع Content-Type هنا، المتصفح يحددها تلقائياً مع FormData
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الطلب. قد تكون الحملة قيد الإرسال في الخلفية.');
      }
      throw error;
    }
  }

  async getCampaigns(filters?: any, pagination?: any): Promise<{
    campaigns: Campaign[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
    }
    
    if (pagination) {
      if (pagination.page) params.append('page', pagination.page.toString());
      if (pagination.limit) params.append('limit', pagination.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = `/broadcast/campaigns${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    return this.makeRequest(`/broadcast/campaigns/${campaignId}`);
  }

  async updateCampaign(campaignId: string, updateData: Partial<CampaignData>): Promise<Campaign> {
    return this.makeRequest(`/broadcast/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async cancelCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/broadcast/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  }

  async pauseCampaign(campaignId: string): Promise<Campaign> {
    return this.makeRequest(`/broadcast/campaigns/${campaignId}/pause`, {
      method: 'POST',
    });
  }

  async resumeCampaign(campaignId: string): Promise<Campaign> {
    return this.makeRequest(`/broadcast/campaigns/${campaignId}/resume`, {
      method: 'POST',
    });
  }

  async sendCampaign(campaignId: string): Promise<{
    success: boolean;
    message: string;
    campaignId: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
  }> {
    const token = authService.getAccessToken();
    
    // 🚀 Create AbortController with 90 second timeout for sending
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds
    
    try {
      const response = await fetch(`${API_BASE_URL}/broadcast/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الإرسال. الحملة قيد المعالجة في الخلفية - راقب التقدم في الشاشة.');
      }
      throw error;
    }
  }

  // Analytics methods
  async getAnalytics(period: string = '30d'): Promise<BroadcastAnalytics> {
    return this.makeRequest(`/broadcast/analytics?period=${period}`);
  }

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    return this.makeRequest(`/broadcast/analytics/${campaignId}`);
  }

  // Customer lists methods
  async createCustomerList(listData: { name: string; description: string; criteria: any }): Promise<CustomerList> {
    return this.makeRequest('/broadcast/customer-lists', {
      method: 'POST',
      body: JSON.stringify(listData),
    });
  }

  async getCustomerLists(): Promise<CustomerList[]> {
    return this.makeRequest('/broadcast/customer-lists');
  }

  async getCustomersInList(listId: string): Promise<any[]> {
    return this.makeRequest(`/broadcast/customer-lists/${listId}/customers`);
  }

  // Settings methods
  async getSettings(): Promise<BroadcastSettings> {
    return this.makeRequest('/broadcast/settings');
  }

  async updateSettings(settings: Partial<BroadcastSettings>): Promise<BroadcastSettings> {
    return this.makeRequest('/broadcast/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Utility methods
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = authService.getAccessToken();
    
    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return response.json();
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.makeRequest('/broadcast/campaigns?limit=1');
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const broadcastService = new BroadcastService();
export type { Campaign, CampaignData, CustomerList, BroadcastAnalytics, BroadcastSettings };
