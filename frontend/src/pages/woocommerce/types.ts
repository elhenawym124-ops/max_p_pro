export interface ImportJob {
    jobId: string;
    type: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    progress: {
        currentPage: number;
        currentBatch: number;
        totalPages: number;
        totalBatches: number;
        processedOrders: number;
        grandTotal: number;
        imported: number;
        updated: number;
        skipped: number;
        failed: number;
        percentage: number;
        status?: string;
        createdAt: string;
        completedAt?: string;
        error?: string;
    };
    result?: {
        imported: number;
        updated: number;
        failed: number;
        skipped: number;
    };
    nextBatchTimeout?: NodeJS.Timeout;
}

export interface WooOrder {
    wooCommerceId: string;
    orderNumber: string;
    status: string;
    wooCommerceStatus: string;
    localStatus?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    total: number;
    currency: string;
    items: any[];
    wooCommerceDateCreated: string;
}

export interface ProductAttribute {
    id?: number;
    name: string;
    option: string;
    type: 'color' | 'size' | 'material' | 'style' | 'other';
    colorHex?: string | null;
}

export interface WooProductVariation {
    wooCommerceVariationId: string;
    name: string;
    type: 'color' | 'size' | 'material' | 'style' | 'composite' | 'other';
    sku?: string | null;
    price: number;
    comparePrice?: number | null;
    salePrice?: number | null;
    stock: number;
    trackInventory: boolean;
    images: string[];
    isActive: boolean;
    weight?: number | null;
    dimensions?: any;
    attributes: ProductAttribute[];
    hasMultipleAttributes?: boolean;
    attributeTypes?: string[];
}

export interface WooProduct {
    wooCommerceId: string;
    name: string;
    description: string;
    price: number;
    comparePrice?: number;
    sku?: string;
    stock: number;
    images: string[];
    category?: string;
    isActive: boolean;

    // حقول المتغيرات
    isVariable?: boolean;
    variations?: WooProductVariation[];
    variationsCount?: number;
    attributes?: Array<{
        id?: number;
        name: string;
        options: string[];
        visible?: boolean;
        variation?: boolean;
    }>;
}

export interface LocalOrder {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    total: number;
    syncedToWoo: boolean;
    wooCommerceId?: string;
    createdAt: string;
}

export interface SyncLog {
    id: string;
    syncType: string;
    syncDirection: string;
    status: string;
    totalItems: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    startedAt: string;
    completedAt?: string;
    duration?: number;
    errorMessage?: string;
    errorDetails?: any;
}

export interface Settings {
    storeUrl: string;
    hasCredentials: boolean;
    syncEnabled: boolean;
    syncDirection: string;
    webhookEnabled: boolean;
    lastSyncAt?: string;
    lastSyncStatus?: string;
    webhookUrl?: string;
}

export interface FetchedStatus {
    slug: string;
    name: string;
    nameEn: string;
    isCustom?: boolean;
}
