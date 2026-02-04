import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import useSocket from '../../hooks/useSocket';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../../hooks/useAuthSimple';
import { apiClient } from '../../services/apiClient';
import EnhancedOrderModal from '../../components/orders/EnhancedOrderModal';
import InvoiceModal from '../../components/orders/InvoiceModal';
import {
  ShoppingBagIcon,
  EyeIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  FunnelIcon,
  InformationCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'pending' | 'confirmed' | 'scheduled' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'PENDING' | 'CONFIRMED' | 'SCHEDULED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  items: Array<{
    id: string;
    productId: string;
    name: string;
    price: number | null;
    quantity: number;
    total: number | null;
    confidence?: number;
    metadata?: {
      color?: string;
      size?: string;
      conversationId?: string;
      source?: string;
      confidence?: number;
    };
  }>;
  subtotal: number | null;
  tax: number;
  shipping: number;
  total: number | null;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' | 'PENDING' | 'COMPLETED' | 'FAILED';
  shippingAddress: {
    city: string;
    governorate: string;
    country: string;
  };
  trackingNumber?: string;
  notes: string;
  createdAt: string;
  conversationId?: string;
  updatedAt: string;
  // Enhanced fields
  confidence?: number;
  extractionMethod?: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    facebookId?: string;
  };
  conversation?: {
    id: string;
    status: string;
    channel: string;
  };
  metadata?: {
    source?: string;
    isGuestOrder?: boolean;
    confidence?: number;
    extractionMethod?: string;
    [key: string]: any;
  };
  isScheduled?: boolean;
  scheduledDeliveryDate?: string;
  scheduledNotes?: string;
  isViewed?: boolean;
  governorate?: string;
}

