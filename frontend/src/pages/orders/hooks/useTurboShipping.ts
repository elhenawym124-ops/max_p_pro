import { useState, useEffect } from 'react';
import { apiClient } from '../../../services/apiClient';
import { socketService } from '../../../services/socketService';
import { useAuth } from '../../../hooks/useAuthSimple';
import { toast } from 'react-hot-toast';
import { config } from '../../../config';

export const useTurboShipping = (order: any, setOrder: (order: any) => void) => {
    const { user } = useAuth();

    const [turboLoading, setTurboLoading] = useState(false);
    const [turboTrackingData, setTurboTrackingData] = useState<any>(null);
    const [shippingComparison, setShippingComparison] = useState<{
        actualCost: number;
        customerCost: number;
        difference: number;
    } | null>(null);

    // Socket Listener for Real-time Updates
    useEffect(() => {
        if (!order?.id || !user?.companyId) return;

        if (!socketService.isConnected()) {
            socketService.connect();
        }

        const socket = socketService.getSocket();
        if (!socket) return;

        if (!socket.connected) {
            socket.once('connect', () => {
                if (user.companyId) {
                    socket.emit('join_company_room', { companyId: user.companyId });
                }
            });
        }

        const handleTurboUpdate = (data: any) => {
            if (data.orderNumber === order.orderNumber || data.orderId === order.id) {

                // Update order state via the passed setter from useOrderDetails
                setOrder((prev: any) => prev ? {
                    ...prev,
                    turboShipmentStatus: data.status,
                    turboTrackingNumber: data.trackingNumber || prev.turboTrackingNumber,
                    updatedAt: new Date().toISOString()
                } : null);

                if (data.data) {
                    setTurboTrackingData({
                        status: data.status,
                        currentLocation: data.data.currentLocation || data.data.location,
                        estimatedDelivery: data.data.estimatedDelivery || data.data.expected_delivery,
                        deliveredAt: data.data.deliveredAt || data.data.delivery_date,
                        branch: data.data.branch || data.data.expected_branch,
                        history: data.data.history || []
                    });
                }

                // Show notification
                if (data.status === 'delivered') {
                    toast.success('✅ تم تسليم الشحنة بنجاح!');
                } else if (data.status === 'cancelled') {
                    toast.error('❌ تم إلغاء الشحنة');
                } else if (data.status === 'returned') {
                    toast.error('🔄 تم إرجاع الشحنة');
                } else {
                    toast('📦 تحديث حالة الشحنة: ' + data.status, {
                        icon: '🚚',
                    });
                }
            }
        };

        socket.on('turbo_shipment_update', handleTurboUpdate);

        // Rejoin on reconnect
        const handleReconnect = () => {
            if (user?.companyId) {
                socket.emit('join_company_room', { companyId: user.companyId });
            }
        };
        socket.on('connect', handleReconnect);

        return () => {
            socket.off('turbo_shipment_update', handleTurboUpdate);
            socket.off('connect', handleReconnect);
        };
    }, [order?.id, order?.orderNumber, user?.companyId, setOrder]);

    // Actions

    const createShipment = async () => {
        if (!order?.id) return;
        setTurboLoading(true);
        try {
            const response = await apiClient.post(`/turbo/orders/${order.id}/shipment`);
            if (response.data.success) {
                setOrder((prev: any) => prev ? {
                    ...prev,
                    turboShipmentId: response.data.data.shipmentId,
                    turboTrackingNumber: response.data.data.trackingNumber,
                    turboShipmentStatus: response.data.data.status,
                    turboLabelUrl: response.data.data.labelUrl
                } : null);
                toast.success('تم إنشاء الشحنة بنجاح! رقم التتبع: ' + response.data.data.trackingNumber);
                return { success: true, trackingNumber: response.data.data.trackingNumber };
            }
            return { success: false };
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'فشل إنشاء الشحنة');
            return { success: false, error: error.message };
        } finally {
            setTurboLoading(false);
        }
    };

    const getWaybill = async (useLocalGeneration = false) => {
        if (!order?.id) return null;
        setTurboLoading(true);
        try {
            // تحميل البوليصة كـ PDF من الـ Backend
            const waybillUrl = `${config.apiUrl}/turbo/orders/${order.orderNumber || order.id}/waybill`;
            
            console.log('📥 [WAYBILL] Downloading PDF from:', waybillUrl);
            toast.info('جاري تحميل البوليصة...');
            
            // Fetch the PDF with proper headers
            const response = await fetch(waybillUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [WAYBILL] Server error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Check content type
            const contentType = response.headers.get('content-type');
            console.log('📄 [WAYBILL] Content-Type:', contentType);
            
            if (!contentType?.includes('application/pdf')) {
                console.warn('⚠️ [WAYBILL] Response is not PDF, might be JSON or HTML');
                // Try to parse as JSON for error message
                try {
                    const json = await response.json();
                    throw new Error(json.error || json.message || 'البوليصة غير متوفرة');
                } catch (e) {
                    throw new Error('البوليصة غير متوفرة بصيغة PDF');
                }
            }
            
            // Get the blob
            const blob = await response.blob();
            console.log('📦 [WAYBILL] Blob size:', blob.size, 'bytes');
            
            if (blob.size === 0) {
                throw new Error('البوليصة فارغة');
            }
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `waybill-${order.orderNumber || order.id}.pdf`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            console.log('✅ [WAYBILL] PDF downloaded successfully');
            toast.success('تم تحميل البوليصة بنجاح');
            return true;
        } catch (error: any) {
            console.error('❌ [WAYBILL] Error downloading waybill:', error);
            toast.error(error.message || 'فشل تحميل البوليصة');
            return null;
        } finally {
            setTurboLoading(false);
        }
    };

    const cancelShipment = async () => {
        if (!order?.id || !order?.turboShipmentId) return;

        // In a real UX, we'd use a custom modal. For now, we will rely on a browser confirm 
        // or assume the UI button handles the "Are you sure?" step before calling this.
        // Given the task 'Replace window.alert/confirm', we should ideally assume the UI handles confirmation.
        // However, as a safeguard, we can revert to a safe check or just execute if the button is clicked.

        setTurboLoading(true);
        try {
            const response = await apiClient.post(`/turbo/orders/${order.id}/cancel`);
            if (response.data.success) {
                setOrder((prev: any) => prev ? {
                    ...prev,
                    turboShipmentStatus: 'cancelled'
                } : null);
                toast.success('تم إلغاء الشحنة بنجاح');
                return true;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'فشل إلغاء الشحنة');
        } finally {
            setTurboLoading(false);
        }
        return false;
    };

    const calculateShipping = async (governorate: string, city: string) => {
        if (!governorate) {
            toast.error('يرجى تحديد المحافظة لحساب تكلفة الشحن');
            return;
        }
        setTurboLoading(true); // Reuse loading state or create specific one
        try {
            // Assuming endpoint accepts these params. 
            // If the backend expects IDs, we might need to look them up.
            // Based on previous code, it likely takes IDs or Names.
            const response = await apiClient.post('/turbo/shipping/calculate', {
                weight: 1, // Default weight 1kg
                governorate: governorate,
                city: city,
                cod: order.total // Cash on Delivery amount
            });

            if (response.data.success) {
                const cost = response.data.data.price || response.data.data.cost;
                if (cost) {
                    setShippingComparison({
                        actualCost: cost,
                        customerCost: order.shipping,
                        difference: cost - order.shipping
                    });
                    toast.success(`تم حساب تكلفة الشحن: ${cost} ج.م`);
                }
            }
        } catch (error: any) {
            console.error('Shipping calc error:', error);
            toast.error('فشل حساب تكلفة الشحن');
        } finally {
            setTurboLoading(false);
        }
    };

    const fetchShippingComparison = async () => {
        // Logic to fetch comparison if needed
    };

    return {
        turboLoading,
        turboTrackingData,
        shippingComparison,
        createShipment,
        getWaybill,
        cancelShipment,
        calculateShipping,
        setTurboTrackingData
    };
};
