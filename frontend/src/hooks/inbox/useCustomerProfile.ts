import { useState, useCallback } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { apiClient } from '../../services/apiClient';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    image: string | null;
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    items: OrderItem[];
}

interface Activity {
    id: string;
    action: string;
    description: string;
    createdAt: string;
    metadata?: string;
}

interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    city: string | null;
    country: string | null;
}

export const useCustomerProfile = () => {
    const { companyId } = useCompany();
    const [orders, setOrders] = useState<Order[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCustomerData = useCallback(async (customerId: string) => {
        if (!customerId || !companyId) return;

        setLoading(true);
        setError(null);

        try {
            // Concurrent fetching
            const [ordersRes, activityRes, customerRes] = await Promise.all([
                apiClient.get(`/customers/${customerId}/orders?companyId=${companyId}`),
                apiClient.get(`/customers/${customerId}/activity?companyId=${companyId}`),
                apiClient.get(`/customers/${customerId}?companyId=${companyId}`)
            ]);

            setOrders(ordersRes.data.data || []);
            if (customerRes.data.success) {
                setCustomer(customerRes.data.data);
            }


            // Map backend activity format to frontend interface
            const rawActivities = activityRes.data.data || [];
            const mappedActivities = rawActivities.map((act: any) => ({
                id: act.id,
                action: act.type,
                description: act.type === 'order'
                    ? `طلب جديد #${act.orderNumber} (${act.total} ر.س)`
                    : `محادثة عبر ${act.platform === 'WHATSAPP' ? 'واتساب' : act.platform === 'MESSENGER' ? 'ماسنجر' : act.platform || 'المنصة'}`,
                createdAt: act.timestamp || new Date().toISOString(),
                metadata: JSON.stringify(act.data)
            }));
            setActivities(mappedActivities);
        } catch (err: any) {
            console.error('Error fetching customer profile:', err);
            setError('فشل جلب بيانات العميل');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    const calculateLTV = useCallback(() => {
        return orders
            .filter(o => o.status === 'completed' || o.status === 'delivered' || o.status === 'paid')
            .reduce((sum, order) => sum + order.total, 0);
    }, [orders]);

    return {
        customer,
        orders,
        activities,
        loading,
        error,
        loadCustomerData,
        calculateLTV
    };
};