const transformOrder = (order: any): Order => {
  const status = order.status || 'pending';
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : status;

  const subtotal = typeof order.subtotal === 'string' ? parseFloat(order.subtotal) || 0 : (order.subtotal ?? 0);
  const shipping = typeof order.shipping === 'string' ? parseFloat(order.shipping) || 0 : (order.shipping ?? 0);
  const tax = typeof order.tax === 'string' ? parseFloat(order.tax) || 0 : (order.tax ?? 0);
  const calculatedTotal = subtotal + shipping + tax;

  return {
    id: order.id || order.orderNumber || '',
    orderNumber: order.orderNumber || '',
    customerName: order.customerName || 'Not Specified',
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || '',
    status: normalizedStatus as any,
    items: Array.isArray(order.items) ? order.items.map((item: any) => ({
      id: item.id || '',
      productId: item.productId || '',
      name: item.name || item.productName || '',
      price: typeof item.price === 'string' ? parseFloat(item.price) || null : (item.price ?? null),
      quantity: item.quantity || 0,
      total: typeof item.total === 'string' ? parseFloat(item.total) || null : (item.total ?? null),
      confidence: item.confidence || item.metadata?.confidence,
      metadata: item.metadata || {}
    })) : [],
    subtotal,
    tax,
    shipping,
    total: calculatedTotal || (typeof order.total === 'string' ? parseFloat(order.total) || 0 : (order.total ?? 0)),
    paymentMethod: order.paymentMethod || '',
    paymentStatus: (order.paymentStatus || 'pending').toLowerCase() as any,
    shippingAddress: typeof order.shippingAddress === 'object'
      ? { ...order.shippingAddress, governorate: order.governorate || order.shippingAddress?.governorate || '' }
      : { city: order.city || '', governorate: order.governorate || '', country: '' },
    trackingNumber: order.trackingNumber || undefined,
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    conversationId: order.conversationId || undefined,
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    // Enhanced fields
    confidence: order.confidence || order.metadata?.confidence,
    extractionMethod: order.extractionMethod || order.metadata?.extractionMethod,
    customer: order.customer,
    conversation: order.conversation,
    metadata: order.metadata || {},
    // Scheduled order fields
    isScheduled: order.isScheduled,
    scheduledDeliveryDate: order.scheduledDeliveryDate,
    scheduledNotes: order.scheduledNotes,
    isViewed: order.isViewed ?? true, // Default to true if missing
    governorate: order.governorate || ''
  };

};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '20'));
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [printingInvoices, setPrintingInvoices] = useState(false);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    paymentStatus: searchParams.get('paymentStatus') || '',
    search: searchParams.get('search') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    extractionMethod: searchParams.get('extractionMethod') || '',
    minConfidence: searchParams.get('minConfidence') || '',
    onlyUnseen: searchParams.get('onlyUnseen') === 'true',
    timeRange: searchParams.get('timeRange') || '',
  });

  useEffect(() => {
    const params: any = {
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
      onlyUnseen: filters.onlyUnseen.toString()
    };
    // Remove empty params
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });
    setSearchParams(params, { replace: true });
  }, [filters, page, limit, setSearchParams]);

  // Stats State

  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  // Socket.IO Integration
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new orders
    const handleNewOrder = (newOrder: any) => {
      if (page === 1) {
        setOrders(prev => {
          if (prev.find(o => o.orderNumber === newOrder.orderNumber)) return prev;
          return [transformOrder(newOrder), ...prev];
        });
        setTotalOrders(prev => prev + 1);
      }
    };

    // Listen for order updates
    const handleOrderUpdate = (updatedData: any) => {
      if (updatedData._refetch) {
        fetchOrders();
        return;
      }

      setOrders(prev => prev.map(order => {
        if (order.orderNumber === updatedData.orderNumber) {
          // Check if we need to full transform again or merge
          // ideally we just merge, but if the update lacks fields, be careful.
          return { ...order, ...updatedData };
        }
        return order;
      }));
    };

    // Listen for bulk updates
    const handleBulkUpdate = () => {
      fetchOrders();
    };

    const handleBulkDelete = () => {
      fetchOrders();
    }

    socket.on('order:created', handleNewOrder);
    socket.on('order:updated', handleOrderUpdate);
    socket.on('order:updated_bulk', handleBulkUpdate);
    socket.on('order:deleted_bulk', handleBulkDelete);

    return () => {
      socket.off('order:created', handleNewOrder);
      socket.off('order:updated', handleOrderUpdate);
      socket.off('order:updated_bulk', handleBulkUpdate);
      socket.off('order:deleted_bulk', handleBulkDelete);
    };
  }, [socket, isConnected, page]);

  useEffect(() => {
    fetchOrders();
  }, [page, limit, filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Try enhanced orders first if filters require it, otherwise use simple
      const useEnhanced = filters.extractionMethod || filters.minConfidence;

      if (useEnhanced) {
        // Use enhanced orders API with apiClient
        const queryParams = {
          page: page.toString(),
          limit: limit.toString(),
          ...(filters.status && { status: filters.status.toUpperCase() }),
          ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus.toUpperCase() }),
          ...(filters.search && { search: filters.search }),
          ...(filters.extractionMethod && { extractionMethod: filters.extractionMethod }),
          ...(filters.minConfidence && { minConfidence: filters.minConfidence }),
          ...(filters.startDate && { dateFrom: filters.startDate }),
          ...(filters.endDate && { dateTo: filters.endDate }),
          ...(filters.onlyUnseen && { onlyUnseen: 'true' }),
        };

        const response = await apiClient.get('/orders-enhanced', {
          params: queryParams
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (Array.isArray(data.data) ? data.data : []).map(transformOrder);
          setOrders(transformedOrders);
          if (data.pagination) {
            setTotalPages(data.pagination.pages || 1);
            setTotalOrders(data.pagination.total || transformedOrders.length);
          } else {
            setTotalPages(1);
            setTotalOrders(transformedOrders.length);
          }
          setSelectedOrders([]);
        } else {
          console.error('Failed to fetch enhanced orders:', data.message);
        }
      } else {
        // Use simple orders API
        const queryParams: any = {
          page: page.toString(),
          limit: limit.toString(),
        };

        if (filters.status) queryParams.status = filters.status;
        if (filters.paymentStatus) queryParams.paymentStatus = filters.paymentStatus;
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = filters.startDate;
        if (filters.endDate) queryParams.endDate = filters.endDate;
        if (filters.onlyUnseen) queryParams.onlyUnseen = 'true';

        const response = await apiClient.get('/orders-new/simple', {
          params: queryParams
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (Array.isArray(data.data) ? data.data : []).map(transformOrder);

          setOrders(transformedOrders);
          if (data.pagination) {
            setTotalPages(data.pagination.pages);
            setTotalOrders(data.pagination.total);
          } else {
            setTotalPages(1);
            setTotalOrders(transformedOrders.length);
          }
          setSelectedOrders([]);
        } else {
          console.error('Failed to fetch orders:', data.message);
        }
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.response?.data?.message) {
        console.error('Error message:', error.response.data.message);
      }
    } finally {
      setLoading(false);
    }
  };


  const getCustomerDisplayName = (order: Order) => {
    if (order.customer) {
      const fullName = `${order.customer.firstName} ${order.customer.lastName}`.trim();
      if (fullName !== 'New Customer' && fullName !== 'Customer Not Specified' && fullName !== 'Customer') {
        return fullName;
      }
    }

    if (order.customerName &&
      !order.customerName.match(/^\d+/) &&
      order.customerName !== 'New Customer' &&
      order.customerName !== 'Customer Not Specified' &&
      order.customerName !== 'Customer' &&
      order.customerName.length > 2) {
      return order.customerName;
    }

    if (order.customerName && order.customerName.match(/^\d+/)) {
      return `${t('orders.facebookCustomer')} (${order.customerName.substring(0, 8)}...)`;
    }

    if (order.customerPhone) {
      return `${t('orders.customer')} (${order.customerPhone})`;
    }

    if (order.conversationId) {
      return `${t('orders.customerFromConversation')} (${order.conversationId.substring(0, 8)}...)`;
    }

    return order.customerName || t('orders.notSpecifiedCustomer');
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <InformationCircleIcon className="h-3 w-3" />;
    if (confidence >= 0.8) return <StarIcon className="h-3 w-3" />;
    if (confidence >= 0.6) return <InformationCircleIcon className="h-3 w-3" />;
    return <ExclamationTriangleIcon className="h-3 w-3" />;
  };

  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // أقل من دقيقة
      if (diffInSeconds < 60) {
        return t('orders.justNow') || 'منذ لحظات';
      }

      // أقل من ساعة (دقائق)
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : minutes === 2 ? 'دقيقتين' : 'دقائق'}`;
      }

      // أقل من 24 ساعة (ساعات)
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ${hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : 'ساعات'}`;
      }

      // أقل من 48 ساعة (أمس)
      if (diffInSeconds < 172800) {
        return 'أمس';
      }

      // أكثر من يومين - عرض التاريخ العادي
      return formatDate(dateString);
    } catch (e) {
      return formatDate(dateString);
    }
  };

  const setQuickDate = (range: string) => {
    const now = new Date();
    let startDate: string = '';
    let endDate: string = '';

    if (range === 'custom') {
      setFilters(prev => ({ ...prev, timeRange: 'custom' }));
      return;
    }

    switch (range) {
      case 'today':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        startDate = format(yesterday, 'yyyy-MM-dd');
        endDate = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last7':
        startDate = format(subDays(now, 7), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'last30':
        startDate = format(subDays(now, 30), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case '':
      case 'clear':
        startDate = '';
        endDate = '';
        break;
      default:
        return;
    }

    setFilters(prev => ({ ...prev, startDate, endDate, timeRange: range === 'clear' ? '' : range }));
    setPage(1);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  const toggleOrderSelection = (orderNumber: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderNumber)
        ? prev.filter(id => id !== orderNumber)
        : [...prev, orderNumber]
    );
  };

  const toggleAllSelection = () => {
    if (orders.every(o => selectedOrders.includes(o.orderNumber))) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.orderNumber));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!newStatus) return;
    if (!window.confirm(t('orders.confirmBulkUpdate', { count: selectedOrders.length, status: getStatusText(newStatus) }))) return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post('/orders-new/bulk/status', {
        orderIds: selectedOrders,
        status: newStatus
      });

      const data = response.data;

      if (data.success) {
        alert(t('orders.ordersUpdated'));
        fetchOrders(); // Refresh data
        setSelectedOrders([]);
      } else {
        alert(data.message || t('orders.updateFailed'));
      }
    } catch (error: any) {
      console.error('Error bulk updating:', error);
      const errorMessage = error.response?.data?.message || error.message || t('orders.bulkUpdateError');
      alert(t('orders.updateFailedMsg', { error: errorMessage }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(t('orders.confirmBulkDelete', { count: selectedOrders.length }))) return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post('/orders-new/bulk/delete', {
        orderIds: selectedOrders
      });

      const data = response.data;

      if (data.success) {
        alert(t('orders.ordersDeleted'));
        fetchOrders();
        setSelectedOrders([]);
      } else {
        alert(data.message || t('orders.deleteFailed'));
      }
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      const errorMessage = error.response?.data?.message || error.message || t('orders.bulkDeleteError');
      alert(t('orders.deleteFailedMsg', { error: errorMessage }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const handleBulkPrintInvoices = async () => {
    if (selectedOrders.length === 0) {
      alert('الرجاء اختيار طلبات أولاً');
      return;
    }

    // للطباعة الجماعية، نفتح صفحة منفصلة
    if (selectedOrders.length > 1) {
      if (!window.confirm(`هل تريد طباعة فواتير ${selectedOrders.length} طلب؟`)) return;

      try {
        setPrintingInvoices(true);
        const response = await apiClient.post('/order-invoices/bulk-generate', {
          orderIds: selectedOrders
        });

        if (response.data.success) {
          const { success, existing, failed, invoices } = response.data.data;

          if (invoices && invoices.length > 0) {
            const invoiceIds = invoices.map((inv: any) => inv.id);
            const printUrl = `/orders/invoices/print-multiple?ids=${invoiceIds.join(',')}`;
            window.open(printUrl, '_blank');
          }

          alert(`✅ تم إنشاء ${success.length} فاتورة جديدة\n📋 ${existing.length} فاتورة موجودة\n❌ ${failed.length} فشلت`);
          setSelectedOrders([]);
        }
      } catch (error: any) {
        console.error('Error bulk printing invoices:', error);
        alert('خطأ في طباعة الفواتير');
      } finally {
        setPrintingInvoices(false);
      }
    } else {
      // لفاتورة واحدة، نعرضها في modal
      try {
        setPrintingInvoices(true);
        const response = await apiClient.post('/order-invoices/bulk-generate', {
          orderIds: selectedOrders
        });

        if (response.data.success) {
          const { invoices } = response.data.data;

          if (invoices && invoices.length > 0) {
            setSelectedInvoice(invoices[0]);
          }
        }
      } catch (error: any) {
        console.error('Error generating invoice:', error);
        alert('خطأ في توليد الفاتورة');
      } finally {
        setPrintingInvoices(false);
      }
    }
  };

  const handleBulkCreateTurboShipments = async () => {
    if (!window.confirm(t('orders.confirmTurboShipments', { count: selectedOrders.length }))) return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post('/turbo/bulk/create-shipments', {
        orderIds: selectedOrders
      });

      if (response.data.success) {
        const { success, failed, skipped } = response.data.data;
        let message = t('orders.shipmentsCreated', { success });
        if (failed > 0) message += `\n${t('orders.shipmentsFailed', { failed })}`;
        if (skipped > 0) message += `\n${t('orders.shipmentsSkipped', { skipped })}`;
        alert(message);
        setSelectedOrders([]);
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Error bulk creating shipments:', error);
      alert(error.response?.data?.error || t('orders.createShipmentsFailed'));
    } finally {
      setBulkProcessing(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'scheduled': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'processing': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('orders.pending');
      case 'confirmed': return t('orders.confirmed');
      case 'scheduled': return 'مجدول';
      case 'processing': return t('orders.processing');
      case 'shipped': return t('orders.shipped');
      case 'delivered': return t('orders.delivered');
      case 'cancelled': return t('orders.cancelled');
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return t('orders.completed');
      case 'pending': return t('orders.pendingPayment');
      case 'failed': return t('orders.failed');
      default: return status;
    }
  };


  const handleUpdateStatus = async (orderNumber: string, newStatus: string) => {
    try {
      const response = await apiClient.post(`/orders-new/simple/${orderNumber}/status`, {
        status: newStatus
      });
      const data = response.data;
      if (data.success) {
        const normalizedStatus = newStatus.toLowerCase();
        setOrders(orders.map(order =>
          order.orderNumber === orderNumber ? { ...order, status: normalizedStatus as any } : order
        ));
        if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
          setSelectedOrder({ ...selectedOrder, status: normalizedStatus as any });
        }
      } else {
        alert(data.message || t('orders.statusUpdateFailed'));
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.message || error.message || t('orders.updateError');
      alert(t('orders.statusUpdateFailedMsg', { error: errorMessage }));
    }
  };

  const handleUpdatePaymentStatus = async (orderNumber: string, newStatus: string) => {
    try {
      const response = await apiClient.post(`/orders-new/simple/${orderNumber}/payment-status`, {
        paymentStatus: newStatus
      });
      const data = response.data;
      if (data.success) {
        const normalizedStatus = newStatus.toLowerCase();
        setOrders(orders.map(order =>
          order.orderNumber === orderNumber ? { ...order, paymentStatus: normalizedStatus as any } : order
        ));
        if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
          setSelectedOrder({ ...selectedOrder, paymentStatus: normalizedStatus as any });
        }
      } else {
        alert(data.message || t('orders.paymentStatusUpdateFailed'));
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      const errorMessage = error.response?.data?.message || error.message || t('orders.paymentUpdateError');
      alert(t('orders.paymentUpdateFailedMsg', { error: errorMessage }));
    }
  };

  const handleMarkAsViewed = async (orderId: string) => {
    try {
      await apiClient.post(`/orders-new/simple/${orderId}/viewed`);

      setOrders(prev => prev.map(o =>
        (o.id === orderId || o.orderNumber === orderId) ? { ...o, isViewed: true } : o
      ));
    } catch (error) {
      console.error('Error marking order as viewed:', error);
    }
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    if (!order.isViewed) {
      handleMarkAsViewed(order.orderNumber);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-4"></div>



      {/* Compact Filters Section */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-all duration-300">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search and Statuses */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-grow min-w-[200px] lg:max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={t('orders.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pr-10 pl-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 text-sm transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative min-w-[130px] flex-1 sm:flex-none">
                <FunnelIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filters.timeRange}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm transition-colors"
                >
                  <option value="">{t('orders.allDates')}</option>
                  <option value="today">{t('orders.today')}</option>
                  <option value="yesterday">{t('orders.yesterday')}</option>
                  <option value="last7">{t('orders.last7Days')}</option>
                  <option value="thisMonth">{t('orders.thisMonth')}</option>
                  <option value="custom">{t('orders.customPeriod')}</option>
                </select>
              </div>

              <div className="relative min-w-[130px] flex-1 sm:flex-none">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full pr-3 pl-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm transition-colors"
                >
                  <option value="">{t('orders.allStatuses')}</option>
                  <option value="pending">{t('orders.pending')}</option>
                  <option value="confirmed">{t('orders.confirmed')}</option>
                  <option value="scheduled">مجدول</option>
                  <option value="processing">{t('orders.processing')}</option>
                  <option value="shipped">{t('orders.shipped')}</option>
                  <option value="delivered">{t('orders.delivered')}</option>
                  <option value="cancelled">{t('orders.cancelled')}</option>
                </select>
              </div>

              <div className="relative min-w-[130px] flex-1 sm:sm:flex-none">
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm transition-colors"
                >
                  <option value="">{t('orders.allPaymentStatuses')}</option>
                  <option value="completed">{t('orders.completed')}</option>
                  <option value="pending">{t('orders.pendingPayment')}</option>
                  <option value="failed">{t('orders.failed')}</option>
                </select>
              </div>

              <button
                onClick={() => handleFilterChange('onlyUnseen', !filters.onlyUnseen)}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs sm:text-sm transition-colors min-w-[100px] flex-1 sm:flex-none ${filters.onlyUnseen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50'
                  }`}
              >
                <EyeIcon className="w-4 h-4" />
                <span className="whitespace-nowrap">{filters.onlyUnseen ? t('orders.showAll') : t('orders.unseen')}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Custom Date Range - Only shown if custom is selected or if there's already a date but no range name */}
          {(filters.timeRange === 'custom' || (!filters.timeRange && (filters.startDate || filters.endDate))) && (
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-50 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">من</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      handleFilterChange('startDate', e.target.value);
                      if (filters.timeRange !== 'custom') handleFilterChange('timeRange', 'custom');
                    }}
                    className="bg-transparent border-none p-0 text-xs focus:ring-0 dark:text-gray-100 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">إلى</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      handleFilterChange('endDate', e.target.value);
                      if (filters.timeRange !== 'custom') handleFilterChange('timeRange', 'custom');
                    }}
                    className="bg-transparent border-none p-0 text-xs focus:ring-0 dark:text-gray-100 cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setQuickDate('clear')}
                  className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  إلغاء التصفية
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Toolbar */}
      {isAdmin && selectedOrders.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">{t('orders.ordersSelected', { count: selectedOrders.length })}</span>
          </div>
          <div className="flex gap-3">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  handleBulkStatusUpdate(val);
                  e.target.value = ''; // Reset
                }
              }}
              className="px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
              disabled={bulkProcessing}
            >
              <option value="">{t('orders.updateStatus')}</option>
              <option value="pending">{t('orders.pending')}</option>
              <option value="confirmed">{t('orders.confirmed')}</option>
              <option value="processing">{t('orders.processing')}</option>
              <option value="shipped">{t('orders.shipped')}</option>
              <option value="delivered">{t('orders.delivered')}</option>
              <option value="cancelled">{t('orders.cancelled')}</option>
            </select>
            <button
              onClick={handleBulkPrintInvoices}
              disabled={printingInvoices}
              className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              <PrinterIcon className="w-4 h-4 ml-2" />
              {printingInvoices ? 'جاري الطباعة...' : 'طباعة الفواتير'}
            </button>
            <button
              onClick={handleBulkCreateTurboShipments}
              disabled={bulkProcessing}
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <RocketLaunchIcon className="w-4 h-4 ml-2" />
              {bulkProcessing ? t('orders.creating') : t('orders.createTurboShipments')}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              {bulkProcessing ? t('orders.processing2') : t('orders.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                    onChange={toggleAllSelection}
                    checked={orders.length > 0 && orders.every(o => selectedOrders.includes(o.orderNumber))}
                  />
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.orderNumber')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.customer')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.amount')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.status')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.payment')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.date')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('orders.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded"></div></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBagIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('orders.noOrders')}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('orders.noOrdersFound')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  return (
                    <tr
                      key={order.id || idx}
                      onClick={() => {
                        handleOpenOrder(order);
                      }}
                      className={`hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 group ${selectedOrders.includes(order.orderNumber)
                        ? 'bg-blue-50/60 dark:bg-blue-900/30'
                        : (!order.isViewed ? 'bg-blue-50 dark:bg-blue-900/20' : '')
                        }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                          checked={selectedOrders.includes(order.orderNumber)}
                          onChange={() => toggleOrderSelection(order.orderNumber)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-gray-100">#{order.orderNumber}</span>
                        {order.metadata?.isGuestOrder && (
                          <span className="mr-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{t('orders.guest')}</span>
                        )}
                        {!order.isViewed && (
                          <span className="mr-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
                            جديد
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{getCustomerDisplayName(order)}</span>
                          {order.customerPhone && (
                            <span className="text-gray-500 dark:text-gray-400 text-sm" dir="ltr">{order.customerPhone}</span>
                          )}
                          {order.extractionMethod && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {order.extractionMethod === 'ai_enhanced' ? t('orders.aiEnhanced') :
                                order.extractionMethod === 'ai_basic' ? t('orders.aiBasic') :
                                  order.extractionMethod === 'manual' ? t('orders.manual') : order.extractionMethod}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {(() => {
                          try {
                            // PRIORITIZE: subtotal + shipping + tax for consistency with OrderDetails
                            const subtotal = typeof order.subtotal === 'number' ? order.subtotal : 0;
                            const shipping = typeof order.shipping === 'number' ? order.shipping : 0;
                            const tax = typeof order.tax === 'number' ? order.tax : 0;

                            const amount = (subtotal + shipping + tax) || order.total || 0;
                            return formatPrice(amount);
                          } catch (e) {
                            return '0.00';
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor((order.status || '').toLowerCase())}`}>
                            {getStatusText((order.status || '').toLowerCase())}
                          </span>
                          {order.isScheduled && order.scheduledDeliveryDate && (
                            <span className="text-xs text-gray-600 dark:text-gray-400" dir="ltr">
                              📅 {new Date(order.scheduledDeliveryDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {order.confidence && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(order.confidence)}`}>
                              {getConfidenceIcon(order.confidence)}
                              <span className="mr-1">{(order.confidence * 100).toFixed(0)}%</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor((order.paymentStatus || 'pending').toLowerCase())}`}>
                          {getPaymentStatusText((order.paymentStatus || 'pending').toLowerCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm" title={formatDate(order.createdAt || new Date().toISOString())}>
                        {(() => {
                          try {
                            return getRelativeTime(order.createdAt || new Date().toISOString());
                          } catch (e) {
                            return '-';
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setShowOrderModal(true);
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t('orders.quickView')}
                          >
                            <ShoppingBagIcon className="w-5 h-5" />
                          </button>
                          <Link
                            to={`/orders/${order.orderNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t('orders.viewFullDetails')}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </Link>
                          {order.conversationId && (
                            <Link
                              to={`/whatsapp?conversationId=${order.conversationId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title={t('orders.conversation')}
                            >
                              <ChatBubbleLeftRightIcon className="w-5 h-5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && orders.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('orders.showing')} {((page - 1) * limit) + 1} {t('orders.to')} {Math.min(page * limit, totalOrders)} {t('orders.of')} {totalOrders} {t('orders.orders2')}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">عرض:</label>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && page > 3) {
                    p = page - 2 + i;
                  }
                  if (p > totalPages) return null;

                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === p
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Order Modal */}
      {
        selectedOrder && (
          <EnhancedOrderModal
            order={selectedOrder as any}
            isOpen={showOrderModal}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrder(null);
            }}
            onOrderUpdate={(updatedOrder) => {
              setSelectedOrder(updatedOrder);
              setOrders(orders.map(o =>
                o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o
              ));
            }}
          />
        )
      }

      {/* Invoice Modal */}
      {
        selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )
      }
    </div >
  );
};

export default Orders;
