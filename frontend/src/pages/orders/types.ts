export interface OrderItem {
    id: string;
    productId?: string;
    productName: string;
    productColor?: string;
    productSize?: string;
    productDetails?: string;
    productImage?: string;
    price: number;
    quantity: number;
    total: number;
    metadata?: any;
}

export interface OrderNote {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
    author?: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
}

export interface OrderStatusHistory {
    status: string;
    notes?: string;
    createdAt: string;
    updatedBy?: string;
}

export interface OrderDetailsType {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    alternativePhone?: string;
    customerAddress?: string;
    city?: string;
    country?: string;
    shippingAddress?: string | object | any; // JSON string or parsed object
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
    paymentMethod: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
    confidence?: number;
    extractionMethod?: string;
    conversationId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    statusHistory?: OrderStatusHistory[];
    customerRating?: string;
    customerSuccessScore?: number;

    // Order Source Fields
    sourceType?: string;
    orderSource?: string;
    createdBy?: string;
    createdByName?: string;
    createdByUser?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatar?: string;
    };
    conversation?: {
        id: string;
        channel: string;
    };
    affiliateId?: string;
    affiliate?: {
        id: string;
        affiliateCode?: string;
        status?: string;
        user?: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
    metadata?: any;

    // Turbo Shipping Fields
    turboShipmentId?: string;
    turboTrackingNumber?: string;
    turboShipmentStatus?: string;
    turboLabelUrl?: string;
    turboBranchId?: string;

    // Scheduled Order Fields
    isScheduled?: boolean;
    scheduledDeliveryDate?: string;
    scheduledNotes?: string;
    autoTransitionEnabled?: boolean;
    scheduledTransitionedAt?: string;

    orderNotes?: OrderNote[];
}

export interface Government {
    id: number;
    name: string;
}

export interface Area {
    id: number;
    name: string;
}
