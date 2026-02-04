import { apiClient } from './apiClient';

export interface BulkSearchRequest {
    searchType: 'orderNumber' | 'phone';
    values: string[];
}

export interface BulkSearchStats {
    total: number;
    found: number;
    notFound: number;
    ordersCount: number;
}

export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product?: {
        id: string;
        name: string;
        sku: string;
    };
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
    customer?: Customer;
    orderItems?: OrderItem[];
}

export interface BulkSearchResponse {
    success: boolean;
    data: {
        orders: Order[];
        notFoundValues: string[];
        stats: BulkSearchStats;
        searchType: 'orderNumber' | 'phone';
    };
}

export const bulkSearchService = {
    /**
     * البحث الجماعي عن الطلبات
     */
    bulkSearch: async (searchType: 'orderNumber' | 'phone', values: string[]): Promise<BulkSearchResponse> => {
        const response = await apiClient.post<BulkSearchResponse>('/orders/bulk-search', {
            searchType,
            values
        });
        return response.data;
    },

    /**
     * تنظيف وتحليل المدخلات
     */
    parseInput: (input: string): string[] => {
        // تقسيم النص حسب الأسطر والفواصل
        const lines = input.split(/[\n,;]+/);
        
        // تنظيف كل قيمة
        const cleaned = lines
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        // إزالة التكرار
        return [...new Set(cleaned)];
    },

    /**
     * التحقق من صحة رقم التليفون
     */
    validatePhone: (phone: string): boolean => {
        // تنسيق بسيط للتحقق من أرقام التليفونات المصرية والسعودية
        const phoneRegex = /^(\+?20|0)?1[0-9]{9}$|^(\+?966|0)?5[0-9]{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    /**
     * تصدير النتائج إلى CSV
     */
    exportToCSV: (orders: Order[], searchType: string): void => {
        const headers = ['Order Number', 'Customer Name', 'Phone', 'Email', 'Status', 'Total', 'Currency', 'Date'];
        const rows = orders.map(order => [
            order.orderNumber,
            order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '',
            order.customer?.phone || '',
            order.customer?.email || '',
            order.status,
            order.total.toFixed(2),
            order.currency || 'EGP',
            new Date(order.createdAt).toLocaleDateString('ar-EG')
        ]);

        // تنظيف الخلايا من الأحرف الخاصة
        const escapeCsvCell = (cell: string): string => {
            // إذا كانت الخلية تحتوي على فواصل أو علامات تنصيص أو أسطر جديدة
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                // استبدال علامات التنصيص المزدوجة بعلامتين
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        };

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => escapeCsvCell(cell)).join(','))
        ].join('\n');

        // إضافة BOM للدعم الكامل للعربية في Excel
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `bulk_search_${searchType}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * نسخ النتائج إلى الحافظة
     */
    copyToClipboard: async (orders: Order[]): Promise<boolean> => {
        try {
            const text = orders.map(order => 
                `${order.orderNumber}\t${order.customer?.firstName || ''} ${order.customer?.lastName || ''}\t${order.customer?.phone || ''}\t${order.status}\t${order.total} ${order.currency || 'EGP'}`
            ).join('\n');
            
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }
};
