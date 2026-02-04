import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, StarIcon, ExclamationTriangleIcon, InformationCircleIcon, PrinterIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '../../hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/apiClient';
import { Link } from 'react-router-dom';

interface EnhancedOrderModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: any) => void;
}

const EnhancedOrderModal: React.FC<EnhancedOrderModalProps> = ({ order, isOpen, onClose, onOrderUpdate }) => {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await apiClient.post(`/orders-new/simple/${order.orderNumber}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        const updatedOrder = { ...order, status: newStatus.toLowerCase() };
        if (onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }
      } else {
        setError(response.data.message || t('orders.statusUpdateFailed'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('orders.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await apiClient.post(`/orders-new/simple/${order.orderNumber}/payment-status`, {
        paymentStatus: newStatus
      });

      if (response.data.success) {
        const updatedOrder = { ...order, paymentStatus: newStatus.toLowerCase() };
        if (onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }
      } else {
        setError(response.data.message || t('orders.paymentStatusUpdateFailed'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('orders.paymentUpdateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      setIsPrinting(true);
      setError(null);
      const response = await apiClient.post('/order-invoices/bulk-generate',
        { orderIds: [order.orderNumber] }
      );

      if (response.data.success && response.data.data.invoices?.length > 0) {
        const invoice = response.data.data.invoices[0];
        window.open(`/orders/invoices/print-multiple?ids=${invoice.id}`, '_blank');
      } else {
        setError(t('orders.invoiceGenerationFailed') || 'Failed to generate invoice');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('orders.invoiceError') || 'Error generating invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  const getCustomerDisplayName = () => {
    if (order.customer) {
      const fullName = `${order.customer.firstName} ${order.customer.lastName}`.trim();
      if (fullName !== 'New Customer' && fullName !== 'Customer Not Specified' && fullName !== 'Customer') {
        return fullName;
      }
    }

    if (order.customerName && !order.customerName.match(/^\d+/)) {
      return order.customerName;
    }

    if (order.customerName && order.customerName.match(/^\d+/)) {
      return `${t('orders.facebookCustomer')} (${order.customerName.substring(0, 8)}...)`;
    }

    return t('orders.notSpecifiedCustomer');
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';

    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const [governments, setGovernments] = useState<any[]>([]);

  useEffect(() => {
    const fetchGovernments = async () => {
      try {
        const response = await apiClient.get('/turbo/governments');
        if (response.data.success && response.data.data?.governments) {
          setGovernments(response.data.data.governments);
        }
      } catch (error) {
        console.error('Failed to fetch governments in modal:', error);
      }
    };
    if (isOpen) {
      fetchGovernments();
    }
  }, [isOpen]);

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <InformationCircleIcon className="h-4 w-4" />;

    if (confidence >= 0.8) return <StarIcon className="h-4 w-4" />;
    return <ExclamationTriangleIcon className="h-4 w-4" />;
  };

  const getLocationDisplayName = (val: any) => {
    if (!val) return null;

    // Check if it's a numeric ID for governorates
    const numId = parseInt(String(val));
    if (!isNaN(numId) && governments.length > 0) {
      const found = governments.find(g => g.id === numId);
      if (found) return found.name;
    }

    // Clean numeric prefix (e.g., "2339:Cairo")
    return String(val).replace(/^\d+:/, '').trim();
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-80 overflow-y-auto h-full w-full z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative top-4 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 md:w-3/5 lg:w-1/2 xl:w-2/5 max-w-3xl shadow-2xl rounded-xl bg-white dark:bg-gray-800 mb-8"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('orders.orderDetails')} #{order.orderNumber}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={t('orders.close')}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Customer Info */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t('orders.customerInfo')}
            </h4>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('orders.name')}</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{getCustomerDisplayName()}</span>
                </div>
                {order.customerPhone && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('orders.phone')}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium" dir="ltr">{order.customerPhone}</span>
                  </div>
                )}
                {(order.governorate || order.shippingAddress?.governorate) && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('orders.governorate')}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {getLocationDisplayName(order.governorate || order.shippingAddress?.governorate)}
                    </span>
                  </div>
                )}
                {(order.city || order.shippingAddress?.city) && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('orders.city')}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {getLocationDisplayName(order.city || order.shippingAddress?.city)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t('orders.products')}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
              {!order.items || order.items.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {t('orders.noProducts')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {item.productName || item.name || t('orders.productNotSpecified')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('orders.quantity')}: {item.quantity}
                          </p>
                          {(item.productColor || item.productSize || item.metadata?.color || item.metadata?.size) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                              {(item.productColor || item.metadata?.color) && (
                                <span>🎨 {item.productColor || item.metadata?.color}</span>
                              )}
                              {(item.productSize || item.metadata?.size) && (
                                <span>📏 {item.productSize || item.metadata?.size}</span>
                              )}
                            </div>
                          )}
                          {(item.confidence || item.metadata?.confidence) && (
                            <div className={`flex items-center mt-2 ${getConfidenceColor(item.confidence || item.metadata?.confidence)}`}>
                              {getConfidenceIcon(item.confidence || item.metadata?.confidence)}
                              <span className="text-xs ml-1 font-medium">
                                {t('orders.confidence')}: {((item.confidence || item.metadata?.confidence) * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                            {formatPrice(item.total || (item.price * item.quantity))}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatPrice(item.price)} / {t('orders.unit')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t('orders.orderSummary')}
            </h4>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{t('orders.subtotal')}:</span>
                  <span className="font-medium">{formatPrice(order.subtotal || 0)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>{t('orders.tax')}:</span>
                    <span className="font-medium">{formatPrice(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{t('orders.shipping')}:</span>
                  <span className="font-medium">{formatPrice(order.shipping || 0)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-blue-300 dark:border-blue-700 text-lg font-bold text-gray-900 dark:text-gray-100">
                  <span>{t('orders.total')}:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatPrice(order.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>


          {/* Update Status Section */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t('orders.updateOrder')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('orders.orderStatus')}
                </label>
                <select
                  value={(order.status || 'pending').toLowerCase()}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="pending">{t('orders.pending')}</option>
                  <option value="confirmed">{t('orders.confirmed')}</option>
                  <option value="processing">{t('orders.processing')}</option>
                  <option value="shipped">{t('orders.shipped')}</option>
                  <option value="delivered">{t('orders.delivered')}</option>
                  <option value="cancelled">{t('orders.cancelled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('orders.paymentStatus')}
                </label>
                <select
                  value={(order.paymentStatus || 'pending').toLowerCase()}
                  onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="pending">{t('orders.pendingPayment')}</option>
                  <option value="completed">{t('orders.completed')}</option>
                  <option value="failed">{t('orders.failed')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conversation Link */}
          {order.conversationId && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">●</span>
                {t('orders.conversation')}
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    const isWhatsApp = order.conversation?.channel === 'whatsapp' ||
                      order.extractionMethod?.includes('whatsapp') ||
                      order.sourceType === 'whatsapp';
                    const url = isWhatsApp
                      ? `/whatsapp?conversation=${order.conversationId}`
                      : `/facebook-inbox?conversation=${order.conversationId}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  {t('orders.viewConversation')}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">●</span>
                {t('orders.notes')}
              </h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <button
                onClick={handlePrintInvoice}
                disabled={isPrinting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <PrinterIcon className="h-5 w-5" />
                {isPrinting ? t('orders.printing') : t('orders.printInvoice')}
              </button>
              <Link
                to={`/orders/${order.orderNumber}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {t('orders.viewFullDetails')}
              </Link>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              {t('orders.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOrderModal;
