import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuthSimple';
import { toast } from 'react-hot-toast';
import { OrderDetailsType, Government, Area } from '../types';
import { validateOrderItems, validateEgyptianPhone, validateCustomerName } from '../../../utils/validation';

export const useOrderDetails = (orderNumber: string | undefined) => {
    const { isLoading: authLoading, isAuthenticated } = useAuth();

    // Data State
    const [order, setOrder] = useState<OrderDetailsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [addingNote, setAddingNote] = useState(false);

    // Lookups State
    const [orderStatuses, setOrderStatuses] = useState<Array<{ code: string, name: string, nameEn?: string }>>([]);
    const [paymentStatuses, setPaymentStatuses] = useState<Array<{ code: string, name: string, nameEn?: string }>>([]);
    const [governments, setGovernments] = useState<Government[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loadingGovernments, setLoadingGovernments] = useState(false);
    const [loadingAreas, setLoadingAreas] = useState(false);

    // Edit Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        customerName: '',
        customerPhone: '',
        alternativePhone: '',
        customerAddress: '',
        city: '',
        governorate: '',
        notes: '',
        items: [] as any[],
        shipping: 0,
        tax: 0
    });
    const [selectedGovernmentId, setSelectedGovernmentId] = useState<number | null>(null);
    const [orderNotes, setOrderNotes] = useState<any[]>([]);

    // --- Fetching Logic ---

    const fetchOrderStatuses = async () => {
        const fallbackStatuses = [
            { code: 'PENDING', name: 'قيد الانتظار', color: '#F59E0B' },
            { code: 'DRAFT', name: 'مسودة', color: '#9CA3AF' },
            { code: 'CONFIRMED', name: 'مؤكد', color: '#3B82F6' },
            { code: 'ON_HOLD', name: 'معلق', color: '#F97316' },
            { code: 'PROCESSING', name: 'قيد التجهيز', color: '#8B5CF6' },
            { code: 'SHIPPED', name: 'تم الشحن', color: '#06B6D4' },
            { code: 'DELIVERED', name: 'تم التسليم', color: '#10B981' },
            { code: 'CANCELLED', name: 'ملغي', color: '#EF4444' },
            { code: 'REFUNDED', name: 'مسترد', color: '#6B7280' },
            { code: 'PARTIALLY_REFUNDED', name: 'مسترد جزئياً', color: '#9CA3AF' }
        ];

        try {
            const response = await apiClient.get('/order-status?statusType=order');
            console.log('📊 Order Statuses API Response:', response.data);
            if (response.data.success) {
                const apiStatuses = response.data.data || [];
                console.log('📊 Loaded statuses from API:', apiStatuses);

                // دمج الحالات من API مع الحالات الافتراضية
                // الحالات من API لها الأولوية
                const statusMap = new Map();

                // أضف الحالات الافتراضية أولاً
                fallbackStatuses.forEach((status: any) => {
                    statusMap.set(status.code, status);
                });

                // اكتب فوقها بالحالات من API (تشمل الحالات المخصصة)
                apiStatuses.forEach(status => {
                    statusMap.set(status.code, status);
                });

                const mergedStatuses = Array.from(statusMap.values());
                console.log('📊 Merged statuses:', mergedStatuses.length, 'statuses');
                setOrderStatuses(mergedStatuses);
            }
        } catch (error) {
            console.error('Error fetching order statuses:', error);
            setOrderStatuses(fallbackStatuses);
        }
    };

    const fetchPaymentStatuses = async () => {
        try {
            const response = await apiClient.get('/order-status?statusType=payment');
            if (response.data.success) {
                setPaymentStatuses(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching payment statuses:', error);
            setPaymentStatuses([
                { code: 'PENDING', name: 'في انتظار الدفع' },
                { code: 'COMPLETED', name: 'مدفوع' },
                { code: 'FAILED', name: 'فشل الدفع' }
            ]);
        }
    };

    const fetchGovernments = async () => {
        try {
            setLoadingGovernments(true);
            const response = await apiClient.get('/turbo/governments');
            if (response.data.success && response.data.data?.governments) {
                setGovernments(response.data.data.governments);
            }
        } catch (error) {
            console.error('Failed to fetch governments:', error);
        } finally {
            setLoadingGovernments(false);
        }
    };

    const fetchAreas = async (governmentId: number) => {
        if (!governmentId) {
            setAreas([]);
            return;
        }
        try {
            setLoadingAreas(true);
            const response = await apiClient.get(`/turbo/areas/${governmentId}`);
            if (response.data.success && response.data.data.areas) {
                setAreas(response.data.data.areas);
            } else {
                setAreas([]);
            }
        } catch (error) {
            console.error('Failed to fetch areas:', error);
            setAreas([]);
        } finally {
            setLoadingAreas(false);
        }
    };

    const fetchOrderDetails = useCallback(async () => {
        if (!orderNumber) return;
        try {
            setLoading(true);
            let response;
            let data;

            console.log('🔍 [FRONTEND] Fetching order:', orderNumber);

            try {
                response = await apiClient.get(`/orders-new/simple/${orderNumber}`);
                data = response.data;
                console.log('✅ [FRONTEND] Got response from /orders-new/simple');
            } catch (error: any) {
                console.log('❌ [FRONTEND] Failed to fetch from /orders-new/simple:', error.response?.status);
                if (error.response?.status === 404) {
                    try {
                        console.log('🔄 [FRONTEND] Trying /orders-enhanced endpoint...');
                        response = await apiClient.get(`/orders-enhanced/${orderNumber}`);
                        data = response.data;
                        console.log('✅ [FRONTEND] Got response from /orders-enhanced');
                    } catch (error2) {
                        console.log('❌ [FRONTEND] Failed to fetch from /orders-enhanced');
                        // Error from enhanced endpoint, let it fall through to the outer catch
                        throw error;
                    }
                } else {
                    // Other error from simple endpoint, let it fall through to the outer catch
                    throw error;
                }
            }

            console.log('📦 [FRONTEND] API Response data:', data);

            if (data.success) {
                const simpleOrder = data.data;
                console.log('🔍 [FRONTEND] Order data received:', {
                    orderNumber: simpleOrder.orderNumber,
                    turboShipmentId: simpleOrder.turboShipmentId,
                    turboTrackingNumber: simpleOrder.turboTrackingNumber,
                    turboShipmentStatus: simpleOrder.turboShipmentStatus,
                    turboLabelUrl: simpleOrder.turboLabelUrl,
                    turboMetadata: simpleOrder.turboMetadata ? 'exists' : 'null'
                });
                const shippingAddr = typeof simpleOrder.shippingAddress === 'string'
                    ? (() => { try { return JSON.parse(simpleOrder.shippingAddress); } catch { return {}; } })()
                    : simpleOrder.shippingAddress || {};

                const enhancedOrder: OrderDetailsType = {
                    ...simpleOrder,
                    status: (simpleOrder.status || '').toUpperCase(),
                    paymentStatus: (simpleOrder.paymentStatus || 'pending').toUpperCase(),
                    items: (Array.isArray(simpleOrder.items) ? simpleOrder.items : []).map((item: any) => {
                        const price = parseFloat(item.price);
                        const quantity = parseInt(item.quantity);
                        const validPrice = !isNaN(price) && price >= 0 ? price : 0;
                        const validQuantity = !isNaN(quantity) && quantity > 0 ? quantity : 1;

                        // Parse Item Metadata
                        let itemMetadata: any = {};
                        try {
                            itemMetadata = typeof item.metadata === 'string'
                                ? JSON.parse(item.metadata)
                                : (item.metadata || {});
                        } catch (e) {
                            console.warn('Failed to parse item metadata', e);
                            itemMetadata = {};
                        }

                        // Parse Variant Metadata
                        let variantMetadata: any = {};
                        if (item.variant && item.variant.metadata) {
                            try {
                                variantMetadata = typeof item.variant.metadata === 'string'
                                    ? JSON.parse(item.variant.metadata)
                                    : item.variant.metadata;
                            } catch (e) {
                                variantMetadata = {};
                            }
                        }

                        return {
                            id: item.id || Math.random().toString(),
                            productId: item.productId || '',
                            productName: item.name || item.productName || (item as any).local_product_id || 'منتج غير محدد',
                            productColor: (() => {
                                // 1. Direct fields
                                if (item.productColor) return item.productColor;
                                if (item.color) return item.color;

                                // 2. Metadata
                                if (itemMetadata.color) return itemMetadata.color;
                                if (itemMetadata.attributeValues?.['اللون']) return itemMetadata.attributeValues['اللون'];
                                if (itemMetadata.attributeValues?.['color']) return itemMetadata.attributeValues['color'];

                                // 3. Variant Relation
                                if (item.variant) {
                                    // Try Metadata first
                                    if (variantMetadata.attributeValues?.['اللون']) return variantMetadata.attributeValues['اللون'];
                                    if (variantMetadata.attributeValues?.['color']) return variantMetadata.attributeValues['color'];

                                    // Try Name Parsing (e.g. "Color - Size")
                                    if (item.variant.name) {
                                        const name = item.variant.name;
                                        if (item.variant.type === 'color' && !name.includes('-')) return name;

                                        if (name.includes('-')) {
                                            const parts = name.split('-').map((s: any) => s.trim());
                                            // Heuristic: First part is color if not number
                                            if (parts.length > 0 && isNaN(parseFloat(parts[0]))) return parts[0];
                                        }
                                    }
                                }
                                return '';
                            })(),
                            productSize: (() => {
                                // 1. Direct fields
                                if (item.productSize) return item.productSize;
                                if (item.size) return item.size;

                                // 2. Metadata
                                if (itemMetadata.size) return itemMetadata.size;
                                if (itemMetadata.attributeValues?.['المقاس']) return itemMetadata.attributeValues['المقاس'];
                                if (itemMetadata.attributeValues?.['size']) return itemMetadata.attributeValues['size'];

                                // 3. Variant Relation
                                if (item.variant) {
                                    // Try Metadata first
                                    if (variantMetadata.attributeValues?.['المقاس']) return variantMetadata.attributeValues['المقاس'];
                                    if (variantMetadata.attributeValues?.['size']) return variantMetadata.attributeValues['size'];

                                    // Try Name Parsing
                                    if (item.variant.name && item.variant.name.includes('-')) {
                                        const parts = item.variant.name.split('-').map((s: any) => s.trim());
                                        // Heuristic: Last part is size
                                        if (parts.length > 1) return parts[parts.length - 1];
                                    }
                                }
                                return '';
                            })(),
                            productImage: item.productImage || item.image || itemMetadata.image || item.product?.images?.[0] || '',
                            price: validPrice,
                            quantity: validQuantity,
                            total: parseFloat(item.total) || (validPrice * validQuantity),
                            metadata: itemMetadata
                        };
                    }),
                    subtotal: parseFloat(simpleOrder.subtotal) || 0,
                    tax: parseFloat(simpleOrder.tax) || 0,
                    shipping: parseFloat(simpleOrder.shipping) || 0,
                    total: parseFloat(simpleOrder.total) || 0,
                    currency: 'EGP',
                };

                setOrder(enhancedOrder);
                setOrderNotes(enhancedOrder.orderNotes || []);

                console.log('✅ [FRONTEND] Order set in state:', {
                    orderNumber: enhancedOrder.orderNumber,
                    turboShipmentId: enhancedOrder.turboShipmentId,
                    turboTrackingNumber: enhancedOrder.turboTrackingNumber,
                    turboShipmentStatus: enhancedOrder.turboShipmentStatus,
                    turboLabelUrl: enhancedOrder.turboLabelUrl,
                    turboMetadata: enhancedOrder.turboMetadata ? 'exists' : 'null'
                });

                // Initialize Edit Form
                setEditForm({
                    customerName: enhancedOrder.customerName,
                    customerPhone: enhancedOrder.customerPhone || '',
                    alternativePhone: enhancedOrder.alternativePhone || '',
                    customerAddress: enhancedOrder.customerAddress || '',
                    city: enhancedOrder.city || '',
                    governorate: enhancedOrder.governorate || shippingAddr.governorate || '',
                    notes: enhancedOrder.notes || '',
                    items: JSON.parse(JSON.stringify(enhancedOrder.items)),
                    shipping: enhancedOrder.shipping || 0,
                    tax: enhancedOrder.tax || 0
                });

                // Logic to set selectedGovernmentId moved to separate useEffect
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('فشل تحميل تفاصيل الطلب');
        } finally {
            setLoading(false);
        }
    }, [orderNumber]);

    useEffect(() => {
        if (!orderNumber || authLoading || !isAuthenticated) return;
        fetchOrderDetails();
        fetchOrderStatuses();
        fetchPaymentStatuses();
        fetchGovernments();
    }, [orderNumber, authLoading, isAuthenticated, fetchOrderDetails]);

    // Re-run gov check when governments load if order is already loaded
    useEffect(() => {
        if (order && governments.length > 0 && !selectedGovernmentId) {
            const shippingAddr = typeof order.shippingAddress === 'string'
                ? (() => { try { return JSON.parse(order.shippingAddress); } catch { return {}; } })()
                : order.shippingAddress || {};
            const initialGovernorate = order.governorate || shippingAddr.governorate || order.city || ''; // Prioritize top-level governorate
            const foundGov = governments.find(g =>
                g.name === initialGovernorate ||
                g.id === parseInt(initialGovernorate) ||
                g.name === String(initialGovernorate).replace(/^\d+:/, '').trim()
            );
            if (foundGov) {
                setSelectedGovernmentId(foundGov.id);
                fetchAreas(foundGov.id);
            }
        }
    }, [governments, order, selectedGovernmentId]);


    // --- Actions ---

    const handleGovernmentChange = (governmentId: number, governmentName: string) => {
        setSelectedGovernmentId(governmentId);
        setEditForm({ ...editForm, governorate: governmentName, city: '' });
        fetchAreas(governmentId);
    };

    const updateStatus = async (newStatus: string, notes: string) => {
        try {
            setUpdating(true);
            const response = await apiClient.post(`/orders-new/simple/${orderNumber}/status`, {
                status: newStatus,
                notes: notes
            });
            if (response.data.success) {
                setOrder(prev => prev ? { ...prev, status: newStatus.toUpperCase() as any } : null);
                toast.success('تم تحديث حالة الطلب بنجاح');
                return true;
            }
            return false;
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'فشل تحديث الحالة');
            return false;
        } finally {
            setUpdating(false);
        }
    };

    const updatePaymentStatus = async (newPaymentStatus: string, notes: string) => {
        try {
            setUpdating(true);
            const response = await apiClient.post(`/orders-new/simple/${orderNumber}/payment-status`, {
                paymentStatus: newPaymentStatus.toUpperCase(),
                notes: notes
            });
            if (response.data.success) {
                setOrder(prev => prev ? { ...prev, paymentStatus: newPaymentStatus.toUpperCase() as any } : null);
                toast.success('تم تحديث حالة الدفع بنجاح');
                return true;
            }
            return false;
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'فشل تحديث حالة الدفع');
            return false;
        } finally {
            setUpdating(false);
        }
    };

    const addNote = async (content: string) => {
        if (!content.trim()) return false;
        try {
            setAddingNote(true);
            const response = await apiClient.post(`/orders-new/simple/${orderNumber}/notes`, {
                content
            });
            if (response.data.success) {
                setOrderNotes(prev => [response.data.data, ...prev]);
                toast.success('تم إضافة الملاحظة بنجاح');
                return true;
            }
            return false;
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'فشل إضافة الملاحظة');
            return false;
        } finally {
            setAddingNote(false);
        }
    };

    const saveChanges = async () => {
        if (!order) return false;

        // ✅ Validation: Check customer name
        const nameValidation = validateCustomerName(editForm.customerName);
        if (!nameValidation.isValid) {
            toast.error(nameValidation.error || 'اسم العميل غير صحيح');
            return false;
        }

        // ✅ Validation: Check phone number
        if (editForm.customerPhone) {
            const phoneValidation = validateEgyptianPhone(editForm.customerPhone);
            if (!phoneValidation.isValid) {
                toast.error(phoneValidation.error || 'رقم الهاتف غير صحيح');
                return false;
            }
        }

        // ✅ Validation: Check alternative phone if provided
        if (editForm.alternativePhone && editForm.alternativePhone.trim() !== '') {
            const altPhoneValidation = validateEgyptianPhone(editForm.alternativePhone);
            if (!altPhoneValidation.isValid) {
                toast.error(`الرقم البديل: ${altPhoneValidation.error}`);
                return false;
            }
        }

        // ✅ Validation: Check items
        const itemsValidation = validateOrderItems(editForm.items);
        if (!itemsValidation.isValid) {
            toast.error(itemsValidation.error || 'يوجد خطأ في المنتجات');
            return false;
        }

        setUpdating(true);
        try {
            // 1. Update Details
            const detailsBody = {
                customerName: editForm.customerName,
                customerPhone: editForm.customerPhone,
                alternativePhone: editForm.alternativePhone,
                shippingAddress: {
                    address: editForm.customerAddress,
                    city: editForm.city,
                    governorate: editForm.governorate,
                    country: 'Egypt'
                },
                city: editForm.city,
                governorate: editForm.governorate,
                notes: editForm.notes
            };

            await apiClient.put(`/orders-new/simple/${orderNumber}`, detailsBody);

            // 2. Update Items
            const itemsToUpdate = (editForm.items && editForm.items.length > 0)
                ? editForm.items
                : (order.items && order.items.length > 0 ? order.items : []);

            if (itemsToUpdate && itemsToUpdate.length > 0) {
                const newItems = itemsToUpdate.map((item: any) => {
                    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : (parseFloat(item.price) || 0);
                    const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0 ? item.quantity : 1;
                    return {
                        productId: item.productId || item.id || '',
                        productName: item.productName || item.name || '',
                        productColor: item.productColor || null,
                        productSize: item.productSize || null,
                        price,
                        quantity,
                        total: price * quantity,
                        metadata: item.metadata || {}
                    };
                });

                const newSubtotal = newItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
                const currentShipping = typeof editForm.shipping === 'number' ? editForm.shipping : (parseFloat(editForm.shipping) || 0);
                const currentTax = typeof editForm.tax === 'number' ? editForm.tax : (parseFloat(editForm.tax) || 0);
                const newTotal = newSubtotal + currentShipping + currentTax;

                await apiClient.put(`/orders-new/simple/${orderNumber}/items`, {
                    items: newItems,
                    subtotal: newSubtotal,
                    total: newTotal,
                    tax: currentTax,
                    shipping: currentShipping
                });
            }

            await fetchOrderDetails();
            setIsEditing(false);
            toast.success('تم حفظ التغييرات بنجاح');
            return true;

        } catch (e: any) {
            console.error('Save error:', e);
            toast.error(e.response?.data?.message || 'فشل حفظ التغييرات');
            return false;
        } finally {
            setUpdating(false);
        }
    };

    return {
        order,
        setOrder, // Exposed for real-time updates
        loading,
        updating,
        addingNote,
        // Lookups
        orderStatuses,
        paymentStatuses,
        governments,
        areas,
        loadingGovernments,
        loadingAreas,
        // Forms
        isEditing,
        setIsEditing,
        editForm,
        setEditForm,
        selectedGovernmentId,
        setSelectedGovernmentId,
        orderNotes,
        // Actions
        fetchOrderDetails,
        handleGovernmentChange,
        updateStatus,
        updatePaymentStatus,
        addNote,
        saveChanges
    };
};
