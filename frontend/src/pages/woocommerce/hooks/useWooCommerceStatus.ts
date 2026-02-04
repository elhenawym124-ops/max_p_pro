import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FetchedStatus, Settings } from '../types';

export const useWooCommerceStatus = (
    settings: Settings | null,
    settingsForm: any,
    setSettingsForm: React.Dispatch<React.SetStateAction<any>>
) => {
    const [wooStatuses, setWooStatuses] = useState<FetchedStatus[]>([]);
    const [fetchingStatuses, setFetchingStatuses] = useState(false);
    const [statusSearch, setStatusSearch] = useState('');

    // Hardcoded fallback statuses while loading from API
    const [localStatuses, setLocalStatuses] = useState<{ value: string; label: string }[]>([
        { value: 'PENDING', label: 'معلق (Pending)' },
        { value: 'CONFIRMED', label: 'مؤكد (Confirmed)' },
        { value: 'PROCESSING', label: 'قيد التجهيز (Processing)' },
        { value: 'SHIPPED', label: 'تم الشحن (Shipped)' },
        { value: 'DELIVERED', label: 'تم التوصيل (Delivered)' },
        { value: 'CANCELLED', label: 'ملغي (Cancelled)' },
        { value: 'REFUNDED', label: 'مسترجع (Refunded)' }
    ]);

    const defaultStatusMapping = {
        'pending': 'PENDING',
        'processing': 'PROCESSING',
        'on-hold': 'PENDING',
        'completed': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'refunded': 'CANCELLED',
        'failed': 'CANCELLED',
        'trash': 'CANCELLED'
    };

    const fetchLocalStatuses = useCallback(async () => {
        try {
            const types = ['order', 'payment', 'shipping', 'preparation'];
            const responses = await Promise.all(
                types.map(type =>
                    fetch(`/api/v1/order-status?type=${type}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                    }).then(res => res.json())
                )
            );

            let allLocalStatuses: { value: string; label: string }[] = [];
            const typeLabels: Record<string, string> = {
                'order': 'طلب',
                'payment': 'دفع',
                'shipping': 'شحن',
                'preparation': 'تجهيز'
            };

            responses.forEach((res, index) => {
                if (res.success && res.data) {
                    const type = types[index];
                    const typeLabel = typeLabels[type] || type;

                    const mapped = res.data.map((s: any) => ({
                        value: s.code,
                        label: `[${typeLabel}] ${s.name} (${s.nameEn || s.code})`
                    }));
                    allLocalStatuses = [...allLocalStatuses, ...mapped];
                }
            });

            if (allLocalStatuses.length > 0) {
                // Remove duplicates if any status code exists in multiple types
                const uniqueStatuses = Array.from(new Map(allLocalStatuses.map(s => [s.value, s])).values());
                setLocalStatuses(uniqueStatuses);
            }
        } catch (error) {
            console.error('Error fetching local statuses:', error);
        }
    }, []);

    const fetchWooStatuses = async () => {
        if (!settings?.hasCredentials) {
            toast.error('يرجى إعداد بيانات الاتصال أولاً');
            return;
        }

        setFetchingStatuses(true);
        try {
            const response = await fetch('/api/v1/woocommerce/orders/statuses', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setWooStatuses(data.data);
                toast.success(`تم جلب ${data.data.length} حالة من المتجر`);
            } else {
                toast.error('فشل جلب الحالات');
            }
        } catch (error) {
            toast.error('خطأ في الاتصال');
        } finally {
            setFetchingStatuses(false);
        }
    };

    const autoMapStatuses = () => {
        const newMapping = { ...settingsForm.statusMapping };

        wooStatuses.forEach(status => {
            if (!newMapping[status.slug]) {
                const lowerName = (status.name || '').toLowerCase();
                const lowerSlug = status.slug.toLowerCase();

                if (lowerName.includes('complet') || lowerName.includes('deliver') || lowerName.includes('success') ||
                    lowerSlug.includes('complet') || lowerSlug.includes('deliver') || lowerSlug.includes('success')) {
                    newMapping[status.slug] = 'DELIVERED';
                } else if (lowerName.includes('process') || lowerName.includes('confirm') || lowerName.includes('prepar') ||
                    lowerSlug.includes('process') || lowerSlug.includes('confirm') || lowerSlug.includes('prepar')) {
                    newMapping[status.slug] = 'PROCESSING';
                } else if (lowerName.includes('cancel') || lowerName.includes('refund') || lowerName.includes('reject') ||
                    lowerSlug.includes('cancel') || lowerSlug.includes('refund') || lowerSlug.includes('reject')) {
                    newMapping[status.slug] = 'CANCELLED';
                } else if (lowerName.includes('hold') || lowerName.includes('wait') || lowerName.includes('pend') ||
                    lowerSlug.includes('hold') || lowerSlug.includes('wait') || lowerSlug.includes('pend')) {
                    newMapping[status.slug] = 'PENDING';
                } else if (lowerName.includes('ship') || lowerName.includes('dispatch') || lowerName.includes('rout') ||
                    lowerSlug.includes('ship') || lowerSlug.includes('dispatch') || lowerSlug.includes('rout')) {
                    newMapping[status.slug] = 'SHIPPED';
                }
            }
        });

        setSettingsForm((prev: any) => ({ ...prev, statusMapping: newMapping }));
        toast.success('🤖 تمت محاولة الربط التلقائي بنجاح');
    };

    return {
        wooStatuses,
        fetchingStatuses,
        localStatuses,
        statusSearch,
        setStatusSearch,
        fetchLocalStatuses,
        fetchWooStatuses,
        autoMapStatuses,
        defaultStatusMapping
    };
};
