import React from 'react';
import {
    TruckIcon,
    DocumentArrowDownIcon,
    XMarkIcon,
    ArrowPathIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderDetailsType } from '../types';

interface TurboShippingPanelProps {
    order: OrderDetailsType;
    turboTrackingData: any;
    shippingComparison: any;
    loadingComparison: boolean;
    turboLoading: boolean;
    onCreateShipment: () => void;
    onPrintWaybill: () => void;
    onCancelShipment: () => void;
    onCalculateShipping: () => void;
}

const TurboShippingPanel: React.FC<TurboShippingPanelProps> = ({
    order,
    turboTrackingData,
    shippingComparison,
    loadingComparison,
    turboLoading,
    onCreateShipment,
    onPrintWaybill,
    onCancelShipment,
    onCalculateShipping
}) => {
    const { formatDate } = useDateFormat();
    const { formatPrice } = useCurrency();

    const getTurboStatusText = (status?: string) => {
        if (!status) return 'غير متاح';
        const statusMap: { [key: string]: string } = {
            '1': 'محفوظة قبل الشحن',
            '2': 'مرسلة للشحن',
            '3': 'قيد التنفيذ',
            '4': 'مع الكابتن',
            '5': 'مرتجعة مع الشركة',
            '6': 'مرتجعة',
            '7': 'تم التسليم',
            '8': 'تم التوريد',
            '9': 'محذوفة',
            '10': 'مرتجعة معاد إرسالها',
            '11': 'مرتجع مفقود',
            '12': 'مرتجع معدوم',
            '13': 'مؤجلة',
            'created': 'تم الإنشاء',
            'confirmed': 'مؤكدة',
            'pending': 'قيد الانتظار',
            'processing': 'قيد المعالجة',
            'shipped': 'تم الشحن',
            'picked_up': 'تم الاستلام',
            'in_transit': 'قيد النقل',
            'out_for_delivery': 'في الطريق للتسليم',
            'delivered': 'تم التسليم',
            'cancelled': 'ملغاة',
            'returned': 'مرتجعة',
            'saved': 'محفوظة قبل الشحن',
            'sent': 'مرسلة للشحن',
            'in_progress': 'قيد التنفيذ',
            'with_captain': 'مع الكابتن',
            'returned_to_company': 'مرتجعة مع الشركة',
            'completed': 'تم التوريد',
            'deleted': 'محذوفة',
            'returned_resent': 'مرتجعة معاد إرسالها',
            'returned_missing': 'مرتجع مفقود',
            'returned_destroyed': 'مرتجع معدوم',
            'postponed': 'مؤجلة'
        };
        return statusMap[status.toLowerCase()] || statusMap[status] || status;
    };

    const getTurboStatusColor = (status?: string) => {
        if (!status) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
        const statusLower = status.toLowerCase();

        if (statusLower === '7' || statusLower === '8' || statusLower === 'delivered' || statusLower === 'completed') {
            return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
        }

        if (statusLower === '9' || statusLower === 'cancelled' || statusLower === 'deleted') {
            return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
        }

        if (statusLower === '5' || statusLower === '6' || statusLower === '10' || statusLower === '11' || statusLower === '12' ||
            statusLower === 'returned' || statusLower === 'returned_to_company' || statusLower === 'returned_resent' ||
            statusLower === 'returned_missing' || statusLower === 'returned_destroyed') {
            return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400';
        }

        if (statusLower === '2' || statusLower === '3' || statusLower === '4' ||
            statusLower === 'sent' || statusLower === 'in_progress' || statusLower === 'with_captain' ||
            statusLower === 'in_transit' || statusLower === 'out_for_delivery' || statusLower === 'picked_up' ||
            statusLower === 'confirmed' || statusLower === 'processing' || statusLower === 'shipped') {
            return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
        }

        if (statusLower === '1' || statusLower === '13' || statusLower === 'created' || statusLower === 'saved' || statusLower === 'postponed') {
            return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
        }

        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    };

    if (!order) return null;

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <TruckIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 ml-2" />
                    شحن Turbo
                </h3>
            </div>

            {order.turboTrackingNumber ? (
                <div className="space-y-4">
                    {/* Tracking Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">رقم التتبع:</span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{order.turboTrackingNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حالة الشحنة:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTurboStatusColor(order.turboShipmentStatus)}`}>
                                    {getTurboStatusText(order.turboShipmentStatus)}
                                </span>
                            </div>
                            {turboTrackingData?.currentLocation && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الموقع الحالي:</span>
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{turboTrackingData.currentLocation}</span>
                                </div>
                            )}
                            {turboTrackingData?.estimatedDelivery && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">التسليم المتوقع:</span>
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{formatDate(turboTrackingData.estimatedDelivery)}</span>
                                </div>
                            )}
                            {turboTrackingData?.deliveredAt && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ التسليم:</span>
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">{formatDate(turboTrackingData.deliveredAt)}</span>
                                </div>
                            )}
                            {turboTrackingData?.branch && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفرع المتوقع:</span>
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{turboTrackingData.branch}</span>
                                </div>
                            )}
                            {order.updatedAt && (
                                <div className="flex justify-between items-center md:col-span-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">آخر تحديث:</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(order.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                        {order.turboLabelUrl && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                <a
                                    href={order.turboLabelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4 ml-1" />
                                    عرض ملصق الشحنة
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Shipping Cost Comparison */}
                    {(shippingComparison || order.shipping > 0) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">مقارنة أسعار الشحن:</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">السعر الفعلي من Turbo:</span>
                                    {shippingComparison?.actualCost ? (
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {formatPrice(shippingComparison.actualCost, order.currency)}
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">غير متوفر</span>
                                            <button
                                                onClick={onCalculateShipping}
                                                disabled={loadingComparison}
                                                className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-xs hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                                            >
                                                {loadingComparison ? 'جاري الحساب...' : 'حساب السعر'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">السعر المحدد للعميل:</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {formatPrice(order.shipping, order.currency)}
                                    </span>
                                </div>
                                {shippingComparison && (
                                    <div className={`flex justify-between items-center pt-2 border-t ${shippingComparison.difference > 0
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                        : shippingComparison.difference < 0
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                        }`}>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفرق:</span>
                                        <span className={`text-sm font-bold ${shippingComparison.difference > 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : shippingComparison.difference < 0
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {shippingComparison.difference > 0 ? '+' : ''}
                                            {formatPrice(shippingComparison.difference, order.currency)}
                                            {shippingComparison.difference > 0 && ' (خسارة)'}
                                            {shippingComparison.difference < 0 && ' (ربح)'}
                                            {shippingComparison.difference === 0 && ' (متساوي)'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onPrintWaybill}
                            disabled={turboLoading}
                            className="flex items-center px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 text-sm"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 ml-1" />
                            طباعة البوليصة
                        </button>
                        {order.turboShipmentStatus !== 'cancelled' && order.turboShipmentStatus !== 'delivered' && (
                            <button
                                onClick={onCancelShipment}
                                disabled={turboLoading}
                                className="flex items-center px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 text-sm"
                            >
                                <XMarkIcon className="w-4 h-4 ml-1" />
                                إلغاء الشحنة
                            </button>
                        )}
                        {order.turboTrackingNumber && (
                            <a
                                href={`https://portal.turbo-eg.com/track/${order.turboTrackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm"
                            >
                                <TruckIcon className="w-4 h-4 ml-1" />
                                تتبع على Turbo
                            </a>
                        )}
                    </div>

                    {/* Tracking History */}
                    {turboTrackingData?.history && turboTrackingData.history.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">سجل التتبع:</h4>
                            <div className="space-y-2">
                                {turboTrackingData.history.map((event: any, index: number) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2"></div>
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-gray-100">{event.status || event.description}</p>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{event.location || ''}</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-xs">{event.timestamp || event.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم إنشاء شحنة Turbo لهذا الطلب</p>
                    <button
                        onClick={onCreateShipment}
                        disabled={turboLoading || order.status !== 'CONFIRMED'}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {turboLoading ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" />
                                جاري الإنشاء...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-4 h-4 ml-1" />
                                إنشاء شحنة Turbo
                            </>
                        )}
                    </button>
                    {order.status !== 'CONFIRMED' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">يجب تأكيد الطلب أولاً</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TurboShippingPanel;
