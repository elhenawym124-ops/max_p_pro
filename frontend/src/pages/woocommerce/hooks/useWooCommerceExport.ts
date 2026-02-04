import { useState } from 'react';
import toast from 'react-hot-toast';
import { LocalOrder } from '../types';

export const useWooCommerceExport = () => {
    const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
    const [selectedLocalOrders, setSelectedLocalOrders] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchLocalOrders = async () => {
        setLoading(true);
        setLocalOrders([]);
        try {
            const response = await fetch('/api/v1/woocommerce/orders/local', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const data = await response.json();
            if (data.success) {
                setLocalOrders(data.data.orders || []);
            }
        } catch (error) {
            toast.error('خطأ في جلب الطلبات المحلية');
        } finally {
            setLoading(false);
        }
    };

    const exportSelectedOrders = async () => {
        if (selectedLocalOrders.size === 0) return;
        setExporting(true);

        try {
            const response = await fetch('/api/v1/woocommerce/orders/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ orderIds: Array.from(selectedLocalOrders) })
            });

            const data = await response.json();

            if (data.success) {
                const exported = data.data?.exported || 0;
                const failed = data.data?.failed || 0;

                if (failed > 0) {
                    toast(
                        `تم تصدير ${exported} طلب بنجاح، وفشل ${failed} طلب. راجع سجلات المزامنة للتفاصيل.`,
                        {
                            duration: 5000,
                            icon: '⚠️'
                        }
                    );
                } else {
                    toast.success(`تم تصدير ${exported} طلب بنجاح`);
                }

                setSelectedLocalOrders(new Set());
                fetchLocalOrders();
            } else {
                const errorDetails = data.data?.errors;
                const errorMsg = data.message || 'فشل التصدير الجزئي';

                toast.error(
                    errorDetails
                        ? `${errorMsg}\n${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)}`
                        : errorMsg,
                    { duration: 7000 }
                );
            }
        } catch (error: any) {
            toast.error(`خطأ في تصدير الطلبات: ${error.message || 'خطأ غير معروف'}`);
        } finally {
            setExporting(false);
        }
    };

    return {
        localOrders,
        selectedLocalOrders,
        setSelectedLocalOrders,
        exporting,
        loading,
        fetchLocalOrders,
        exportSelectedOrders
    };
};
