import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    ShoppingBagIcon,
    PencilIcon,
    PrinterIcon
} from '@heroicons/react/24/outline';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { OrderDetailsType } from '../types';

interface OrderHeaderProps {
    order: OrderDetailsType;
    isEditing: boolean;
    updating: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onPrint: () => void;
    onPrintPolicy: () => void;
    onBack: () => void;
    currentStatusConfig?: { code: string; name: string; color?: string; icon?: string } | null;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
    order,
    isEditing,
    updating,
    onEdit,
    onCancel,
    onSave,
    onPrint,
    onPrintPolicy,
    onBack,
    currentStatusConfig
}) => {
    const { t } = useTranslation();
    const { formatDate, formatDateTime } = useDateFormat();

    return (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
                <button onClick={onBack} className="ml-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <ShoppingBagIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
                        {t('orderDetails.orderDetailsTitle', { orderNumber: order.orderNumber })}
                    </h1>
                    <div className="mt-2 flex items-center gap-3">
                        <p className="text-gray-600 dark:text-gray-400">{t('orderDetails.createdAt', { date: formatDateTime(order.createdAt) })}</p>
                        {currentStatusConfig && (
                            <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    backgroundColor: currentStatusConfig.color ? `${currentStatusConfig.color}20` : '#f3f4f6',
                                    color: currentStatusConfig.color || '#374151',
                                    border: `1px solid ${currentStatusConfig.color || '#d1d5db'}`
                                }}
                            >
                                {t('orderDetails.statusLabel', { status: currentStatusConfig.name })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                {!isEditing ? (
                    <>
                        <button onClick={onEdit} className="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-500 text-sm font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <PencilIcon className="h-4 w-4 ml-2" />
                            {t('orderDetails.editOrder')}
                        </button>
                        <button onClick={onPrint} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <PrinterIcon className="h-4 w-4 ml-2" />
                            {t('orderDetails.printInvoice')}
                        </button>
                        <button onClick={onPrintPolicy} className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 text-sm font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30">
                            <PrinterIcon className="h-4 w-4 ml-2" />
                            طباعة البوليصة
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={onSave} disabled={updating} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600">
                            {updating ? t('orderDetails.saving') : t('orderDetails.saveChanges')}
                        </button>
                        <button onClick={onCancel} disabled={updating} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                            {t('orderDetails.cancel')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderHeader;
