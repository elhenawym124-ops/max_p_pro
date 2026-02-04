import { apiClient } from './apiClient';

export interface ReturnReason {
    id: string;
    reason: string;
    description?: string;
    categoryId?: string;
    isActive: boolean;
    createdAt: string;
    category?: ReturnReasonCategory;
}

export interface ReturnReasonCategory {
    id: string;
    name: string;
    defaultRole: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER';
    isActive: boolean;
    createdAt: string;
    reasons?: ReturnReason[];
}

export interface ReturnRequest {
    id: string;
    orderId: string;
    customerId: string;
    reasonId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    adminNotes?: string;
    customerNotes?: string;
    refundAmount?: number;
    assignedTo?: string;
    responsibleParty: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER';
    isReviewed: boolean;
    reviewedAt?: string;
    reviewedBy?: string;
    rejectionReason?: string;
    createdAt: string;
    customer?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        successScore: number;
        customerRating: string;
    };
    order?: {
        orderNumber: string;
        total: number;
        currency: string;
    };
    reason?: ReturnReason;
    assignedUser?: {
        firstName: string;
        lastName: string;
    };
}

export const returnService = {
    getRequests: (params?: { status?: string; orderId?: string; customerId?: string; isReviewed?: boolean }) => apiClient.get<ReturnRequest[]>('/returns/requests', { params }),
    createRequest: (data: any) => apiClient.post('/returns/requests', data),
    updateRequest: (id: string, data: any) => apiClient.put(`/returns/requests/${id}`, data),
    analyzeReturn: (id: string) => apiClient.post<any>(`/returns/requests/${id}/analyze`),

    // Categories
    getCategories: () => apiClient.get<ReturnReasonCategory[]>('/returns/categories'),
    createCategory: (data: { name: string; defaultRole: string }) => apiClient.post('/returns/categories', data),
    updateCategory: (id: string, data: any) => apiClient.put(`/returns/categories/${id}`, data),

    // Reasons (Updated with categoryId)
    getReasons: () => apiClient.get<ReturnReason[]>('/returns/reasons'),
    createReason: (data: { reason: string; description?: string; categoryId?: string }) => apiClient.post('/returns/reasons', data),
    updateReason: (id: string, data: any) => apiClient.put(`/returns/reasons/${id}`, data),
    deleteReason: (id: string) => apiClient.delete(`/returns/reasons/${id}`),

    // Settings
    getSettings: () => apiClient.get('/returns/settings'),
    updateSettings: (data: any) => apiClient.put('/returns/settings', data),

    // Details & Logs
    addContactAttempt: (id: string, data: { method: string; result: string; notes?: string }) => apiClient.post(`/returns/requests/${id}/contact`, data),
    getContactHistory: (id: string) => apiClient.get<ContactAttempt[]>(`/returns/requests/${id}/contacts`),
    getActivityLog: (id: string) => apiClient.get<ActivityLog[]>(`/returns/requests/${id}/activity`),
};

export interface ContactAttempt {
    id: string;
    method: string;
    result: string;
    notes?: string;
    createdAt: string;
    user?: { firstName: string; lastName: string };
}

export interface ActivityLog {
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user?: { firstName: string; lastName: string };
}
