import { apiClient } from './apiClient';

/**
 * Support Service
 * Handles user tickets, support staff interactions, and FAQs
 * Uses standardized apiClient for all requests
 */

// Types
export interface AttachmentFile {
    file: File;
    preview?: string;
}

export interface Ticket {
    _id: string;
    ticketId: string;
    subject: string;
    category: string;
    priority: string;   // low, medium, high, critical
    status: string;
    assignedTo?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
    rating?: number;
    feedback?: string;
    messages: Message[];
    userId: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface Message {
    _id: string;
    sender: {
        _id: string;
        name: string;
        email: string;
    };
    senderType: 'user' | 'admin';
    isInternal?: boolean;
    content: string;
    attachments: Array<{
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
    }>;
    createdAt: string;
}

export interface FAQ {
    _id: string;
    question: string;
    answer: string;
    category: string;
    helpful: number;
    notHelpful: number;
    isActive: boolean;
    tags?: string[];
    createdAt: string;
}

export interface TicketStats {
    _id: string;
    count: number;
}

const supportService = {
    // Tickets
    createTicket: async (formData: FormData) => {
        const response = await apiClient.post('/support/tickets', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getUserTickets: async (params?: URLSearchParams) => {
        const response = await apiClient.get('/support/tickets', {
            params: params ? Object.fromEntries(params.entries()) : undefined
        });
        return response.data;
    },

    getTicketDetails: async (ticketId: string) => {
        const response = await apiClient.get(`/support/tickets/${ticketId}`);
        return response.data;
    },

    addMessage: async (ticketId: string, formData: FormData) => {
        const response = await apiClient.post(`/support/tickets/${ticketId}/messages`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    rateTicket: async (ticketId: string, data: { rating: number; feedback?: string }) => {
        const response = await apiClient.post(`/support/tickets/${ticketId}/rate`, data);
        return response.data;
    },

    // Admin Tickets
    getAllTickets: async (params?: URLSearchParams) => {
        const response = await apiClient.get('/support/admin/tickets', {
            params: params ? Object.fromEntries(params.entries()) : undefined
        });
        return response.data;
    },

    updateTicketStatus: async (ticketId: string, status: string) => {
        const response = await apiClient.patch(`/support/tickets/${ticketId}/status`, { status });
        return response.data;
    },

    updateTicketPriority: async (ticketId: string, priority: string) => {
        const response = await apiClient.patch(`/support/tickets/${ticketId}/priority`, { priority });
        return response.data;
    },

    updateTicket: async (ticketId: string, data: any) => {
        const response = await apiClient.patch(`/support/tickets/${ticketId}`, data);
        return response.data;
    },

    getUserTicketHistory: async (userId: string, excludeTicketId?: string) => {
        const response = await apiClient.get(`/support/admin/users/${userId}/tickets`, {
            params: { excludeTicketId }
        });
        return response.data;
    },

    getAdminUserTicketHistory: async (userId: string, excludeTicketId?: string) => {
        const response = await apiClient.get(`/support/admin/users/${userId}/tickets`, {
            params: { excludeTicketId }
        });
        return response.data;
    },

    getSupportStaff: async () => {
        const response = await apiClient.get('/support/admin/staff');
        return response.data;
    },

    // FAQs
    getFAQs: async (params?: URLSearchParams | any) => {
        // Support both URLSearchParams and plain objects
        const queryParams = params instanceof URLSearchParams
            ? Object.fromEntries(params.entries())
            : params;

        const response = await apiClient.get('/support/faq', {
            params: queryParams
        });
        return response.data;
    },

    getFAQCategories: async () => {
        const response = await apiClient.get('/support/faq/categories');
        return response.data;
    },

    rateFAQ: async (faqId: string, helpful: boolean) => {
        const response = await apiClient.post(`/support/faq/${faqId}/rate`, { helpful });
        return response.data;
    },

    // Admin FAQs
    createFAQ: async (data: any) => {
        const response = await apiClient.post('/support/admin/faq', data);
        return response.data;
    },

    updateFAQ: async (faqId: string, data: any) => {
        const response = await apiClient.put(`/support/admin/faq/${faqId}`, data);
        return response.data;
    },

    deleteFAQ: async (faqId: string) => {
        const response = await apiClient.delete(`/support/admin/faq/${faqId}`);
        return response.data;
    },

    getAdminFAQs: async () => {
        const response = await apiClient.get('/support/admin/faq');
        return response.data;
    }
};

export default supportService;
