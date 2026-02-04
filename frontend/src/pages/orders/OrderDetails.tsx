
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAuth } from '../../hooks/useAuthSimple';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import {
  ArrowPathIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import SimplifiedProductSelectionModal from './components/SimplifiedProductSelectionModal';

// Components
import OrderHeader from './components/OrderHeader';
import OrderItemsCard from './components/OrderItemsCard';
import CustomerInfoCard from './components/CustomerInfoCard';
import TurboShippingPanel from './components/TurboShippingPanel';
import OrderActivityLog from './components/OrderActivityLog';
import OrderSourceCard from './components/OrderSourceCard';
import ConfirmationModal from './components/ConfirmationModal';

// Hooks
import { useOrderDetails } from './hooks/useOrderDetails';
import { useTurboShipping } from './hooks/useTurboShipping';
import { OrderDetailsType } from './types';

const OrderDetails: React.FC = () => {
  const { id: orderNumber } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Custom Hooks
  const {
    order,
    setOrder,
    loading,
    updating,
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    selectedGovernmentId,
    setSelectedGovernmentId,
    orderNotes,
    handleGovernmentChange,
    updateStatus,
    updatePaymentStatus,
    addNote,
    saveChanges
  } = useOrderDetails(orderNumber);

  const {
    turboLoading,
    turboTrackingData,
    shippingComparison,
    createShipment,
    getWaybill,
    cancelShipment,
    calculateShipping,
    setTurboTrackingData
  } = useTurboShipping(order, setOrder);

  // Local UI State (Modals)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCancelShipmentModal, setShowCancelShipmentModal] = useState(false);

  // Temporary Form State for Modals
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Local state needed for Child Component Props (CustomerInfoCard)
  const [parsingAddress, setParsingAddress] = useState(false);
  const [parsedAddress, setParsedAddress] = useState<{
    government_id: number;
    government_name: string;
    area_id: number | null;
    area_name: string | null;
  } | null>(null);


  // Auth Check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [authLoading, isAuthenticated]);

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !order) return false;

    // Check if any field has changed
    const hasChanges =
      editForm.customerName !== order.customerName ||
      editForm.customerPhone !== (order.customerPhone || '') ||
      editForm.alternativePhone !== (order.alternativePhone || '') ||
      editForm.customerAddress !== (order.customerAddress || '') ||
      editForm.city !== (order.city || '') ||
      editForm.notes !== (order.notes || '') ||
      JSON.stringify(editForm.items) !== JSON.stringify(order.items);

    return hasChanges;
  }, [isEditing, order, editForm]);

  // Warn about unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges,
    message: 'لديك تعديلات غير محفوظة على الطلب. هل أنت متأكد من المغادرة؟'
  });

  // Calculate real-time totals during editing
  const calculatedTotals = useMemo(() => {
    if (!isEditing || !order) {
      const subtotal = order?.subtotal || 0;
      const shipping = order?.shipping || 0;
      const tax = order?.tax || 0;
      return {
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping + tax // ✅ Force consistent calculation
      };
    }

    const subtotal = editForm.items.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);

    const shipping = typeof editForm.shipping === 'number' ? editForm.shipping : (parseFloat(editForm.shipping) || 0);
    const tax = typeof editForm.tax === 'number' ? editForm.tax : (parseFloat(editForm.tax) || 0);
    const total = subtotal + shipping + tax;

    return { subtotal, shipping, tax, total };
  }, [isEditing, editForm.items, editForm.shipping, editForm.tax, order]);

  // Handlers
  const handlePrintInvoice = async () => {
    if (!order) return;

    try {
      // توليد فاتورة للطلب
      const response = await fetch(`/api/v1/order-invoices/generate/${order.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        // فتح صفحة الفاتورة في تاب جديد
        window.open(`/orders/invoice/${result.data.id}`, '_blank');
      } else {
        alert('خطأ في توليد الفاتورة');
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      alert('خطأ في توليد الفاتورة');
    }
  };

  const handlePrintPolicy = async () => {
    if (!order) return;

    try {
      console.log('🔄 Generating policy HTML for order:', order.orderNumber);
      
      // Generate and open policy HTML in new window
      const response = await fetch(`/api/v1/policy/generate/${order.orderNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في توليد البوليصة');
      }

      // Get the HTML content
      const htmlContent = await response.text();
      
      // Open in new window for printing
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
        // Auto-focus and trigger print dialog
        newWindow.focus();
        setTimeout(() => {
          newWindow.print();
        }, 500);
      } else {
        throw new Error('فشل في فتح نافذة جديدة للطباعة');
      }
      
      console.log('✅ Policy HTML opened successfully');
      
    } catch (error: any) {
      console.error('Error generating policy HTML:', error);
      alert(`خطأ في توليد بوليصة الشحن: ${error.message}`);
    }
  };

  const onUpdateStatus = async () => {
    const success = await updateStatus(newStatus, statusNotes);
    if (success) {
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
    }
  };

  const onUpdatePaymentStatus = async () => {
    const success = await updatePaymentStatus(newPaymentStatus, paymentNotes);
    if (success) {
      setShowPaymentModal(false);
      setNewPaymentStatus('');
      setPaymentNotes('');
    }
  };

  const handleProductSelect = (product: any, variant?: any) => {
    // ✅ Extract variant data properly
    let productColor = '';
    let productSize = '';
    let actualPrice = product.price;
    let metadata: any = {};

    if (variant) {
      // Extract color and size from variant
      if (variant.color) productColor = variant.color;
      if (variant.size) productSize = variant.size;

      // Use variant price if available
      if (variant.price && parseFloat(variant.price) > 0) {
        actualPrice = parseFloat(variant.price);
      }

      // Parse variant attributes from metadata
      if (variant.metadata) {
        try {
          const variantMeta = typeof variant.metadata === 'string'
            ? JSON.parse(variant.metadata)
            : variant.metadata;

          metadata = variantMeta;

          // Extract from attributes array
          if (variantMeta.attributes && Array.isArray(variantMeta.attributes)) {
            variantMeta.attributes.forEach((attr: any) => {
              if (attr.type === 'color' && attr.option && !productColor) {
                productColor = attr.option;
              }
              if (attr.type === 'size' && attr.option && !productSize) {
                productSize = attr.option;
              }
            });
          }

          // Extract from attributeValues
          if (variantMeta.attributeValues) {
            if (variantMeta.attributeValues['اللون'] && !productColor) {
              productColor = variantMeta.attributeValues['اللون'];
            }
            if (variantMeta.attributeValues['المقاس'] && !productSize) {
              productSize = variantMeta.attributeValues['المقاس'];
            }
          }
        } catch (e) {
          console.error('Error parsing variant metadata:', e);
        }
      }

      // Parse from variant name if still empty
      if (variant.name && (!productColor || !productSize)) {
        const name = variant.name;

        // If explicit type is color and no separator
        if (variant.type === 'color' && !name.includes('-') && !name.includes('|')) {
          if (!productColor) productColor = name.trim();
        } else {
          // Handle both hyphen and pipe separators
          const parts = name.split(/\s*[-–|]\s*/).filter((p: any) => p.trim());

          if (parts.length >= 2) {
            // Assumption: Color is often first, Size is often last
            if (!productColor) productColor = parts[0].trim();
            if (!productSize) productSize = parts[parts.length - 1].trim();
          } else if (parts.length === 1) {
            // Logic for single part found
            const val = parts[0].trim();
            // If it looks like a number, it might be size? If text, might be color?
            if (isNaN(parseFloat(val)) && !productColor) {
              productColor = val;
            } else if (!productSize) {
              productSize = val;
            }
          }
        }
      }
    }

    // ✅ Validate price
    if (actualPrice <= 0) {
      alert('السعر يجب أن يكون أكبر من صفر');
      return;
    }

    // ✅ Check for duplicates
    const isDuplicate = editForm.items.some((item: any) =>
      item.productId === product.id &&
      item.productColor === productColor &&
      item.productSize === productSize
    );

    if (isDuplicate) {
      alert('هذا المنتج موجود بالفعل في الطلب');
      return;
    }

    // ✅ Extract Image
    let productImage = '';

    // Helper to get first image from string or array
    const getFirstImage = (imgData: any) => {
      if (!imgData) return '';
      if (Array.isArray(imgData)) return imgData[0];
      if (typeof imgData === 'string') {
        if (imgData.startsWith('[')) {
          try {
            const parsed = JSON.parse(imgData);
            return Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (e) { return imgData; }
        }
        return imgData;
      }
      return '';
    };

    productImage = getFirstImage(variant?.images) || getFirstImage(variant?.image) || getFirstImage(product.images) || getFirstImage(product.image) || '';

    const newItem = {
      productId: variant?.id || product.id,
      productName: product.name,
      price: actualPrice,
      quantity: 1,
      total: actualPrice,
      productColor,
      productSize,
      productImage, // ✅ ADDED: Image field
      metadata: {
        ...metadata,
        image: productImage, // Add to metadata as backup
        variantId: variant?.id,
        sku: variant?.sku || product.sku,
        originalProductId: product.id
      }
    };

    setEditForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowAddProductModal(false);
    // تم إضافة المنتج بنجاح
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setEditForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate total for item
      if (field === 'price' || field === 'quantity') {
        const price = parseFloat(newItems[index].price) || 0;
        const qty = parseInt(newItems[index].quantity) || 1;
        newItems[index].total = price * qty;
      }
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditForm(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleParseAddress = async () => {
    // Placeholder for address parsing logic simulation
    setParsingAddress(true);
    setTimeout(() => setParsingAddress(false), 1000);
  };


  const handleCreateShipment = async () => {
    await createShipment();
  };

  const handlePrintWaybill = async () => {
    const waybillData = await getWaybill();
    if (waybillData) {
      // In a real scenario, open PDF or print window
      console.log('Waybill Data:', waybillData);
    }
  };

  const handleCalculateShipping = async () => {
    if (!order) return;
    // Try to extract gov and city
    let gov = '';
    let city = order.city || '';

    const addr = order.shippingAddress || order.customerAddress;
    if (typeof addr === 'string' && addr.startsWith('{')) {
      try {
        const parsed = JSON.parse(addr);
        gov = parsed.governorate || parsed.government || '';
        if (!city) city = parsed.city || parsed.area || '';
      } catch (e) { }
    } else if (typeof addr === 'object') {
      const obj = addr as any;
      gov = obj.governorate || obj.government || '';
      if (!city) city = obj.city || obj.area || '';
    }

    await calculateShipping(gov, city);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('orderDetails.orderNotFound')}</h2>
          <Link to="/orders" className="text-blue-600 hover:text-blue-500 mt-4 inline-block">
            {t('orderDetails.backToOrders')}
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusConfig = orderStatuses.find(s => s.code === order.status) || {
    code: order.status,
    name: order.status.replace(/_/g, ' '),
    color: '#6B7280'
  };

  console.log('🔍 Order Status Debug:', {
    orderStatus: order.status,
    orderStatuses: orderStatuses,
    currentStatusConfig: currentStatusConfig
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <OrderHeader
        order={order}
        isEditing={isEditing}
        updating={updating}
        onEdit={() => setIsEditing(true)}
        onCancel={() => { setIsEditing(false); if (order) setEditForm({ ...editForm, items: order.items }); }}
        onSave={saveChanges}
        onPrint={handlePrintInvoice}
        onPrintPolicy={handlePrintPolicy}
        onBack={() => navigate('/orders')}
        currentStatusConfig={currentStatusConfig}
      />

      {/* Quick Actions Bar (Below Header) - If we want to trigger status changes from here */}
      <div className="mt-4 flex gap-4">
        {/* Example: Button to change status if not isEditing */}
        {!isEditing && (
          <>
            <button
              onClick={() => setShowStatusModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ArrowPathIcon className="ml-2 -mr-0.5 h-4 w-4" />
              {t('orderDetails.updateStatus')}
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <CreditCardIcon className="ml-2 -mr-0.5 h-4 w-4" />
              {t('orderDetails.updatePayment')}
            </button>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-flow-col-dense lg:grid-cols-3">

        {/* RIGHT COLUMN (Main Info) */}
        <div className="space-y-6 lg:col-span-2">

          {/* Items Card */}
          <OrderItemsCard
            isEditing={isEditing}
            items={isEditing ? editForm.items : order.items}
            currency={order.currency}
            totals={calculatedTotals}
            onAddItem={() => setShowAddProductModal(true)}
            onItemChange={handleItemChange}
            onRemoveItem={handleRemoveItem}
            onShippingChange={(val) => setEditForm(prev => ({ ...prev, shipping: val }))}
            onTaxChange={(val) => setEditForm(prev => ({ ...prev, tax: val }))}
          />

          {/* Turbo Shipping Panel */}
          <TurboShippingPanel
            order={order}
            turboTrackingData={turboTrackingData}
            shippingComparison={shippingComparison}
            loadingComparison={false}
            turboLoading={turboLoading}
            onCreateShipment={handleCreateShipment}
            onPrintWaybill={handlePrintPolicy}
            onCancelShipment={() => setShowCancelShipmentModal(true)}
            onCalculateShipping={handleCalculateShipping}
          />

        </div>

        {/* LEFT COLUMN (Sidebar) */}
        <div className="space-y-6 lg:col-span-1">

          <CustomerInfoCard
            order={order}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            governments={governments}
            areas={areas}
            loadingGovernments={loadingGovernments}
            loadingAreas={loadingAreas}
            selectedGovernmentId={selectedGovernmentId}
            setSelectedGovernmentId={setSelectedGovernmentId}
            handleGovernmentChange={handleGovernmentChange}
            handleParseAddress={handleParseAddress}
            parsingAddress={parsingAddress}
            parsedAddress={parsedAddress}
          />

          {/* Order Source Card */}
          <OrderSourceCard order={order} />

          {/* Order Activity Log */}
          <OrderActivityLog
            order={{
              ...order,
              statusHistory: order.statusHistory || [],
              orderNotes: orderNotes
            }}
            onAddNote={addNote}
            addingNote={false}
          />

          {/* Scheduled Order Info */}
          {order.isScheduled && order.scheduledDeliveryDate && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">تاريخ الجدولة</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">📅 تاريخ التسليم المحدد</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100" dir="ltr">
                          {new Date(order.scheduledDeliveryDate).toLocaleDateString('ar-EG', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">🕐 وقت التسليم</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100" dir="ltr">
                          {new Date(order.scheduledDeliveryDate).toLocaleTimeString('ar-EG', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {order.scheduledNotes && (
                      <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                        <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">📝 ملاحظات الجدولة</span>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{order.scheduledNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {order.autoTransitionEnabled && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-3">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>التحويل التلقائي مفعّل - سيتم تحويل الطلب تلقائياً عند حلول الموعد</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SimplifiedProductSelectionModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductSelected={handleProductSelect}
      />

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={() => setShowStatusModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <ArrowPathIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">{t('orderDetails.updateOrderStatus')}</h3>
                  <div className="mt-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">{t('orderDetails.selectStatus')}</option>
                      {orderStatuses.map((status) => (
                        <option key={status.code} value={status.code}>{status.name}</option>
                      ))}
                    </select>
                    <textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-4 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                      placeholder={t('orderDetails.notesOptional')}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 dark:bg-blue-500 text-base font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                  onClick={onUpdateStatus}
                  disabled={updating}
                >
                  {updating ? t('orderDetails.updating') : t('orderDetails.updateStatusButton')}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowStatusModal(false)}
                >
                  {t('orderDetails.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={() => setShowPaymentModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20">
                  <CreditCardIcon className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">{t('orderDetails.updatePaymentStatus')}</h3>
                  <div className="mt-2">
                    <select
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">{t('orderDetails.selectStatus')}</option>
                      {paymentStatuses.map((status) => (
                        <option key={status.code} value={status.code}>{status.name}</option>
                      ))}
                    </select>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-4 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                      placeholder={t('orderDetails.notesOptional')}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 dark:bg-green-500 text-base font-medium text-white hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm"
                  onClick={onUpdatePaymentStatus}
                  disabled={updating}
                >
                  {updating ? t('orderDetails.updating') : t('orderDetails.updatePaymentButton')}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowPaymentModal(false)}
                >
                  {t('orderDetails.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      <ConfirmationModal
        isOpen={showCancelShipmentModal}
        onClose={() => setShowCancelShipmentModal(false)}
        onConfirm={async () => {
          const success = await cancelShipment();
          if (success) setShowCancelShipmentModal(false);
        }}
        title={t('orderDetails.cancelShipment')}
        message={t('orderDetails.cancelShipmentConfirm')}
        confirmText={t('orderDetails.yesCancelShipment')}
        cancelText={t('orderDetails.goBack')}
        isDangerous={true}
        isLoading={turboLoading}
      />

    </div>
  );
};

export default OrderDetails;

