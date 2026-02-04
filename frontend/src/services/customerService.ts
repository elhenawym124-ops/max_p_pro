import { apiClient } from './apiClient';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tags: string[];
  notes?: string;
  source?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
    orders: number;
    notes_rel: number;
  };
  successScore?: number;
  customerRating?: string;
}

interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface CustomerStats {
  conversationsCount: number;
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  lastConversationDate?: string;
  customerLifetimeValue: number;
  daysSinceLastOrder?: number;
  daysSinceLastContact?: number;
}

interface CustomerSegments {
  total: number;
  active: number;
  leads: number;
  vip: number;
  recent: number;
  segments: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tags?: string[];
  notes?: string;
  source?: string;
}

interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: string;
}

interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CustomerService {
  /**
   * Get customers with pagination and filtering
   */
  async getCustomers(filters: CustomerFilters = {}): Promise<{
    data: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/customers?${params.toString()}`);
    return response.data;
  }

  /**
   * Get customer by ID
   */
  async getCustomer(id: string): Promise<Customer> {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data.data;
  }

  /**
   * Create new customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const response = await apiClient.post('/customers', data);
    return response.data.data;
  }

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  }

  /**
   * Search customers
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await apiClient.get(`/customers/search?q=${encodeURIComponent(query)}`);
    return response.data.data;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(id: string): Promise<CustomerStats> {
    const response = await apiClient.get(`/customers/${id}/stats`);
    return response.data.data;
  }

  /**
   * Get customer interactions
   */
  async getCustomerInteractions(id: string, page = 1, limit = 20): Promise<{
    conversations: any[];
    orders: any[];
    notes: CustomerNote[];
  }> {
    const response = await apiClient.get(`/customers/${id}/interactions?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Add customer note
   */
  async addCustomerNote(customerId: string, content: string): Promise<CustomerNote> {
    const response = await apiClient.post(`/customers/${customerId}/notes`, { content });
    return response.data.data;
  }

  /**
   * Get customer notes
   */
  async getCustomerNotes(customerId: string, page = 1, limit = 20): Promise<CustomerNote[]> {
    const response = await apiClient.get(`/customers/${customerId}/notes?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get customer segments
   */
  async getCustomerSegments(): Promise<CustomerSegments> {
    const response = await apiClient.get('/customers/segments');
    return response.data.data;
  }

  /**
   * Export customers
   */
  async exportCustomers(format: 'csv' | 'json' = 'csv', filters: CustomerFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    params.append('format', format);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    await apiClient.download(`/customers/export?${params.toString()}`, `customers.${format}`);
  }

  /**
   * Get customer status options
   */
  getStatusOptions(): Array<{ value: string; label: string; color: string }> {
    return [
      { value: 'LEAD', label: 'عميل محتمل', color: 'yellow' },
      { value: 'ACTIVE', label: 'عميل نشط', color: 'green' },
      { value: 'INACTIVE', label: 'عميل غير نشط', color: 'gray' },
      { value: 'VIP', label: 'عميل مميز', color: 'purple' },
      { value: 'BLOCKED', label: 'محظور', color: 'red' },
    ];
  }

  /**
   * Get customer source options
   */
  getSourceOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'website', label: 'الموقع الإلكتروني' },
      { value: 'facebook', label: 'فيسبوك' },
      { value: 'instagram', label: 'إنستغرام' },
      { value: 'whatsapp', label: 'واتساب' },
      { value: 'phone', label: 'مكالمة هاتفية' },
      { value: 'email', label: 'بريد إلكتروني' },
      { value: 'referral', label: 'إحالة' },
      { value: 'other', label: 'أخرى' },
    ];
  }

  /**
   * Get customer tag suggestions
   */
  getTagSuggestions(): string[] {
    return [
      'vip',
      'متكرر',
      'جديد',
      'مهم',
      'متابعة',
      'مهتم',
      'غير مهتم',
      'محتمل',
      'مؤكد',
      'ملغي',
    ];
  }
}

export const customerService = new CustomerService();
export type { Customer, CustomerNote, CustomerStats, CustomerSegments, CreateCustomerData, UpdateCustomerData, CustomerFilters };
